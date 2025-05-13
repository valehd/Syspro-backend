const db = require('../config/db')

/**
 * Obtiene un resumen general del estado de los proyectos y fases:
 * - Total de proyectos
 * - Proyectos entregados a tiempo
 * - Total de fases
 * - Fases completadas dentro del tiempo estimado
 * - Fases que excedieron las horas planificadas
 */
exports.obtenerResumen = async (req, res) => {
  try {
    const [[{ totalProjects }]] = await db.query('SELECT COUNT(*) AS totalProjects FROM proyecto')

    const [[{ projectsOnTime }]] = await db.query(`
  SELECT COUNT(*) AS projectsOnTime
  FROM proyecto p
  WHERE estado = 'Finalizado'
    AND fecha_entrega >= (
      SELECT COALESCE(MAX(e.fecha_fin), p.fecha_entrega)
      FROM etapa e
      WHERE e.id_proyecto = p.id_proyecto
    )
`)
    

    const [[{ totalPhases }]] = await db.query('SELECT COUNT(*) AS totalPhases FROM etapa')

    const [[{ phasesOnTime }]] = await db.query(`
      SELECT COUNT(*) AS phasesOnTime
      FROM etapa e
      LEFT JOIN (
        SELECT id_etapa, SUM(horas_trabajadas) AS horas_real
        FROM registrohoras
        GROUP BY id_etapa
      ) r ON e.id_etapa = r.id_etapa
      WHERE COALESCE(r.horas_real, 0) <= e.horas_estimadas
    `)

    const [[{ delayedPhases }]] = await db.query(`
      SELECT COUNT(*) AS delayedPhases
      FROM etapa e
      LEFT JOIN (
        SELECT id_etapa, SUM(horas_trabajadas) AS horas_real
        FROM registrohoras
        GROUP BY id_etapa
      ) r ON e.id_etapa = r.id_etapa
      WHERE COALESCE(r.horas_real, 0) > e.horas_estimadas
    `)

    res.json({
      totalProjects,
      projectsOnTime,
      totalPhases,
      phasesOnTime,
      delayedPhases
    })
  } catch (err) {
    console.error('Error en /statistics/summary:', err)
    res.status(500).json({ error: 'Error al calcular resumen de estadísticas' })
  }
}

/**
 * Compara horas estimadas vs. reales por etapa.
 * Admite filtros opcionales: técnico, proyecto, estado de etapa y tipo de proyecto.
 */
exports.obtenerComparacionHoras = async (req, res) => {
  const { tecnico, proyecto, estado, type } = req.query

  // Validaciones básicas
  if (tecnico && isNaN(Number(tecnico))) {
    return res.status(400).json({ error: 'El parámetro "tecnico" debe ser numérico' })
  }
  if (proyecto && isNaN(Number(proyecto))) {
    return res.status(400).json({ error: 'El parámetro "proyecto" debe ser numérico' })
  }

  const estadosValidos = ['pendiente', 'en_proceso', 'finalizado', 'cancelado', 'detenido', 'activo', 'atrasado']
  if (estado && !estadosValidos.includes(estado.toLowerCase())) {
    return res.status(400).json({ error: 'El parámetro "estado" no es válido' })
  }

  try {
    const condiciones = []
    const valores = []

    if (tecnico) {
      condiciones.push('a.id_usuario = ?')
      valores.push(tecnico)
    }
    if (proyecto) {
      condiciones.push('e.id_proyecto = ?')
      valores.push(proyecto)
    }
    if (estado) {
      condiciones.push('e.estado_etapa = ?')
      valores.push(estado)
    }
    if (type) {
      condiciones.push('p.tipo_proyecto = ?')
      valores.push(type)
    }

    const whereSQL = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''

    const [rows] = await db.query(`
      SELECT 
        e.id_etapa,
        e.id_proyecto,
        e.nombre_etapa AS nombre,
        e.horas_estimadas AS estimadas,
        IFNULL(SUM(r.horas_trabajadas), 0) AS reales,
        p.nombre_proyecto
      FROM etapa e
      LEFT JOIN registrohoras r ON e.id_etapa = r.id_etapa
      LEFT JOIN asignacion a ON e.id_etapa = a.id_etapa
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      ${whereSQL}
      GROUP BY e.id_etapa
    `, valores)

    res.json(rows)
  } catch (err) {
    console.error('Error en /statistics/hours-comparison:', err)
    res.status(500).json({ error: 'Error al obtener comparación de horas' })
  }
}

/**
 * Agrupa y devuelve los motivos de retraso extraídos desde los comentarios.
 * Admite filtros opcionales: técnico, proyecto y tipo de proyecto.
 */
exports.obtenerMotivosRetraso = async (req, res) => {
  const { tecnico, proyecto, type } = req.query

  // Validaciones básicas
  if (tecnico && isNaN(Number(tecnico))) {
    return res.status(400).json({ error: 'El parámetro "tecnico" debe ser numérico' })
  }
  if (proyecto && isNaN(Number(proyecto))) {
    return res.status(400).json({ error: 'El parámetro "proyecto" debe ser numérico' })
  }

  try {
    const condiciones = []
    const valores = []

    if (tecnico) {
      condiciones.push('e.id_etapa IN (SELECT id_etapa FROM asignacion WHERE id_usuario = ?)')
      valores.push(tecnico)
    }
    if (proyecto) {
      condiciones.push('e.id_proyecto = ?')
      valores.push(proyecto)
    }
    if (type) {
      condiciones.push('p.tipo_proyecto = ?')
      valores.push(type)
    }

    const whereSQL = condiciones.length ? 'AND ' + condiciones.join(' AND ') : ''

    const [rows] = await db.query(`
      SELECT c.contenido AS motivo, COUNT(*) AS cantidad
      FROM comentario c
      JOIN etapa e ON c.id_etapa = e.id_etapa
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE c.contenido IS NOT NULL AND c.contenido != ''
      ${whereSQL}
      GROUP BY c.contenido
    `, valores)

    res.json(rows)
  } catch (err) {
    console.error('Error en /statistics/delay-reasons:', err)
    res.status(500).json({ error: 'Error al obtener motivos de retraso' })
  }
}
