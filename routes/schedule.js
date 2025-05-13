// routes/schedule.js

const express = require('express')
const router = express.Router()
const scheduleController = require('../controllers/scheduleController')

// Vista diaria por técnico para una fecha específica (GET /schedule/day?date=YYYY-MM-DD)
router.get('/day', scheduleController.getDaySchedule)

// Vista semanal de proyectos por técnico (GET /schedule/week?base=YYYY-MM-DD)
router.get('/week', scheduleController.getWeekSchedule)

// Vista mensual por estado de proyectos (GET /schedule/month?base=YYYY-MM-DD)
router.get('/month', scheduleController.getMonthSchedule)

module.exports = router
