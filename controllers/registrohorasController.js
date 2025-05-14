// controllers/registrohorasController.js

const db = require('../config/db')
const registrarEnBitacora = require('../helpers/bitacora')

/**
 * Inicia un registro de horas para un técnico en una etapa.
 * Si el técnico aún no está asignado, se crea la asignación automáticamente.
 */
exports.iniciarRegistro = async (req, res) => {
  const { id_usuario, id_etapa, hora_inicio } = req.body
  const fechaActual = new Date().toISOString().split('T')[0]

  try {
    // Verifica si ya existe una asignación
    const [asignacion] = await db.query(
      'SELECT * FROM asignacion WHERE id_usuario = ? AND id_etapa = ?',
      [id_usuario, id_etapa]
    )

    // Validación estricta: solo puede registrar si ya está asignado
    if (asignacion.length === 0) {
    return res.status(403).json({ error: "Este usuario no está asignado a esta etapa." })
    }

      const [[info]] = await db.query(`
        SELECT e.nombre_etapa, p.nombre_proyecto, p.id_proyecto, u.nombre_usuario
        FROM etapa e
        JOIN proyecto p ON e.id_proyecto = p.id_proyecto
        JOIN usuario u ON u.id_usuario = ?
        WHERE e.id_etapa = ?`,
        [id_usuario, id_etapa]
      )

      const descripcion = `Asignación automática: "${info.nombre_usuario}" fue asignado a la etapa "${info.nombre_etapa}" del proyecto "${info.nombre_proyecto}" (ID: ${info.id_proyecto})`
      await registrarEnBitacora(id_usuario, descripcion)
    

    // Inserta el nuevo registro de horas
    await db.query(
      `INSERT INTO registrohoras (id_usuario, id_etapa, fecha, hora_inicio)
       VALUES (?, ?, ?, ?)`,
      [id_usuario, id_etapa, fechaActual, hora_inicio]
    )

    res.status(201).json({ message: 'Registro de horas iniciado correctamente' })
  } catch (err) {
    console.error('Error al iniciar registro:', err)
    res.status(500).json({ error: 'Error al iniciar registro de horas' })
  }
}

/**
 * Detiene el timer de una etapa activa, calculando las horas trabajadas.
 */
exports.detenerRegistro = async (req, res) => {
  const { id_usuario, id_etapa, hora_fin } = req.body

  try {
    const [registros] = await db.query(`
      SELECT * FROM registrohoras 
      WHERE id_usuario = ? AND id_etapa = ? AND hora_fin IS NULL 
      ORDER BY hora_inicio DESC LIMIT 1
    `, [id_usuario, id_etapa])

    if (!registros.length) {
      return res.status(404).json({ error: 'No hay registro activo para esta etapa' })
    }

    const registro = registros[0]
    const inicio = new Date(`1970-01-01T${registro.hora_inicio}Z`)
    const fin = new Date(`1970-01-01T${hora_fin}Z`)
    const horasTrabajadas = ((fin - inicio) / (1000 * 60 * 60)).toFixed(2)

    await db.query(`
      UPDATE registrohoras 
      SET hora_fin = ?, horas_trabajadas = ?
      WHERE id_registro = ?
    `, [hora_fin, horasTrabajadas, registro.id_registro])

    res.json({ message: `Timer detenido. ${horasTrabajadas} horas registradas.` })
  } catch (err) {
    console.error('Error al detener registro:', err)
    res.status(500).json({ error: 'Error al detener timer' })
  }
}

/**
 * Obtiene todas las tareas asignadas a un técnico con estado compuesto.
 */
exports.obtenerTareasPorTecnico = async (req, res) => {
  const tecnicoId = req.params.id

  const query = `
    SELECT 
      p.nombre_proyecto AS project_name,
      e.nombre_etapa AS task_stage,
      e.id_etapa,
      e.fecha_inicio AS start_date,
      e.fecha_fin AS due_date,
      e.tiempo_estimado AS estimated_hours,
      e.estado_etapa AS base_status,
      IFNULL(SUM(r.horas_trabajadas), 0) AS actual_hours,
      CASE 
        WHEN e.estado_etapa = 'finalizado' AND SUM(r.horas_trabajadas) <= e.tiempo_estimado THEN 'Finalizado - a Tiempo'
        WHEN e.estado_etapa = 'finalizado' THEN 'Finalizado - Atrasado'
        WHEN e.estado_etapa = 'detenido' AND SUM(r.horas_trabajadas) <= e.tiempo_estimado THEN 'Detenido - a Tiempo'
        WHEN e.estado_etapa = 'detenido' THEN 'Detenido - Atrasado'
        WHEN e.estado_etapa = 'activo' AND SUM(r.horas_trabajadas) <= e.tiempo_estimado THEN 'a tiempo - en Progreso'
        WHEN e.estado_etapa = 'activo' THEN 'Atrasado - en Progreso'
        WHEN e.estado_etapa = 'cancelado' THEN 'Cancelado'
        ELSE e.estado_etapa
      END AS status,
      MAX(c.contenido) AS comment
    FROM asignacion a
    JOIN etapa e ON a.id_etapa = e.id_etapa
    JOIN proyecto p ON e.id_proyecto = p.id_proyecto
    LEFT JOIN registrohoras r ON e.id_etapa = r.id_etapa
    LEFT JOIN comentario c ON c.id_etapa = e.id_etapa
    WHERE a.id_usuario = ?
    GROUP BY e.id_etapa
  `

  try {
    const [results] = await db.query(query, [tecnicoId])
    res.json(results)
  } catch (err) {
    console.error('Error al obtener tareas asignadas:', err)
    res.status(500).json({ error: 'Error al obtener tareas del técnico' })
  }
}

/**
 * Obtiene el total de horas trabajadas por un usuario en una etapa.
 */
exports.obtenerHorasPorEtapaYUsuario = async (req, res) => {
  const { idEtapa, idUsuario } = req.params

  try {
    const [result] = await db.query(`
      SELECT SUM(horas_trabajadas) AS total_horas
      FROM registrohoras
      WHERE id_etapa = ? AND id_usuario = ?
    `, [idEtapa, idUsuario])

    res.json(result[0])
  } catch (err) {
    console.error('Error al obtener horas:', err)
    res.status(500).json({ error: 'Error al obtener horas por etapa y usuario' })
  }
}

/**
 * Verifica si existe un registro activo para un usuario en una etapa específica.
 */
exports.verificarTimerActivo = async (req, res) => {
  const { idUsuario, idEtapa } = req.params

  try {
    const [result] = await db.query(`
      SELECT hora_inicio FROM registrohoras
      WHERE id_usuario = ? AND id_etapa = ? AND hora_fin IS NULL
      ORDER BY hora_inicio DESC LIMIT 1
    `, [idUsuario, idEtapa])

    if (result.length > 0) {
      res.json({ running: true, startedAt: result[0].hora_inicio })
    } else {
      res.json({ running: false })
    }
  } catch (err) {
    console.error('Error al verificar timer activo:', err)
    res.status(500).json({ error: 'Error al verificar timer' })
  }
}

/**
 * Obtiene el historial completo de registros de un técnico.
 */
exports.obtenerHistorialPorUsuario = async (req, res) => {
  const { idUsuario } = req.params

  try {
    const [result] = await db.query(`
      SELECT r.fecha, r.hora_inicio, r.hora_fin, r.horas_trabajadas,
             e.nombre_etapa, p.nombre_proyecto,
             c.contenido AS comentario
      FROM registrohoras r
      JOIN etapa e ON r.id_etapa = e.id_etapa
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      LEFT JOIN comentario c ON c.id_etapa = e.id_etapa AND c.id_usuario = r.id_usuario
      WHERE r.id_usuario = ?
      ORDER BY r.fecha DESC, r.hora_inicio DESC
    `, [idUsuario])

    res.json(result)
  } catch (err) {
    console.error('Error al obtener historial:', err)
    res.status(500).json({ error: 'Error al obtener historial de horas' })
  }
}
