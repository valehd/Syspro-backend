// config/db.js — Configuración y conexión a la base de datos usando MySQL2 con soporte para promesas

const mysql = require('mysql2/promise') // Cliente MySQL compatible con async/await

// Creación de un pool de conexiones para manejar múltiples consultas concurrentes de forma eficiente
const pool = mysql.createPool({
  host: 'localhost',         // Dirección del servidor MySQL
  user: 'root',              // Usuario con permisos de conexión
  password: 'root',          // Contraseña del usuario
  database: 'syspro',        // Nombre de la base de datos usada por el sistema
  waitForConnections: true,  // Permite a las solicitudes esperar si no hay conexiones disponibles
  connectionLimit: 10,       // Número máximo de conexiones activas al mismo tiempo
  queueLimit: 0              // Número ilimitado de conexiones en espera
})

// Mensaje de confirmación de conexión al iniciar el backend
console.log('Base de datos conectada correctamente (modo promesa)')

// Exportación del pool para ser reutilizado en todos los controladores del sistema
module.exports = pool
