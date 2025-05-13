const db = require('../config/db')

/**
 * Registra una acción en la tabla Bitacora del sistema.
 * Se espera que toda operación relevante (creación, edición, eliminación) la invoque.
 *
 * @param {number} id_usuario - ID del usuario que realizó la acción
 * @param {string} accion - Descripción textual de la acción realizada
 * @param {number} id_proyecto - ID del proyecto asociado a la acción
 */
async function registrarEnBitacora(id_usuario, accion, id_proyecto) {
  // Validación básica de entrada
  if (!id_usuario || !accion || !id_proyecto) {
    console.warn('Bitácora: Faltan parámetros requeridos para registrar la acción')
    return
  }

  const query = `
    INSERT INTO Bitacora (id_usuario, accion, id_proyecto, fecha_hora)
    VALUES (?, ?, ?, NOW())
  `

  try {
    await db.query(query, [id_usuario, accion, id_proyecto])
    console.log(`Bitácora: Acción registrada para proyecto ${id_proyecto}`)
  } catch (err) {
    console.error('Bitácora: Error al registrar acción en base de datos:', err)
  }
}

module.exports = registrarEnBitacora
