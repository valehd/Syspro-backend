const express = require('express')
const router = express.Router()
const tareasController = require('../controllers/tareasController')

/**
 * POST / - Crea una nueva tarea
 * Espera los campos requeridos: nombre_tarea, id_etapa, fechas, horas_estimadas, estado
 */
router.post('/', tareasController.crearTarea)

/**
 * GET /por-tecnico/:id - Obtiene todas las tareas asignadas a un técnico específico
 */
router.get('/por-tecnico/:id', tareasController.obtenerTareasPorTecnico)

/**
 * GET /:id - Obtiene los datos de una tarea específica por su ID
 */
router.get('/:id', tareasController.obtenerTareaPorId)

/**
 * PUT /:id - Actualiza los datos de una tarea existente
 */
router.put('/:id', tareasController.editarTarea)

/**
 * DELETE /:id - Elimina una tarea existente por su ID
 */
router.delete('/:id', tareasController.eliminarTarea)

router.get('/por-tecnico-con-horas/:id_usuario', tareasController.obtenerTareasConHoras)


module.exports = router
