const db = require('../config/db')
const bcrypt = require('bcrypt')

/**
 * Controlador de login
 * Valida credenciales y responde con datos mínimos del usuario
 */
exports.login = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Faltan datos de ingreso' })
  }

  try {
    const [results] = await db.query('SELECT * FROM Usuario WHERE nombre_usuario = ?', [username])

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' })
    }

    const user = results[0]
    const match = await bcrypt.compare(password, user.contraseña_hash)

    if (!match) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' })
    }

    res.json({
      success: true,
      role: user.rol,
      username: user.nombre_usuario,
      id: user.id_usuario
    })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

/**
 * Obtiene nombre de usuario y rol por ID
 */
exports.obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await db.query(
      'SELECT nombre_usuario, rol FROM Usuario WHERE id_usuario = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json(rows[0])
  } catch (err) {
    console.error('Error al obtener usuario por ID:', err)
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}

/**
 * Crea un nuevo usuario con validación y hash de contraseña
 */
exports.crearUsuario = async (req, res) => {
  const {
    nombre,
    apellido,
    nombre_usuario,
    contrasena,
    rol,
    telefono,
    correo
  } = req.body

  // Validación de campos obligatorios
  if (!nombre || !apellido || !nombre_usuario || !contrasena || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  // Validación de nombre de usuario
  const regexUsername = /^[a-zA-Z0-9_.-]+$/
  if (!regexUsername.test(nombre_usuario)) {
    return res.status(400).json({ error: 'El nombre de usuario contiene caracteres no permitidos' })
  }

  // Validación de contraseña
  if (contrasena.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  // Validación de formato de correo si viene incluido
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (correo && !regexCorreo.test(correo)) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' })
  }

  try {
    // Verificar unicidad del nombre de usuario
    const [existe] = await db.query(
      'SELECT * FROM Usuario WHERE nombre_usuario = ?',
      [nombre_usuario]
    )
    if (existe.length > 0) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' })
    }

    // Encriptar la contraseña antes de insertar
    const contraseña_hash = await bcrypt.hash(contrasena, 10)

    // Insertar el nuevo usuario
    await db.query(
      `INSERT INTO Usuario (nombre, apellido, nombre_usuario, contraseña_hash, rol, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, nombre_usuario, contraseña_hash, rol, telefono, correo]
    )

    res.status(201).json({ message: 'Usuario creado exitosamente' })
  } catch (err) {
    console.error('Error al crear usuario:', err)
    res.status(500).json({ error: 'Error interno al crear usuario' })
  }
}
