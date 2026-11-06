const pool = require("../config/database");

async function registrarAuditoria({ usuarioId, accion, entidad, entidadId, detalles, ip }) {
    await pool.query(
        `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [usuarioId || null, accion, entidad || null, entidadId || null, detalles ? JSON.stringify(detalles) : null, ip || null]
    );
}

module.exports = { registrarAuditoria };
