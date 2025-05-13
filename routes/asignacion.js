// routes/asignacionRoutes.js

const express = require('express')
const router = express.Router()
const asignacionController = require('../controllers/asignacionController')

/**
 * POST /
 * Asigna un técnico a una etapa.
 * Si ya existe una asignación previa, se actualiza.
 */
router.post('/', asignacionController.asignarEtapa)

/**
 * GET /
 * Retorna todas las asignaciones registradas en el sistema.
 * Incluye información del técnico, etapa y proyecto.
 */
router.get('/', asignacionController.obtenerAsignaciones)

/**
 * GET /:id
 * Obtiene la asignación correspondiente a una etapa específica.
 * :id → ID de la etapa.
 */
router.get('/:id', asignacionController.obtenerAsignacionPorEtapa)

/**
 * PUT /:id
 * Actualiza el técnico asignado en una asignación existente.
 * :id → ID de la asignación.
 */
router.put('/:id', asignacionController.actualizarAsignacion)

module.exports = router
