const db = require('../config/db')

/**
 * GET /bitacora
 * Retorna todas las acciones registradas en la bitácora,
 * ordenadas de más recientes a más antiguas.
 */
exports.obtenerBitacora = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        b.id_bitacora, 
        b.accion, 
        DATE_FORMAT(b.fecha_hora, '%Y-%m-%dT%H:%i:%s') AS fecha_hora, 
        u.nombre_usuario
      FROM Bitacora b
      LEFT JOIN Usuario u ON b.id_usuario = u.id_usuario
      ORDER BY b.fecha_hora DESC
    `)

    res.json(results)
  } catch (err) {
    console.error('Error al obtener la bitácora:', err)
    res.status(500).json({ error: 'Error al obtener la bitácora' })
  }
}

/**
 * POST /bitacora
 * Registra una nueva acción en la bitácora.
 * Se requiere el ID del usuario, la descripción de la acción y el ID del proyecto asociado.
 * La fecha y hora se registran automáticamente.
 */
exports.registrarBitacora = async (req, res) => {
  const { id_usuario, accion, id_proyecto } = req.body

  // Validación de campos obligatorios
  if (!id_usuario || !accion || !id_proyecto) {
    return res.status(400).json({ error: 'Faltan campos requeridos (usuario, acción o proyecto)' })
  }

  try {
    await db.query(
      `INSERT INTO Bitacora (id_usuario, accion, id_proyecto, fecha_hora) VALUES (?, ?, ?, NOW())`,
      [id_usuario, accion, id_proyecto]
    )

    res.status(201).json({ message: 'Acción registrada en la bitácora' })
  } catch (err) {
    console.error('Error al registrar en la bitácora:', err)
    res.status(500).json({ error: 'Error al registrar en la bitácora' })
  }
}
