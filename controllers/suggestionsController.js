// controllers/suggestionsController.js
const db = require('../config/db')

/**
 * Genera sugerencias inteligentes cruzando etapas cortas con técnicos disponibles.
 */
exports.generarSugerencias = async (req, res) => {
  try {
    const [asignaciones] = await db.query(`
      SELECT u.id_usuario, u.nombre_usuario, e.fecha_inicio, e.fecha_fin, e.horas_estimadas
      FROM asignacion a
      JOIN Usuario u ON a.id_usuario = u.id_usuario
      JOIN Etapa e ON a.id_etapa = e.id_etapa
    `)

    const disponibilidad = {}
    for (const asign of asignaciones) {
      const start = new Date(asign.fecha_inicio)
      const end = new Date(asign.fecha_fin)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const fecha = d.toISOString().slice(0, 10)
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

    const [etapasCortas] = await db.query(`
      SELECT e.id_etapa, e.id_proyecto, e.nombre_etapa, e.horas_estimadas, e.fecha_inicio, p.nombre_proyecto
      FROM etapa e
      JOIN proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE e.horas_estimadas <= 4 AND e.estado_etapa = 'pendiente'
    `)

    const sugerencias = []
    for (const [clave, bloque] of Object.entries(disponibilidad)) {
      const horas_libres = 8 - bloque.horas_usadas
      if (horas_libres >= 1) {
        for (const etapa of etapasCortas) {
          if (new Date(etapa.fecha_inicio).toISOString().slice(0, 10) === bloque.fecha && etapa.horas_estimadas <= horas_libres) {
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
            break
          }
        }
      }
    }

    res.json({ sugerencias })
  } catch (err) {
    console.error('Error en generarSugerencias:', err)
    res.status(500).json({ error: 'Error al generar sugerencias inteligentes' })
  }
}

/**
 * Lista tareas cortas no asignadas (<= 3 horas, estado pendiente).
 */
exports.tareasCortasDisponibles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.id_etapa,
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
