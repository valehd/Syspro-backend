// controllers/suggestionsController.js
const db = require('../config/db')

/**
 * Genera sugerencias inteligentes cruzando etapas cortas con técnicos disponibles.
 */
exports.generarSugerencias = async (req, res) => {
  try {
    // Paso 1: Obtener todos los técnicos
    const [tecnicos] = await db.query(`
      SELECT id_usuario, nombre_usuario FROM usuario WHERE rol = 'tecnico'
    `)

    // Paso 2: Armar disponibilidad para HOY con 0 horas usadas por defecto
    const hoy = new Date().toLocaleDateString('sv-SE')
    const disponibilidad = {}

    for (const tecnico of tecnicos) {
      const clave = `${tecnico.nombre_usuario}_${hoy}`
      disponibilidad[clave] = {
        tecnico: tecnico.nombre_usuario,
        id_usuario: tecnico.id_usuario,
        fecha: hoy,
        horas_usadas: 0
      }
    }

    // Paso 3: Sumar horas reales si el técnico tiene asignaciones activas hoy
    const [asignaciones] = await db.query(`
      SELECT u.id_usuario, u.nombre_usuario, e.fecha_inicio, e.fecha_fin, e.horas_estimadas
      FROM asignacion a
      JOIN usuario u ON a.id_usuario = u.id_usuario
      JOIN etapa e ON a.id_etapa = e.id_etapa
      WHERE e.estado_etapa != 'finalizado'
    `)

    for (const asign of asignaciones) {
      const start = new Date(asign.fecha_inicio)
      const end = new Date(asign.fecha_fin)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const fecha = d.toLocaleDateString('sv-SE')
        const clave = `${asign.nombre_usuario}_${fecha}`

        if (!disponibilidad[clave]) {
          disponibilidad[clave] = {
            tecnico: asign.nombre_usuario,
            id_usuario: asign.id_usuario,
            fecha,
            horas_usadas: 0
          }
        }

        disponibilidad[clave].horas_usadas += Number(asign.horas_estimadas || 0)
      }
    }

    // Paso 4: Obtener etapas cortas no asignadas
    const [etapasCortas] = await db.query(`
      SELECT e.id_etapa, e.id_proyecto, e.nombre_etapa, e.horas_estimadas, e.fecha_inicio, p.nombre_proyecto
      FROM etapa e
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE 
        e.horas_estimadas <= 4
        AND e.estado_etapa = 'pendiente'
        AND NOT EXISTS (
          SELECT 1 FROM asignacion a WHERE a.id_etapa = e.id_etapa
        )
    `)


  // Paso 5: Generar sugerencias
const sugerencias = []
const sugerenciasPrevias = new Set()

for (const [clave, bloque] of Object.entries(disponibilidad)) {
  const horas_libres = 8 - bloque.horas_usadas
  if (horas_libres >= 1) {
    for (const etapa of etapasCortas) {
      const etapaStart = new Date(etapa.fecha_inicio)
      const etapaEnd = new Date(etapa.fecha_fin)
      const diaDisponible = new Date(bloque.fecha)

      const caeEnDia = diaDisponible >= etapaStart && diaDisponible <= etapaEnd
      const cabeEnTiempo = etapa.horas_estimadas <= horas_libres
      const claveSugerencia = `${bloque.id_usuario}_${etapa.id_etapa}`

      if (caeEnDia && cabeEnTiempo && !sugerenciasPrevias.has(claveSugerencia)) {
        sugerencias.push({
          tecnico: bloque.tecnico,
          id_usuario: bloque.id_usuario,
          fecha: bloque.fecha,
          horas_libres,
          tarea_sugerida: {
            id_etapa: etapa.id_etapa,
            id_proyecto: etapa.id_proyecto,
            proyecto: etapa.nombre_proyecto,
            etapa: etapa.nombre_etapa,
            duracion: etapa.horas_estimadas
          }
        })
        sugerenciasPrevias.add(claveSugerencia)
      }
    }
  }
}

res.json({ sugerencias })


/**
 * Lista tareas cortas no asignadas (<= 3 horas, estado pendiente).
 */
exports.tareasCortasDisponibles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.id_etapa,
        e.id_proyecto, 
        e.nombre_etapa,
        e.horas_estimadas,
        e.estado_etapa,
        p.nombre_proyecto
      FROM etapa e
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.horas_estimadas <= 3 AND e.estado_etapa = 'pendiente'
    `)

    res.json(rows)
  } catch (err) {
    console.error('Error en tareasCortasDisponibles:', err)
    res.status(500).json({ error: 'Error al obtener tareas cortas' })
  }
}
