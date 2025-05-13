const express = require('express')
const router = express.Router()
const tecnicoController = require('../controllers/tecnicoController')
const db = require('../config/db')



/**
 * GET /
 * Devuelve todos los técnicos (usuarios con rol "tecnico")
 */
router.get('/', tecnicoController.obtenerTecnicos)


/**
 * GET /:id/etapas
 * Devuelve todas las etapas asignadas a un técnico específico
 */
router.get('/:id/etapas', tecnicoController.obtenerEtapasPorTecnico)

module.exports = router
