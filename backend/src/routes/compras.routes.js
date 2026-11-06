const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// ==========================================
// 1. CREAR COMPRA EN BORRADOR
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
            proveedor_id,
            numero_documento,
            fecha,
            observaciones
        } = req.body;
        const usuario_id = req.usuario.id;

        // Validar proveedor si fue indicado
        if (proveedor_id) {
            const proveedor = await pool.query(
                `SELECT id
                 FROM proveedores
                 WHERE id = $1 AND estado = true`,
                [proveedor_id]
            );

            if (proveedor.rows.length === 0) {
                return res.status(400).json({
                    mensaje: "El proveedor no existe o está desactivado"
                });
            }
        }

        // Crear compra
        const resultado = await pool.query(
            `INSERT INTO compras (
                proveedor_id,
                numero_documento,
                fecha,
                subtotal,
                impuesto,
                total,
                estado,
                observaciones,
                usuario_id
            )
            VALUES (
                $1,
                $2,
                COALESCE($3, CURRENT_TIMESTAMP),
                0,
                0,
                0,
                'BORRADOR',
                $4,
                $5
            )
            RETURNING *`,
            [
                proveedor_id || null,
                numero_documento || null,
                fecha || null,
                observaciones || null,
                usuario_id || null
            ]
        );

        res.status(201).json({
            mensaje: "Compra creada correctamente en estado BORRADOR",
            compra: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al crear compra:", error);
        res.status(500).json({
            mensaje: "Error al crear la compra"
        });
    }
});

// ==========================================
// 2. AGREGAR PRODUCTOS A LA COMPRA (DETALLES)
// ==========================================
router.post("/:id/detalles", async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { producto_id, cantidad, costo_unitario } = req.body;

        // Validar datos
        if (
            !producto_id ||
            !Number.isFinite(Number(cantidad)) ||
            Number(cantidad) <= 0 ||
            !Number.isFinite(Number(costo_unitario)) ||
            Number(costo_unitario) < 0
        ) {
            return res.status(400).json({
                mensaje: "Producto, cantidad positiva y costo unitario válido son obligatorios"
            });
        }

        await client.query("BEGIN");

        // Verificar y bloquear la compra
        const compra = await client.query(
            `SELECT id, estado
             FROM compras
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (compra.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                mensaje: "Compra no encontrada"
            });
        }

        if (compra.rows[0].estado !== "BORRADOR") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "No se pueden agregar productos a una compra que no está en BORRADOR"
            });
        }

        // Verificar que el producto exista y esté activo
        const producto = await client.query(
            `SELECT id
             FROM productos
             WHERE id = $1 AND estado = true`,
            [producto_id]
        );

        if (producto.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "El producto no existe o está desactivado"
            });
        }

        // Insertar detalle: PostgreSQL calcula subtotal
        const detalle = await client.query(
            `INSERT INTO detalle_compras
             (compra_id, producto_id, cantidad, costo_unitario)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, producto_id, cantidad, costo_unitario]
        );

        // Recalcular totales de la compra
        const totales = await client.query(
            `UPDATE compras
             SET subtotal = (
                    SELECT COALESCE(SUM(subtotal), 0)
                    FROM detalle_compras
                    WHERE compra_id = $1
                ),
                total = (
                    SELECT COALESCE(SUM(subtotal), 0)
                    FROM detalle_compras
                    WHERE compra_id = $1
                )
             WHERE id = $1
             RETURNING subtotal, impuesto, total`,
            [id]
        );

        await client.query("COMMIT");

        res.status(201).json({
            mensaje: "Producto agregado correctamente a la compra",
            detalle: detalle.rows[0],
            totales: totales.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error al agregar producto a compra:", error);
        res.status(500).json({
            mensaje: "Error al agregar producto a la compra"
        });
    } finally {
        client.release();
    }
});

 // LISTAR COMPRAS CON SUS DETALLES
router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                c.id,
                c.proveedor_id,
                p.nombre AS proveedor,
                c.numero_documento,
                c.fecha,
                c.subtotal,
                c.impuesto,
                c.total,
                c.estado,
                c.observaciones,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'detalle_id', dc.id,
                            'producto_id', dc.producto_id,
                            'producto', pr.nombre,
                            'cantidad', dc.cantidad,
                            'costo_unitario', dc.costo_unitario,
                            'subtotal', dc.subtotal
                        )
                    ) FILTER (WHERE dc.id IS NOT NULL),
                    '[]'
                ) AS detalles
            FROM compras c
            LEFT JOIN proveedores p ON p.id = c.proveedor_id
            LEFT JOIN detalle_compras dc ON dc.compra_id = c.id
            LEFT JOIN productos pr ON pr.id = dc.producto_id
            GROUP BY c.id, p.nombre
            ORDER BY c.id DESC
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error("Error al listar compras:", error);

        res.status(500).json({
            mensaje: "Error al obtener las compras"
        });
    }
});
// OBTENER UNA COMPRA POR ID CON SUS DETALLES
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || Number(id) <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la compra no es válido"
            });
        }

        const resultado = await pool.query(
            `
            SELECT
                c.id,
                c.proveedor_id,
                p.nombre AS proveedor,
                c.numero_documento,
                c.fecha,
                c.subtotal,
                c.impuesto,
                c.total,
                c.estado,
                c.observaciones,
                c.usuario_id,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'detalle_id', dc.id,
                            'producto_id', dc.producto_id,
                            'producto', pr.nombre,
                            'cantidad', dc.cantidad,
                            'costo_unitario', dc.costo_unitario,
                            'subtotal', dc.subtotal
                        )
                    ) FILTER (WHERE dc.id IS NOT NULL),
                    '[]'
                ) AS detalles
            FROM compras c
            LEFT JOIN proveedores p ON p.id = c.proveedor_id
            LEFT JOIN detalle_compras dc ON dc.compra_id = c.id
            LEFT JOIN productos pr ON pr.id = dc.producto_id
            WHERE c.id = $1
            GROUP BY c.id, p.nombre
            `,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Compra no encontrada"
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error("Error al obtener compra:", error);

        res.status(500).json({
            mensaje: "Error al obtener la compra"
        });
    }
});

// CONFIRMAR UNA COMPRA Y ACTUALIZAR EL INVENTARIO
router.post("/:id/confirmar", async (req, res) => {
    const { id } = req.params;
    let client;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
            mensaje: "El ID de la compra no es válido"
        });
    }

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // 1. Buscar y bloquear la compra
        const compraResultado = await client.query(
            `SELECT id, estado, usuario_id, numero_documento
             FROM compras
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (compraResultado.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Compra no encontrada"
            });
        }

        const compra = compraResultado.rows[0];

        // 2. Verificar que esté en BORRADOR
        if (compra.estado !== "BORRADOR") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Solo se pueden confirmar compras en estado BORRADOR"
            });
        }

        // 3. Obtener los productos de la compra
        const detallesResultado = await client.query(
            `SELECT
                dc.id,
                dc.producto_id,
                dc.cantidad,
                p.nombre AS producto,
                p.estado AS producto_activo
             FROM detalle_compras dc
             INNER JOIN productos p ON p.id = dc.producto_id
             WHERE dc.compra_id = $1
             ORDER BY dc.producto_id, dc.id`,
            [id]
        );

        const detalles = detallesResultado.rows;

        if (detalles.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "No se puede confirmar una compra sin productos"
            });
        }

        // 4. Verificar que todos los productos estén activos
        const productoInactivo = detalles.find(
            detalle => !detalle.producto_activo
        );

        if (productoInactivo) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: `El producto ${productoInactivo.producto} está desactivado`
            });
        }

        // 5. Actualizar inventario y registrar movimientos
        for (const detalle of detalles) {

            const inventarioResultado = await client.query(
                `SELECT cantidad_actual
                 FROM inventario
                 WHERE producto_id = $1
                 FOR UPDATE`,
                [detalle.producto_id]
            );

            if (inventarioResultado.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    mensaje: `No existe inventario para el producto ${detalle.producto}`
                });
            }

            const stockAnterior =
                inventarioResultado.rows[0].cantidad_actual;

            const inventarioActualizado = await client.query(
                `UPDATE inventario
                 SET cantidad_actual = cantidad_actual + $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE producto_id = $2
                 RETURNING cantidad_actual`,
                [detalle.cantidad, detalle.producto_id]
            );

            const stockNuevo =
                inventarioActualizado.rows[0].cantidad_actual;

            // Registrar movimiento de entrada
            await client.query(
                `INSERT INTO movimientos
                 (
                    producto_id,
                    tipo,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    motivo,
                    usuario_id
                 )
                 VALUES ($1, 'ENTRADA', $2, $3, $4, $5, $6)`,
                [
                    detalle.producto_id,
                    detalle.cantidad,
                    stockAnterior,
                    stockNuevo,
                    `Compra #${id} - ${compra.numero_documento || "Sin documento"}`,
                    compra.usuario_id
                ]
            );
        }

        // 6. Cambiar el estado de la compra
        const compraActualizada = await client.query(
            `UPDATE compras
             SET estado = 'CONFIRMADA'
             WHERE id = $1
             RETURNING id, estado, subtotal, impuesto, total`,
            [id]
        );

        // 7. Confirmar toda la transacción
        await client.query("COMMIT");

        res.json({
            mensaje: "Compra confirmada correctamente. Inventario actualizado.",
            compra: compraActualizada.rows[0],
            productos_procesados: detalles.length
        });

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Error al confirmar compra:", error);

        res.status(500).json({
            mensaje: "Error al confirmar la compra"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;