const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/resumen", async (req, res) => {
    try {
        const [ventas, compras, caja, inventario] = await Promise.all([
            pool.query(`SELECT COUNT(*)::int AS operaciones, COALESCE(SUM(total), 0)::numeric AS total
                        FROM ventas WHERE estado = 'CONFIRMADA'`),
            pool.query(`SELECT COUNT(*)::int AS operaciones, COALESCE(SUM(total), 0)::numeric AS total
                        FROM compras WHERE estado = 'CONFIRMADA'`),
            pool.query(`SELECT metodo_pago, COALESCE(SUM(total), 0)::numeric AS total
                        FROM ventas WHERE estado = 'CONFIRMADA'
                        GROUP BY metodo_pago ORDER BY metodo_pago`),
            pool.query(`SELECT COUNT(*) FILTER (WHERE i.cantidad_actual <= 0)::int AS agotados,
                               COUNT(*) FILTER (WHERE i.cantidad_actual > 0 AND i.cantidad_actual <= i.stock_minimo)::int AS bajo_stock,
                               COALESCE(SUM(i.cantidad_actual * p.precio_compra), 0)::numeric AS valorizacion
                        FROM inventario i INNER JOIN productos p ON p.id = i.producto_id
                        WHERE p.estado = true`)
        ]);
        res.json({
            ventas: ventas.rows[0],
            compras: compras.rows[0],
            caja: caja.rows,
            inventario: inventario.rows[0]
        });
    } catch (error) {
        console.error("Error al generar resumen:", error);
        res.status(500).json({ mensaje: "No se pudo generar el resumen de reportes" });
    }
});

router.get("/auditoria", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalles, a.ip, a.created_at,
                   a.usuario_id, u.nombre AS usuario_nombre
            FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
            ORDER BY a.created_at DESC LIMIT 200
        `);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al consultar auditoria:", error);
        res.status(500).json({ mensaje: "No se pudo consultar la auditoría" });
    }
});

module.exports = router;
