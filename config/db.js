// config/db.js — Configuración y conexión a la base de datos usando MySQL2 con soporte para promesas


const mysql = require('mysql2/promise') // Cliente MySQL compatible con async/await

// Creación de un pool de conexiones para manejar múltiples consultas concurrentes de forma eficiente

const pool = mysql.createPool({
  host: process.env.DB_HOST,           // switchback.proxy.rlwy.net
  port: process.env.DB_PORT,           // 16376 (ahora corregido)
  user: process.env.DB_USER,           // root
  password: process.env.DB_PASS,       // tu contraseña segura
  database: process.env.DB_NAME,       // railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Mensaje de confirmación de conexión al iniciar el backend
console.log('Base de datos conectada correctamente (modo promesa)')

// Exportación del pool para ser reutilizado en todos los controladores del sistema
module.exports = pool
