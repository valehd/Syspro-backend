// controllers/scheduleController.js
const db = require('../config/db')

const palette = [
  '#2c7be5', '#47c363', '#f5b041', '#e74c3c', '#8e44ad',
  '#1abc9c', '#ff7f0e', '#3498db', '#27ae60', '#d35400'
]

// Vista diaria
exports.getDaySchedule = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'Fecha inválida' })

  try {
    const [rows] = await db.query(`
      SELECT u.nombre_usuario, p.nombre_proyecto, e.nombre_etapa, e.fecha_inicio, e.fecha_fin
      FROM Asignacion a
      JOIN Usuario u ON a.id_usuario = u.id_usuario
      JOIN Etapa e ON a.id_etapa = e.id_etapa
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
      WHERE ? BETWEEN e.fecha_inicio AND e.fecha_fin
    `, [date])

    const tecnicos = [...new Set(rows.map(r => r.nombre_usuario))]
    const proyectosUnicos = [...new Set(rows.map(r => r.nombre_proyecto))]
    const colorMap = Object.fromEntries(proyectosUnicos.map((p, i) => [p, palette[i % palette.length]]))

    const horario = []
    for (let h = 8; h <= 18; h++) {
      const hora = `${h.toString().padStart(2, '0')}:00`
      const fila = { time: hora, blocks: [] }
      for (const tecnico of tecnicos) {
        if (hora === '13:00') {
          fila.blocks.push({ class: 'lunch-block', tecnico, proyecto: 'Lunch', comentario: '' })
        } else {
          const asignaciones = rows.filter(r => r.nombre_usuario === tecnico)
          const asig = asignaciones[0]
          fila.blocks.push(asig ? {
            class: 'custom-block',
            tecnico: asig.nombre_usuario,
            proyecto: asig.nombre_proyecto,
            etapa: asig.nombre_etapa,
            comentario: '',
            color: colorMap[asig.nombre_proyecto]
          } : {
            class: 'gray-block', tecnico, proyecto: 'Disponible', comentario: ''
          })
        }
      }
      horario.push(fila)
    }

    const leyenda = proyectosUnicos.map(p => ({ name: p, color: colorMap[p] }))
    res.json({ tecnicos, horario, leyenda })
  } catch (err) {
    console.error('Error en /schedule/day:', err)
    res.status(500).json({ error: 'Error interno al obtener el horario diario' })
  }
}

// Vista semanal
exports.getWeekSchedule = async (req, res) => {
  const baseDate = req.query.base ? new Date(req.query.base) : new Date()
  if (isNaN(baseDate.getTime())) return res.status(400).json({ error: 'Fecha base inválida' })

  const dayOfWeek = baseDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + mondayOffset)
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  try {
    const [rows] = await db.query(`
      SELECT u.nombre_usuario, p.nombre_proyecto, e.fecha_inicio, e.fecha_fin
      FROM Asignacion a
      JOIN Usuario u ON a.id_usuario = u.id_usuario
      JOIN Etapa e ON a.id_etapa = e.id_etapa
      JOIN Proyecto p ON e.id_proyecto = p.id_proyecto
    `)

    const tecnicos = [...new Set(rows.map(r => r.nombre_usuario))]
    const resumen = {}

    for (const tecnico of tecnicos) {
      resumen[tecnico] = {}
      for (const day of days) {
        const proyectosDia = rows
          .filter(r => r.nombre_usuario === tecnico && new Date(r.fecha_inicio) <= new Date(day) && new Date(r.fecha_fin) >= new Date(day))
          .map(r => r.nombre_proyecto)
        resumen[tecnico][day] = [...new Set(proyectosDia)]
      }
    }

    const proyectosUnicos = [...new Set(rows.map(r => r.nombre_proyecto))]
    const colorMap = Object.fromEntries(proyectosUnicos.map((p, i) => [p, palette[i % palette.length]]))
    const leyenda = proyectosUnicos.map(p => ({ name: p, color: colorMap[p] }))

    res.json({ semana: days, tecnicos, resumen, leyenda })
  } catch (err) {
    console.error('Error en /schedule/week:', err)
    res.status(500).json({ error: 'Error interno al obtener el resumen semanal' })
  }
}

// Vista mensual
exports.getMonthSchedule = async (req, res) => {
  const baseDate = req.query.base ? new Date(req.query.base) : new Date()
  if (isNaN(baseDate.getTime())) return res.status(400).json({ error: 'Fecha base inválida' })

  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const semanas = []
  let start = new Date(year, month, 1)
  start.setDate(start.getDate() - start.getDay() + 1)

  for (let i = 0; i < 6; i++) {
    const semanaInicio = new Date(start)
    semanaInicio.setDate(start.getDate() + i * 7)
    if (semanaInicio.getMonth() > month) break
    semanas.push(semanaInicio.toISOString().slice(0, 10))
  }

  try {
    const [proyectos] = await db.query(`SELECT id_proyecto, nombre_proyecto, estado FROM Proyecto`)
    const [etapas] = await db.query(`SELECT id_proyecto, fecha_inicio, fecha_fin FROM Etapa`)

    const proyectosResumen = proyectos.map(p => {
      const resumenSemanal = {}
      semanas.forEach((semanaISO, index) => {
        const semIni = new Date(semanaISO)
        const semFin = new Date(semIni)
        semFin.setDate(semIni.getDate() + 6)

        const etapaActiva = etapas.some(e =>
          e.id_proyecto === p.id_proyecto &&
          new Date(e.fecha_inicio) <= semFin &&
          new Date(e.fecha_fin) >= semIni
        )

        let estado = 'disponible'
        if (etapaActiva) estado = 'en progreso'
        if (p.estado.toLowerCase() === 'finalizado') estado = 'finalizado'
        if (p.estado.toLowerCase() === 'detenido') estado = 'detenido'
        if (p.estado.toLowerCase() !== 'finalizado' && !etapaActiva && new Date() > semFin) estado = 'atrasado'

        resumenSemanal[`semana${index + 1}`] = estado
      })

      return {
        nombre: p.nombre_proyecto,
        estado: p.estado,
        comentario: '',
        resumenSemanal
      }
    })

    const leyenda = [
      { name: 'En Progreso', color: '#2c7be5' },
      { name: 'Finalizado', color: '#47c363' },
      { name: 'Atrasado', color: '#f5b041' },
      { name: 'Disponible', color: '#ccc' },
      { name: 'Detenido', color: '#e74c3c' }
    ]

    res.json({ semanas, proyectos: proyectosResumen, leyenda })
  } catch (err) {
    console.error('Error en /schedule/month:', err)
    res.status(500).json({ error: 'Error interno al cargar vista mensual' })
  }
}
