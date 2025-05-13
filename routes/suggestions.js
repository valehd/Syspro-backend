const express = require('express')
const router = express.Router()
const suggestionsController = require('../controllers/suggestionsController')

// Ruta principal: sugerencias inteligentes de tareas por disponibilidad
router.get('/', suggestionsController.generarSugerencias)

// Ruta secundaria: tareas cortas sin asignar
router.get('/short-tasks', suggestionsController.tareasCortasDisponibles)

module.exports = router
