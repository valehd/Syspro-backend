const db = require('../config/db')

/**
 * Obtiene todas las etapas asignadas a un técnico específico por su ID.
 * Devuelve información relevante de la etapa y del proyecto asociado.
 *
 * @param {string} req.params.id - ID del técnico
 * @returns {Array} Lista de etapas asignadas al técnico
 */
exports.obtenerEtapasPorTecnico = async (req, res) => {
  const tecnicoId = req.params.id

  const query = `
    SELECT 
      e.id_etapa,
      e.nombre_etapa,
      e.estado_etapa,
      e.fecha_inicio,
      e.fecha_fin,
      p.nombre_proyecto,
      p.cliente,
      p.fecha_entrega
    FROM asignacion a
    JOIN etapa e ON a.id_etapa = e.id_etapa
    JOIN proyecto p ON e.id_proyecto = p.id_proyecto
    WHERE a.id_usuario = ?
  `

  try {
    const [results] = await db.query(query, [tecnicoId])
    res.status(200).json(results)
  } catch (err) {
    console.error('Error al obtener etapas del técnico:', err)
    res.status(500).json({ error: 'Error interno al obtener etapas asignadas' })
  }
}
