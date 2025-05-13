// routes/bitacora.js
// Rutas relacionadas con el registro de acciones en la bitácora del sistema

const express = require('express')
const router = express.Router()
const bitacoraController = require('../controllers/bitacoraController')

/**
 * GET /bitacora
 * Retorna todos los registros de la bitácora, ordenados por fecha y hora descendente.
 */
router.get('/', bitacoraController.obtenerBitacora)

/**
 * POST /bitacora
 * Registra una nueva acción en la bitácora.
 * Requiere: id_usuario, accion, id_proyecto.
 */
router.post('/', bitacoraController.registrarBitacora)

module.exports = router
