const db = require('../config/db')
const registrarEnBitacora = require('../helpers/bitacora')

/**
 * Crea un nuevo proyecto con sus respectivas etapas y asignaciones.
 */
exports.crearProyecto = async (req, res) => {
  const {
    name,
    client,
    startDate,
    estimatedEndDate,
    projectType,
    stages,
    id_usuario
  } = req.body

  const allowedTypes = ['largo', 'corto', 'flexible']

  // Validación básica de campos obligatorios
  if (!name || !client || !startDate || !estimatedEndDate || !projectType || !Array.isArray(stages) || stages.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del proyecto o etapas' })
  }

  if (!allowedTypes.includes(projectType)) {
    return res.status(400).json({ error: 'Tipo de proyecto inválido: debe ser "largo", "corto" o "flexible"' })
  }

  if (new Date(startDate) > new Date(estimatedEndDate)) {
    return res.status(400).json({ error: 'La fecha de inicio no puede ser posterior a la de término' })
  }

  // Validación de cada etapa
  for (let i = 0; i < stages.length; i++) {
    const { name: stageName, hours, dueDate, technician } = stages[i]
    if (!stageName || !hours || !dueDate) {
      return res.status(400).json({ error: `Faltan datos en la etapa ${i + 1}` })
    }
    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ error: `Horas inválidas en la etapa ${i + 1}` })
    }
    if (technician && isNaN(technician)) {
      return res.status(400).json({ error: `ID de técnico inválido en la etapa ${i + 1}` })
    }
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Inserta el proyecto
    const [result] = await connection.query(`
      INSERT INTO proyecto (nombre_proyecto, cliente, fecha_inicio, fecha_entrega, estado, tipo_proyecto)
      VALUES (?, ?, ?, ?, 'activo', ?)
    `, [name, client, startDate, estimatedEndDate, projectType])

    const projectId = result.insertId

    // Bitácora de creación
    await connection.query(`
      INSERT INTO bitacora (id_usuario, accion, id_proyecto, fecha_hora)
      VALUES (?, ?, ?, NOW())
    `, [id_usuario, `Creó el proyecto "${name}" (ID: ${projectId})`, projectId])

    // Inserta las etapas
    for (const stage of stages) {
      const [etapaRes] = await connection.query(`
        INSERT INTO etapa (nombre_etapa, estado_etapa, fecha_inicio, fecha_fin, horas_estimadas, id_proyecto)
        VALUES (?, 'pendiente', ?, ?, ?, ?)
      `, [stage.name, stage.startDate || startDate, stage.dueDate, stage.hours, projectId])

      const etapaId = etapaRes.insertId

      // Asignación opcional
      if (stage.technician) {
        await connection.query(`
          INSERT INTO Asignacion (id_etapa, id_usuario)
          VALUES (?, ?)
        `, [etapaId, stage.technician])
      }
    }

    await connection.commit()
    res.status(201).json({ message: 'Proyecto creado con éxito', id_proyecto: projectId })

  } catch (err) {
    await connection.rollback()
    console.error('Error al crear proyecto:', err)
    res.status(500).json({ error: 'Error al crear el proyecto' })
  } finally {
    connection.release()
  }
}

/**
 * Retorna todos los proyectos.
 */
exports.obtenerTodosLosProyectos = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM Proyecto')
    res.json(results)
  } catch (err) {
    console.error('Error al obtener proyectos:', err)
    res.status(500).send(err)
  }
}

/**
 * Retorna las etapas de un proyecto por su ID.
 */
exports.obtenerEtapasPorProyecto = async (req, res) => {
  const idProyecto = req.params.id

  const query = `
    SELECT 
      e.id_etapa,
      e.nombre_etapa,
      e.estado_etapa,
      e.fecha_inicio,
      e.fecha_fin,
      e.horas_estimadas AS tiempo_estimado,
      NULL AS tiempo_real,
      a.id_usuario,
      u.nombre_usuario AS tecnico
    FROM etapa e
    LEFT JOIN asignacion a ON e.id_etapa = a.id_etapa
    LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
    WHERE e.id_proyecto = ?
  `

  try {
    const [results] = await db.query(query, [idProyecto])
    res.json(results)
  } catch (err) {
    console.error('Error al obtener etapas del proyecto:', err)
    res.status(500).send(err)
  }
}

/**
 * Edita un proyecto existente.
 */
exports.editarProyecto = async (req, res) => {
  const id = req.params.id
  const { id_usuario, ...fields } = req.body

  const fieldMap = {
    name: 'nombre_proyecto',
    client: 'cliente',
    start: 'fecha_inicio',
    end: 'fecha_entrega',
    status: 'estado'
  }

  function formatFecha(fecha) {
    try {
      return new Date(fecha).toISOString().slice(0, 10)
    } catch {
      return fecha
    }
  }

  try {
    const [rows] = await db.query('SELECT * FROM proyecto WHERE id_proyecto = ?', [id])
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado' })

    const original = rows[0]
    const updates = []
    const values = []
    const cambios = []

    for (const key in fields) {
      if (fieldMap[key]) {
        const dbField = fieldMap[key]
        const nuevo = fields[key]?.toString().trim()
        const anterior = original[dbField]
        const esFecha = ['fecha_inicio', 'fecha_entrega'].includes(dbField)
        const nuevoFmt = esFecha ? formatFecha(nuevo) : nuevo
        const anteriorFmt = esFecha ? formatFecha(anterior) : anterior?.toString().trim()

        if (nuevoFmt !== anteriorFmt) {
          updates.push(`${dbField} = ?`)
          values.push(nuevo)
          cambios.push(`${dbField} de "${anteriorFmt}" a "${nuevoFmt}"`)
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay cambios para aplicar' })
    }

    const query = `UPDATE proyecto SET ${updates.join(', ')} WHERE id_proyecto = ?`
    values.push(id)
    await db.query(query, values)

    const detalle = cambios.length ? `Cambios: ${cambios.join(', ')}` : 'Cambios aplicados'
    await db.query(`
      INSERT INTO bitacora (id_usuario, id_proyecto, accion, fecha_hora)
      VALUES (?, ?, ?, NOW())
    `, [id_usuario, id, `Editó el proyecto "${original.nombre_proyecto}" (ID: ${id}) — ${detalle}`])

    res.json({ message: 'Proyecto actualizado correctamente' })
  } catch (err) {
    console.error('Error al editar proyecto:', err)
    res.status(500).json({ error: 'Error al actualizar el proyecto' })
  }
}

/**
 * Elimina un proyecto junto con sus datos asociados.
 */
exports.eliminarProyecto = async (req, res) => {
  const id = req.params.id
  const id_usuario = req.query.id_usuario

  try {
    const [rows] = await db.query('SELECT nombre_proyecto FROM proyecto WHERE id_proyecto = ?', [id])
    const nombre = rows[0]?.nombre_proyecto || 'Proyecto desconocido'

    const queries = [
      ['DELETE FROM comentario WHERE id_etapa IN (SELECT id_etapa FROM etapa WHERE id_proyecto = ?)', [id]],
      ['DELETE FROM registroHoras WHERE id_etapa IN (SELECT id_etapa FROM etapa WHERE id_proyecto = ?)', [id]],
      ['DELETE FROM asignacion WHERE id_etapa IN (SELECT id_etapa FROM etapa WHERE id_proyecto = ?)', [id]],
      ['DELETE FROM sugerencia WHERE id_etapa IN (SELECT id_etapa FROM etapa WHERE id_proyecto = ?)', [id]],
      ['DELETE FROM etapa WHERE id_proyecto = ?', [id]],
      ['DELETE FROM proyecto WHERE id_proyecto = ?', [id]]
    ]

    for (const [query, params] of queries) {
      await db.query(query, params)
    }

    await db.query(`
      INSERT INTO bitacora (id_usuario, id_proyecto, accion, fecha_hora)
      VALUES (?, ?, ?, NOW())
    `, [id_usuario, id, `Eliminó el proyecto "${nombre}" (ID: ${id})`])

    res.json({ message: 'Proyecto eliminado correctamente' })
  } catch (err) {
    console.error('Error al eliminar proyecto:', err)
    res.status(500).send('Error al eliminar datos relacionados')
  }
}

/**
 * Obtiene un proyecto por su ID.
 */
exports.obtenerProyectoPorId = async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await db.query('SELECT * FROM proyecto WHERE id_proyecto = ?', [id])
    if (!rows.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('Error al obtener proyecto por ID:', err)
    res.status(500).send(err)
  }
}

/**
 * Obtiene el historial de actividades y comentarios de un proyecto.
 */
exports.obtenerLogProyecto = async (req, res) => {
  const idProyecto = req.params.id

  try {
    const [bitacora] = await db.query(`
      SELECT b.accion AS contenido, b.fecha_hora AS fecha,
             u.nombre_usuario AS autor, NULL AS etapa
      FROM bitacora b
      JOIN usuario u ON b.id_usuario = u.id_usuario
      WHERE b.id_proyecto = ?
    `, [idProyecto])

    const [comentarios] = await db.query(`
      SELECT c.contenido, c.fecha, u.nombre_usuario AS autor, c.id_etapa AS etapa
      FROM comentario c
      LEFT JOIN etapa e ON c.id_etapa = e.id_etapa
      LEFT JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      JOIN Usuario u ON c.id_usuario = u.id_usuario
      WHERE (p.id_proyecto = ? OR c.id_etapa IS NULL)
    `, [idProyecto])

    const log = [...bitacora, ...comentarios].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    res.json(log)
  } catch (err) {
    console.error('Error al obtener log del proyecto:', err)
    res.status(500).json({ error: 'Error al obtener log del proyecto' })
  }
}
