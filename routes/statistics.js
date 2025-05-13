// routes/statistics.js

const express = require('express')
const router = express.Router()
const statsController = require('../controllers/statisticsController')

/**
 * GET /summary
 * Retorna un resumen general:
 * - Total de proyectos
 * - Proyectos finalizados a tiempo
 * - Total de fases
 * - Fases a tiempo
 * - Fases retrasadas
 */
router.get('/summary', statsController.obtenerResumen)

/**
 * GET /hours-comparison
 * Compara horas estimadas vs. reales por etapa.
 * Filtros opcionales: técnico, proyecto, estado, tipo de proyecto.
 */
router.get('/hours-comparison', statsController.obtenerComparacionHoras)

/**
 * GET /delay-reasons
 * Lista los motivos de retraso extraídos desde los comentarios de etapas.
 * Filtros opcionales: técnico, proyecto, tipo de proyecto.
 */
router.get('/delay-reasons', statsController.obtenerMotivosRetraso)

module.exports = router
