// routes/dashboard.js
// Define las rutas relacionadas con el panel de administración (dashboard).

const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')

/**
 * GET /dashboard/alerts
 * Retorna una lista de alertas agrupadas por tipo:
 * - success: proyectos finalizados a tiempo
 * - warnings: fases que sobrepasan tiempo estimado
 * - errors: fases sin técnico asignado
 */
router.get('/alerts', dashboardController.obtenerAlertas)

module.exports = router
