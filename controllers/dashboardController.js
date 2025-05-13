
// Controlador para generar alertas inteligentes utilizadas en el dashboard administrativo.

const db = require('../config/db')

/**
 * Genera alertas agrupadas por tipo: success, warnings y errors.
 * Estas alertas permiten al administrador identificar posibles riesgos o logros en tiempo real.
 */
exports.obtenerAlertas = async (req, res) => {
  try {
    const success = []
    const warnings = []
    const errors = []

    // ─────────────────────────────────────────────────────────────
    // 1. Proyectos finalizados a tiempo (Success)
    // ─────────────────────────────────────────────────────────────
    // Se consideran exitosos si la fecha de entrega del proyecto es mayor o igual a la fecha fin de la última etapa.
    const [proyectosExitosos] = await db.query(`
      SELECT p.nombre_proyecto
      FROM Proyecto p
      WHERE p.estado = 'Finalizado'
        AND p.fecha_entrega >= (
          SELECT MAX(e.fecha_fin)
          FROM Etapa e
          WHERE e.id_proyecto = p.id_proyecto
        )
    `)

    proyectosExitosos.forEach(p => {
      success.push(`Project "${p.nombre_proyecto}" was completed on time.`)
    })

    // ─────────────────────────────────────────────────────────────
    // 2. Etapas activas con más horas reales que estimadas (Warnings)
    // ─────────────────────────────────────────────────────────────
    const [etapasConAdvertencia] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto
      FROM Etapa e
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
      LEFT JOIN (
        SELECT id_etapa, SUM(horas_trabajadas) AS horas_real
        FROM registrohoras
        GROUP BY id_etapa
      ) r ON r.id_etapa = e.id_etapa
      WHERE e.estado_etapa = 'activo'
        AND r.horas_real > e.horas_estimadas
    `)

    etapasConAdvertencia.forEach(e => {
      warnings.push(`Phase "${e.nombre_etapa}" of project "${e.nombre_proyecto}" is exceeding estimated hours.`)
    })

    // ─────────────────────────────────────────────────────────────
    // 3. Etapas sin técnico asignado (Errors)
    // ─────────────────────────────────────────────────────────────
    const [etapasSinTecnico] = await db.query(`
      SELECT e.nombre_etapa, p.nombre_proyecto
      FROM Etapa e
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
      LEFT JOIN Asignacion a ON e.id_etapa = a.id_etapa
      WHERE (e.estado_etapa = 'pendiente' OR e.estado_etapa = 'activo')
        AND a.id_usuario IS NULL
    `)

    etapasSinTecnico.forEach(e => {
      errors.push(`Phase "${e.nombre_etapa}" of project "${e.nombre_proyecto}" has no assigned technician.`)
    })

    // ─────────────────────────────────────────────────────────────
    // Respuesta agrupada
    // ─────────────────────────────────────────────────────────────
    res.json({ success, warnings, errors })

  } catch (err) {
    console.error('Error al generar alertas del dashboard:', err)
    res.status(500).json({ error: 'Internal error while generating alerts' })
  }
}
