// controllers/etapasController.js

const db = require('../config/db')
const registrarEnBitacora = require('../helpers/bitacora')

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD)
 */
function formatearFecha(fecha) {
  try {
    return new Date(fecha).toISOString().split('T')[0]
  } catch {
    return fecha
  }
}

/**
 * Agrega una nueva etapa desde la vista general del sistema.
 */
exports.agregarEtapa = async (req, res) => {
  const id_proyecto = req.params.idProyecto
  const { nombre_etapa, id_usuario } = req.body

  if (!nombre_etapa || !id_proyecto || !id_usuario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  try {
    await db.query(
      `INSERT INTO etapa (nombre_etapa, estado_etapa, fecha_inicio, fecha_fin, id_proyecto)
       VALUES (?, 'pendiente', NULL, NULL, ?)`,
      [nombre_etapa, id_proyecto]
    )

    const [[proy]] = await db.query('SELECT nombre_proyecto FROM proyecto WHERE id_proyecto = ?', [id_proyecto])

    await registrarEnBitacora(
      id_usuario,
      `Agregó la etapa "${nombre_etapa}" al proyecto "${proy.nombre_proyecto}" (ID: ${id_proyecto})`,
      id_proyecto
    )

    res.status(201).json({ message: 'Etapa agregada correctamente' })
  } catch (err) {
    console.error('Error al agregar etapa:', err)
    res.status(500).send(err)
  }
}

/**
 * Agrega una etapa desde la vista de detalles del proyecto.
 */
exports.agregarEtapaDesdeDetalles = async (req, res) => {
  const { id_proyecto, nombre_etapa, estado_etapa, fecha_inicio, fecha_fin, id_usuario } = req.body

  if (!nombre_etapa || !id_proyecto || !id_usuario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  try {
    const [result] = await db.query(`
      INSERT INTO etapa (nombre_etapa, estado_etapa, fecha_inicio, fecha_fin, id_proyecto)
      VALUES (?, ?, ?, ?, ?)
    `, [
      nombre_etapa,
      estado_etapa || 'pendiente',
      fecha_inicio || null,
      fecha_fin || null,
      id_proyecto
    ])

    const id_etapa = result.insertId

    const [[proy]] = await db.query('SELECT nombre_proyecto FROM proyecto WHERE id_proyecto = ?', [id_proyecto])

    await registrarEnBitacora(
      id_usuario,
      `Agregó la etapa "${nombre_etapa}" al proyecto "${proy.nombre_proyecto}" (ID: ${id_proyecto})`,
      id_proyecto
    )

    res.status(201).json({ message: 'Etapa agregada correctamente', id_etapa })
  } catch (err) {
    console.error('Error al agregar etapa desde detalles:', err)
    res.status(500).send(err)
  }
}

/**
 * Devuelve una etapa completa incluyendo técnico asignado, a partir de su ID.
 */
exports.obtenerEtapaPorId = async (req, res) => {
  const idEtapa = req.params.id

  try {
    const [rows] = await db.query(`
      SELECT e.*, a.id_usuario AS tecnico
      FROM etapa e
      LEFT JOIN asignacion a ON e.id_etapa = a.id_etapa
      WHERE e.id_etapa = ?
    `, [idEtapa])

    if (!rows.length) {
      return res.status(404).json({ error: 'Etapa no encontrada' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('Error al obtener etapa por ID:', err)
    res.status(500).json({ error: 'Error al obtener etapa' })
  }
}

/**
 * Edita una etapa existente, comparando los campos modificados y registrando cambios.
 */
exports.editarEtapa = async (req, res) => {
  const id_etapa = req.params.idEtapa
  const {
    nombre_etapa,
    estado_etapa,
    fecha_inicio,
    fecha_fin,
    horas_estimadas,
    id_usuario
  } = req.body

  if (!id_usuario || !id_etapa) {
    return res.status(400).json({ error: 'Faltan identificadores requeridos' })
  }

  if (fecha_inicio && fecha_fin && new Date(fecha_inicio) > new Date(fecha_fin)) {
    return res.status(400).json({ error: 'La fecha de inicio no puede ser posterior a la de fin' })
  }

  try {
    const [[etapaActual]] = await db.query('SELECT * FROM etapa WHERE id_etapa = ?', [id_etapa])
    if (!etapaActual) return res.status(404).json({ error: 'Etapa no encontrada' })

    const campos = { nombre_etapa, estado_etapa, fecha_inicio, fecha_fin, horas_estimadas }
    const updates = []
    const values = []
    const cambios = []

    for (const campo in campos) {
      if (campos[campo] !== undefined && campos[campo] != etapaActual[campo]) {
        const valAnt = ['fecha_inicio', 'fecha_fin'].includes(campo) ? formatearFecha(etapaActual[campo]) : etapaActual[campo]
        const valNuevo = ['fecha_inicio', 'fecha_fin'].includes(campo) ? formatearFecha(campos[campo]) : campos[campo]

        updates.push(`${campo} = ?`)
        values.push(campos[campo])
        cambios.push(`${campo}: "${valAnt}" → "${valNuevo}"`)
      }
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No hay cambios para actualizar' })
    }

    const query = `UPDATE etapa SET ${updates.join(', ')} WHERE id_etapa = ?`
    values.push(id_etapa)
    await db.query(query, values)

    const [[info]] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto, p.id_proyecto
      FROM etapa e
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.id_etapa = ?
    `, [id_etapa])

    const descripcion = cambios.length
      ? `Editó la etapa "${info.nombre_etapa}" del proyecto "${info.nombre_proyecto}" (ID: ${info.id_proyecto}). Cambios: ${cambios.join('; ')}`
      : `Actualizó la etapa "${info.nombre_etapa}" sin cambios visibles.`

    await registrarEnBitacora(id_usuario, descripcion, info.id_proyecto)

    res.json({ message: 'Etapa actualizada correctamente' })
  } catch (err) {
    console.error('Error al editar etapa:', err)
    res.status(500).send({ error: 'Error al editar etapa' })
  }
}

/**
 * Elimina una etapa, incluyendo su asignación si existe.
 */
exports.eliminarEtapa = async (req, res) => {
  const id_etapa = req.params.idEtapa
  const { id_usuario } = req.body

  if (!id_etapa || !id_usuario) {
    return res.status(400).json({ error: 'Faltan identificadores para eliminar' })
  }

  try {
    await db.query('DELETE FROM asignacion WHERE id_etapa = ?', [id_etapa])

    const [[data]] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto, p.id_proyecto
      FROM etapa e
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.id_etapa = ?
    `, [id_etapa])

    await db.query('DELETE FROM etapa WHERE id_etapa = ?', [id_etapa])

    await registrarEnBitacora(
      id_usuario,
      `Eliminó la etapa "${data.nombre_etapa}" del proyecto "${data.nombre_proyecto}" (ID: ${data.id_proyecto})`,
      data.id_proyecto
    )

    res.json({ message: 'Etapa eliminada correctamente' })
  } catch (err) {
    console.error('Error al eliminar etapa:', err)
    res.status(500).send({ error: 'Error al eliminar etapa' })
  }
}

/**
 * Devuelve todas las etapas de un proyecto con sus horas estimadas y reales acumuladas.
 */
exports.obtenerEtapasConHoras = async (req, res) => {
  const idProyecto = req.params.id

  try {
    const [rows] = await db.query(`
      SELECT 
        e.id_etapa,
        e.nombre_etapa,
        e.fecha_inicio,
        e.fecha_fin,
        e.estado_etapa,
        e.horas_estimadas,
        ANY_VALUE(a.id_usuario) AS id_usuario,
        ANY_VALUE(u.nombre_usuario) AS tecnico,
        IFNULL(SUM(r.horas_trabajadas), 0) AS horas_reales
      FROM etapa e
      LEFT JOIN asignacion a ON e.id_etapa = a.id_etapa
      LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
      LEFT JOIN registrohoras r ON e.id_etapa = r.id_etapa
      WHERE e.id_proyecto = ?
      GROUP BY e.id_etapa
    `, [idProyecto])

    res.json(rows)
  } catch (err) {
    console.error('Error al obtener etapas con horas:', err)
    res.status(500).json({ error: 'Error al obtener etapas del proyecto' })
  }
}
