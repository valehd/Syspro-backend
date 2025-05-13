const express = require('express')
const router = express.Router()
const tecnicoController = require('../controllers/tecnicoController')
const db = require('../config/db')

/**
 * GET /:id/etapas
 * Devuelve todas las etapas asignadas a un técnico específico
 */
router.get('/:id/etapas', tecnicoController.obtenerEtapasPorTecnico)

/**
 * GET /
 * Devuelve todos los técnicos (usuarios con rol "tecnico")
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id_usuario, nombre_usuario 
      FROM Usuario 
      WHERE rol = 'tecnico'
    `)
    res.json(rows)
  } catch (err) {
    console.error('Error al obtener técnicos:', err)
    res.status(500).json({ error: 'Error al obtener técnicos' })
  }
})

module.exports = router
