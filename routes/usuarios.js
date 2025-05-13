const express = require('express')
const router = express.Router()
const usuarioController = require('../controllers/usuarioController')

/**
 * POST /login
 * Valida que se envíen username y password antes de delegar al controlador
 */
router.post('/login', (req, res, next) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos obligatorios'
    })
  }

  next()
}, usuarioController.login)

/**
 * GET /:id
 * Obtiene un usuario por su ID
 */
router.get('/:id', usuarioController.obtenerUsuarioPorId)

/**
 * POST /crear
 * Crea un nuevo usuario. La validación se realiza en el controlador.
 */
router.post('/crear', usuarioController.crearUsuario)

module.exports = router
