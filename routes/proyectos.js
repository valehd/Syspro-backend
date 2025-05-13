// routes/proyectos.js
// Rutas relacionadas con la gestión de proyectos y sus componentes asociados

const express = require('express')
const router = express.Router()
const proyectosController = require('../controllers/proyectosController')

// ─────────────────────────────────────────────────────────────
// Rutas RESTful para gestión de proyectos
// ─────────────────────────────────────────────────────────────

// Crear un nuevo proyecto con sus etapas y asignaciones
router.post('/', proyectosController.crearProyecto)

// Obtener todos los proyectos registrados
router.get('/', proyectosController.obtenerTodosLosProyectos)

// Obtener un proyecto específico por su ID
router.get('/:id', proyectosController.obtenerProyectoPorId)

// Editar un proyecto existente por ID
router.put('/:id', proyectosController.editarProyecto)

// Eliminar un proyecto por su ID, incluyendo sus etapas
router.delete('/:id', proyectosController.eliminarProyecto)

// ─────────────────────────────────────────────────────────────
// Rutas adicionales asociadas a un proyecto específico
// ─────────────────────────────────────────────────────────────

// Obtener las etapas del proyecto
router.get('/:id/etapas', proyectosController.obtenerEtapasPorProyecto)

// Obtener el historial (bitácora + comentarios) del proyecto
router.get('/:id/log', proyectosController.obtenerLogProyecto)

module.exports = router
