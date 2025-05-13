// index.js — Punto de entrada principal del backend del sistema SYS-PRO

const express = require('express')
const cors = require('cors')

const app = express()

// ─────────────────────────────────────────────────────────────
// Middlewares globales
// ─────────────────────────────────────────────────────────────

// Habilita CORS para permitir solicitudes desde el frontend
app.use(cors())

// Permite recibir datos en formato JSON y texto plano
app.use(express.json({ type: ['application/json', 'text/plain'] }))

// ─────────────────────────────────────────────────────────────
// Conexión a la base de datos y utilidades globales
// ─────────────────────────────────────────────────────────────

const db = require('./config/db')
const registrarEnBitacora = require('./helpers/bitacora') // Se importa en caso de uso global

// ─────────────────────────────────────────────────────────────
// Importación de rutas organizadas por dominio
// ─────────────────────────────────────────────────────────────

const proyectoRoutes = require('./routes/proyectos')
const usuarioRoutes = require('./routes/usuarios')
const etapaRoutes = require('./routes/etapas')
const tecnicoRoutes = require('./routes/tecnicos')
const bitacoraRoutes = require('./routes/bitacora')
const scheduleRoutes = require('./routes/schedule')
const asignacionRoutes = require('./routes/asignacion')
const tareasRoutes = require('./routes/tareas')
const comentariosRoutes = require('./routes/comentarios')
const registrohorasRoutes = require('./routes/registrohoras')
const suggestionsRoutes = require('./routes/suggestions')
const statisticsRoutes = require('./routes/statistics')
const dashboardRoutes = require('./routes/dashboard')

// ─────────────────────────────────────────────────────────────
// Montaje de rutas sobre prefijos base
// ─────────────────────────────────────────────────────────────

app.use('/projects', proyectoRoutes)
app.use('/usuarios', usuarioRoutes)
app.use('/login', usuarioRoutes) // Ruta alternativa para login (reutiliza controlador de usuarios)
app.use('/etapas', etapaRoutes)
app.use('/tecnicos', tecnicoRoutes)
app.use('/bitacora', bitacoraRoutes)
app.use('/schedule', scheduleRoutes)
app.use('/asignacion', asignacionRoutes)
app.use('/tareas', tareasRoutes)
app.use('/comentarios', comentariosRoutes)
app.use('/registrohoras', registrohorasRoutes)
app.use('/suggestions', suggestionsRoutes)
app.use('/statistics', statisticsRoutes)
app.use('/dashboard', dashboardRoutes)

// ─────────────────────────────────────────────────────────────
// Ruta raíz para comprobación del servidor
// ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send('API funcionando correctamente')
})

// ─────────────────────────────────────────────────────────────
// Inicialización del servidor
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend iniciado en http://localhost:${PORT}`);
})
