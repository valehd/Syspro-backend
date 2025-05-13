// controllers/asignacionController.js

const db = require('../config/db')
const registrarEnBitacora = require('../helpers/bitacora')

/**
 * Asigna un técnico a una etapa.
 * Si ya existe una asignación, se actualiza.
 */
exports.asignarEtapa = async (req, res) => {
  const { id_usuario, id_etapa, autor } = req.body

  if (!id_usuario || !id_etapa || !autor) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la asignación' })
  }

  try {
    // Obtener nombre del técnico
    const [[tecnico]] = await db.query('SELECT nombre_usuario FROM Usuario WHERE id_usuario = ?', [id_usuario])
    const nombreTecnico = tecnico?.nombre_usuario || `ID ${id_usuario}`

    // Obtener información de etapa y proyecto
    const [[info]] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto, p.id_proyecto
      FROM Etapa e
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.id_etapa = ?
    `, [id_etapa])

    const descripcion = `Asignó a "${nombreTecnico}" la etapa "${info.nombre_etapa}" del proyecto "${info.nombre_proyecto}" (ID: ${info.id_proyecto})`

    // Revisar si ya existe asignación
    const [existente] = await db.query('SELECT * FROM Asignacion WHERE id_etapa = ?', [id_etapa])

    if (existente.length > 0) {
      await db.query('UPDATE Asignacion SET id_usuario = ? WHERE id_etapa = ?', [id_usuario, id_etapa])
      await registrarEnBitacora(autor, `Actualizó asignación: ${descripcion}`)
      return res.status(200).json({ message: 'Técnico reasignado correctamente' })
    }

    // Crear nueva asignación
    await db.query('INSERT INTO Asignacion (id_usuario, id_etapa) VALUES (?, ?)', [id_usuario, id_etapa])
    await registrarEnBitacora(autor, `Nueva asignación: ${descripcion}`)

    res.status(201).json({ message: 'Técnico asignado correctamente' })
  } catch (err) {
    console.error('Error al asignar etapa:', err)
    res.status(500).json({ error: 'Error interno al asignar etapa' })
  }
}

/**
 * Actualiza la asignación de un técnico para una asignación existente.
 */
exports.actualizarAsignacion = async (req, res) => {
  const id_asignacion = req.params.id
  const { id_usuario, autor } = req.body

  if (!id_usuario || !autor) {
    return res.status(400).json({ error: 'Faltan datos para actualizar asignación' })
  }

  try {
    const [[asig]] = await db.query('SELECT id_etapa FROM Asignacion WHERE id_asignacion = ?', [id_asignacion])
    if (!asig) return res.status(404).json({ error: 'Asignación no encontrada' })

    const id_etapa = asig.id_etapa

    const [[etapaInfo]] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto, p.id_proyecto
      FROM Etapa e
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.id_etapa = ?
    `, [id_etapa])

    const [[usuario]] = await db.query('SELECT nombre_usuario FROM Usuario WHERE id_usuario = ?', [id_usuario])
    const nombreTecnico = usuario?.nombre_usuario || `ID ${id_usuario}`

    await db.query('UPDATE Asignacion SET id_usuario = ? WHERE id_asignacion = ?', [id_usuario, id_asignacion])

    const descripcion = `Actualizó la asignación: "${nombreTecnico}" ahora está asignado a la etapa "${etapaInfo.nombre_etapa}" del proyecto "${etapaInfo.nombre_proyecto}" (ID: ${etapaInfo.id_proyecto})`
    await registrarEnBitacora(autor, descripcion)

    res.json({ message: 'Asignación actualizada correctamente' })
  } catch (err) {
    console.error('Error al actualizar asignación:', err)
    res.status(500).json({ error: 'Error interno al actualizar asignación' })
  }
}

/**
 * Obtiene todas las asignaciones con información de etapa, técnico y proyecto.
 */
exports.obtenerAsignaciones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id_asignacion,
        a.id_usuario,
        u.nombre_usuario,
        a.id_etapa,
        e.nombre_etapa,
        p.nombre_proyecto
      FROM Asignacion a
      JOIN Usuario u ON a.id_usuario = u.id_usuario
      JOIN Etapa e ON a.id_etapa = e.id_etapa
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
    `)

    res.status(200).json(rows)
  } catch (err) {
    console.error('Error al obtener asignaciones:', err)
    res.status(500).json({ error: 'Error interno al obtener asignaciones' })
  }
}

/**
 * Obtiene la asignación de una etapa específica.
 */
exports.obtenerAsignacionPorEtapa = async (req, res) => {
  const id_etapa = req.params.id
  if (!id_etapa) {
    return res.status(400).json({ error: 'ID de etapa requerido' })
  }

  try {
    const [rows] = await db.query(`
      SELECT a.id_asignacion, a.id_usuario, u.nombre_usuario
      FROM Asignacion a
      JOIN Usuario u ON a.id_usuario = u.id_usuario
      WHERE a.id_etapa = ?
    `, [id_etapa])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró asignación para esta etapa' })
    }

    res.status(200).json(rows[0])
  } catch (err) {
    console.error('Error al obtener asignación por etapa:', err)
    res.status(500).json({ error: 'Error interno al obtener asignación' })
  }
}
