// routes/etapas.js

const express = require('express')
const router = express.Router()
const etapasController = require('../controllers/etapasController')

/**
 * Rutas relacionadas con la gestión de etapas de proyectos.
 * Estas incluyen creación, edición, eliminación y visualización de etapas.
 */

// Agregar una etapa desde la vista general (por ID de proyecto)
router.post('/:idProyecto', etapasController.agregarEtapa)

// Agregar una etapa desde la vista de detalles (requiere más información)
router.post('/', etapasController.agregarEtapaDesdeDetalles)

// Editar una etapa existente por su ID
router.put('/:idEtapa', etapasController.editarEtapa)

// Eliminar una etapa por su ID
router.delete('/:idEtapa', etapasController.eliminarEtapa)

// Obtener una etapa por su ID (usado para precarga en formularios)
router.get('/:id', etapasController.obtenerEtapaPorId)

// Obtener todas las etapas de un proyecto con horas estimadas y reales
router.get('/projects/:id/etapas-con-horas', etapasController.obtenerEtapasConHoras)

module.exports = router
