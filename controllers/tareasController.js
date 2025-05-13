const db = require('../config/db')

/**
 * Crea una nueva tarea luego de validar los campos requeridos.
 */
exports.crearTarea = async (req, res) => {
  const { nombre_tarea, id_etapa, fecha_inicio, fecha_fin, horas_estimadas, estado } = req.body

  if (!nombre_tarea || !id_etapa || !fecha_inicio || !fecha_fin || horas_estimadas == null || !estado) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }

  if (typeof nombre_tarea !== 'string' || typeof estado !== 'string' ||
      typeof id_etapa !== 'number' || typeof horas_estimadas !== 'number') {
    return res.status(400).json({ error: 'Datos inválidos: revise tipos de valores' })
  }

  if (nombre_tarea.length > 100) {
    return res.status(400).json({ error: 'El nombre de la tarea supera los 100 caracteres' })
  }

  if (isNaN(Date.parse(fecha_inicio)) || isNaN(Date.parse(fecha_fin))) {
    return res.status(400).json({ error: 'Fechas inválidas' })
  }

  try {
    await db.query(`
      INSERT INTO tarea (nombre_tarea, id_etapa, fecha_inicio, fecha_fin, horas_estimadas, estado)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nombre_tarea, id_etapa, fecha_inicio, fecha_fin, horas_estimadas, estado])

    res.status(201).json({ message: 'Tarea creada correctamente' })
  } catch (err) {
    console.error('Error al crear tarea:', err)
    res.status(500).json({ error: 'Error interno al crear tarea' })
  }
}

/**
 * Obtiene todas las tareas asociadas a un proyecto según su ID.
 */
exports.obtenerTareas = async (req, res) => {
  const { id_proyecto } = req.query

  if (!id_proyecto || isNaN(Number(id_proyecto))) {
    return res.status(400).json({ error: 'ID de proyecto inválido' })
  }

  try {
    const [tasks] = await db.query('SELECT * FROM tarea WHERE id_proyecto = ?', [id_proyecto])
    res.json(tasks)
  } catch (err) {
    console.error('Error al obtener tareas:', err)
    res.status(500).json({ error: 'Error al obtener tareas' })
  }
}

/**
 * Obtiene una tarea específica por su ID.
 */
exports.obtenerTareaPorId = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID de tarea inválido' })
  }

  try {
    const [task] = await db.query('SELECT * FROM tarea WHERE id_tarea = ?', [id])
    res.json(task)
  } catch (err) {
    console.error('Error al obtener tarea:', err)
    res.status(500).json({ error: 'Error al obtener tarea' })
  }
}

/**
 * Actualiza los datos de una tarea existente.
 */
exports.editarTarea = async (req, res) => {
  const { id } = req.params
  const { nombre_tarea, fecha_inicio, fecha_fin, horas_estimadas, estado } = req.body

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID de tarea inválido' })
  }

  if (!nombre_tarea || !fecha_inicio || !fecha_fin || horas_estimadas == null || !estado) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }

  if (typeof nombre_tarea !== 'string' || typeof estado !== 'string' || typeof horas_estimadas !== 'number') {
    return res.status(400).json({ error: 'Datos inválidos: revise tipos de valores' })
  }

  if (nombre_tarea.length > 100) {
    return res.status(400).json({ error: 'El nombre de la tarea supera los 100 caracteres' })
  }

  if (isNaN(Date.parse(fecha_inicio)) || isNaN(Date.parse(fecha_fin))) {
    return res.status(400).json({ error: 'Fechas inválidas' })
  }

  try {
    await db.query(`
      UPDATE tarea 
      SET nombre_tarea = ?, fecha_inicio = ?, fecha_fin = ?, horas_estimadas = ?, estado = ?
      WHERE id_tarea = ?
    `, [nombre_tarea, fecha_inicio, fecha_fin, horas_estimadas, estado, id])

    res.status(200).json({ message: 'Tarea actualizada correctamente' })
  } catch (err) {
    console.error('Error al editar tarea:', err)
    res.status(500).json({ error: 'Error al editar tarea' })
  }
}

/**
 * Lista las tareas asignadas a un técnico específico.
 */
exports.obtenerTareasPorTecnico = async (req, res) => {
  const tecnicoId = req.params.id

  if (!tecnicoId || isNaN(Number(tecnicoId))) {
    return res.status(400).json({ error: 'ID de técnico inválido' })
  }

  try {
    const [results] = await db.query(`
      SELECT 
        e.id_etapa,
        p.nombre_proyecto AS project_name,
        e.nombre_etapa AS task_stage,
        e.fecha_inicio AS start_date,
        e.fecha_fin AS due_date,
        e.horas_estimadas AS estimated_hours,
        e.estado_etapa AS status,
        CASE WHEN e.estado_etapa = 'finalizado' THEN 'Yes' ELSE 'No' END AS Finalizado,
        MAX(c.contenido) AS comment
      FROM asignacion a
      JOIN etapa e ON a.id_etapa = e.id_etapa
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      LEFT JOIN comentario c ON c.id_etapa = e.id_etapa
      WHERE a.id_usuario = ?
      GROUP BY e.id_etapa
    `, [tecnicoId])

    res.json(results)
  } catch (err) {
    console.error('Error al obtener tareas del técnico:', err)
    res.status(500).json({ error: 'Error al obtener tareas' })
  }
}

/**
 * Elimina una tarea por su ID.
 */
exports.eliminarTarea = async (req, res) => {
  const { id } = req.params

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID de tarea inválido' })
  }

  try {
    await db.query('DELETE FROM Tarea WHERE id_tarea = ?', [id])
    res.status(200).json({ message: 'Tarea eliminada correctamente' })
  } catch (err) {
    console.error('Error al eliminar tarea:', err)
    res.status(500).json({ error: 'Error al eliminar tarea' })
  }
}
