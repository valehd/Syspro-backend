// routes/registrohoras.js
// Rutas asociadas al registro de horas trabajadas por técnicos

const express = require('express')
const router = express.Router()
const registroController = require('../controllers/registrohorasController')

// Inicia un nuevo registro (inicio de timer para una etapa)
router.post('/start', registroController.iniciarRegistro)

// Detiene el registro activo (finaliza timer para una etapa)
router.put('/stop', registroController.detenerRegistro)

// Devuelve el total de horas trabajadas por usuario en una etapa
router.get('/etapa/:idEtapa/usuario/:idUsuario', registroController.obtenerHorasPorEtapaYUsuario)

// Verifica si hay un registro activo para un usuario en una etapa
router.get('/activo/:idUsuario/:idEtapa', registroController.verificarTimerActivo)

// Obtiene el historial completo de registros de un usuario
router.get('/historial/:idUsuario', registroController.obtenerHistorialPorUsuario)

module.exports = router
