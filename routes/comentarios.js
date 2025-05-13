// routes/comentarios.js
// Define las rutas para la gestión de comentarios en el sistema

const express = require('express')
const router = express.Router()
const comentariosController = require('../controllers/comentariosController')

/**
 * POST /comentarios
 * Crea un nuevo comentario asociado a una etapa específica o al proyecto (comentario general).
 * Se espera: id_usuario, contenido, y opcionalmente id_etapa y tipo.
 */
router.post('/', comentariosController.crearComentario)

/**
 * GET /comentarios/:idEtapa
 * Retorna todos los comentarios registrados para una etapa específica.
 * Parámetro requerido: idEtapa
 */
router.get('/:idEtapa', comentariosController.obtenerComentariosPorEtapa)

module.exports = router
