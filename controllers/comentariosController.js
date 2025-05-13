// controllers/comentariosController.js
// Controlador para gestión de comentarios en etapas o proyectos

const db = require('../config/db')

/**
 * Crea un nuevo comentario para una etapa o para el proyecto general.
 * Si no se proporciona `id_etapa`, se considera un comentario general del proyecto.
 */
exports.crearComentario = async (req, res) => {
  const {
    id_usuario,
    id_etapa = null, // Permite comentarios generales si es null
    tipo = 'comentario',
    contenido
  } = req.body

  // Validación de campos obligatorios
  if (!id_usuario || !contenido || typeof contenido !== 'string' || !contenido.trim()) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o el contenido no es válido' })
  }

  try {
    await db.query(
      `INSERT INTO comentario (id_etapa, id_usuario, tipo, contenido, fecha)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_etapa, id_usuario, tipo, contenido.trim()]
    )

    res.status(201).json({ message: 'Comentario guardado correctamente' })
  } catch (err) {
    console.error('Error al crear comentario:', err)
    res.status(500).json({ error: 'Error interno al crear comentario' })
  }
}

/**
 * Retorna todos los comentarios asociados a una etapa específica.
 * Se espera un parámetro de ruta: idEtapa.
 */
exports.obtenerComentariosPorEtapa = async (req, res) => {
  const { idEtapa } = req.params

  if (!idEtapa) {
    return res.status(400).json({ error: 'ID de etapa requerido' })
  }

  try {
    const [comments] = await db.query(
      `SELECT 
         id_comentario, 
         id_etapa, 
         id_usuario, 
         tipo, 
         contenido,
         DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s') AS fecha
       FROM comentario
       WHERE id_etapa = ?`,
      [idEtapa]
    )

    res.json(comments)
  } catch (err) {
    console.error('Error al obtener comentarios:', err)
    res.status(500).json({ error: 'Error interno al obtener comentarios' })
  }
}
