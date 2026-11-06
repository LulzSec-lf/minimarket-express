
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// CREAR UNA VENTA EN ESTADO BORRADOR
router.post("/", async (req, res) => {
    try {
        const {
            cliente_id,
            numero_documento,
            observaciones,
            metodo_pago = "EFECTIVO"
        } = req.body;
        const usuario_id = req.usuario.id;
        const metodosPagoPermitidos = ["EFECTIVO", "YAPE", "PLIN"];

        if (!metodosPagoPermitidos.includes(metodo_pago)) {
            return res.status(400).json({
                mensaje: "El método de pago no es válido"
            });
        }

        // Validar cliente_id si fue proporcionado
        if (
            cliente_id !== undefined &&
            cliente_id !== null &&
            (!Number.isInteger(Number(cliente_id)) || Number(cliente_id) <= 0)
        ) {
            return res.status(400).json({
                mensaje: "El ID del cliente no es válido"
            });
        }

        // Comprobar que el cliente exista
        if (cliente_id) {
            const cliente = await pool.query(
                "SELECT id FROM clientes WHERE id = $1",
                [cliente_id]
            );

            if (cliente.rows.length === 0) {
                return res.status(400).json({
                    mensaje: "El cliente no existe"
                });
            }
        }

        // Crear venta
        const resultado = await pool.query(
            `INSERT INTO ventas (
                cliente_id,
                numero_documento,
                subtotal,
                impuesto,
                total,
                estado,
                observaciones,
                metodo_pago,
                usuario_id
            )
            VALUES ($1, $2, 0, 0, 0, 'BORRADOR', $3, $4, $5)
            RETURNING *`,
            [
                cliente_id || null,
                numero_documento || null,
                observaciones || null,
                metodo_pago,
                usuario_id || null
            ]
        );

        res.status(201).json({
            mensaje: "Venta creada correctamente en estado BORRADOR",
            venta: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al crear venta:", error);

        res.status(500).json({
            mensaje: "Error al crear la venta"
        });
    }
});

// AGREGAR PRODUCTO A UNA VENTA
router.post("/:id/detalles", async (req, res) => {
    const { id } = req.params;
    const { producto_id, cantidad } = req.body;

    let client;

    // Validaciones
    if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
            mensaje: "El ID de la venta no es válido"
        });
    }

    if (
        !Number.isInteger(Number(producto_id)) ||
        Number(producto_id) <= 0 ||
        !Number.isFinite(Number(cantidad)) ||
        Number(cantidad) <= 0
    ) {
        return res.status(400).json({
            mensaje: "Producto y cantidad positiva son obligatorios"
        });
    }

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // 1. Buscar y bloquear la venta
        const ventaResultado = await client.query(
            `SELECT id, estado
             FROM ventas
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (ventaResultado.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Venta no encontrada"
            });
        }

        if (ventaResultado.rows[0].estado !== "BORRADOR") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "No se pueden agregar productos a una venta que no está en BORRADOR"
            });
        }

        // 2. Obtener el precio registrado del producto
        const productoResultado = await client.query(
            `SELECT id, nombre, precio_venta
             FROM productos
             WHERE id = $1 AND estado = true`,
            [producto_id]
        );

        if (productoResultado.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "El producto no existe o está desactivado"
            });
        }

        const producto = productoResultado.rows[0];

        // 3. Guardar el detalle de venta
        // PostgreSQL calcula subtotal automáticamente
        const detalleResultado = await client.query(
            `INSERT INTO detalle_ventas (
                venta_id,
                producto_id,
                cantidad,
                precio_unitario
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                id,
                producto_id,
                cantidad,
                producto.precio_venta
            ]
        );

        // 4. Actualizar los totales de la venta
        const totalesResultado = await client.query(
            `UPDATE ventas
             SET subtotal = (
                    SELECT COALESCE(SUM(subtotal), 0)
                    FROM detalle_ventas
                    WHERE venta_id = $1
                ),
                total = (
                    SELECT COALESCE(SUM(subtotal), 0)
                    FROM detalle_ventas
                    WHERE venta_id = $1
                )
             WHERE id = $1
             RETURNING subtotal, impuesto, total`,
            [id]
        );

        await client.query("COMMIT");

        res.status(201).json({
            mensaje: "Producto agregado correctamente a la venta",
            producto: producto.nombre,
            detalle: detalleResultado.rows[0],
            totales: totalesResultado.rows[0]
        });

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Error al agregar producto a venta:", error);

        res.status(500).json({
            mensaje: "Error al agregar producto a la venta"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// LISTAR VENTAS CON SUS DETALLES
router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                v.id,
                v.cliente_id,
                v.numero_documento,
                v.fecha,
                v.subtotal,
                v.impuesto,
                v.total,
                v.estado,
                v.observaciones,
                v.metodo_pago,
                v.usuario_id,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'detalle_id', dv.id,
                            'producto_id', dv.producto_id,
                            'producto', p.nombre,
                            'cantidad', dv.cantidad,
                            'precio_unitario', dv.precio_unitario,
                            'subtotal', dv.subtotal
                        )
                    ) FILTER (WHERE dv.id IS NOT NULL),
                    '[]'
                ) AS detalles
            FROM ventas v
            LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
            LEFT JOIN productos p ON p.id = dv.producto_id
            GROUP BY v.id
            ORDER BY v.id DESC
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error("Error al listar ventas:", error);

        res.status(500).json({
            mensaje: "Error al obtener las ventas"
        });
    }
});

// OBTENER UNA VENTA POR ID CON SUS DETALLES
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || Number(id) <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la venta no es válido"
            });
        }

        const resultado = await pool.query(
            `
            SELECT
                v.id,
                v.cliente_id,
                v.numero_documento,
                v.fecha,
                v.subtotal,
                v.impuesto,
                v.total,
                v.estado,
                v.observaciones,
                v.usuario_id,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'detalle_id', dv.id,
                            'producto_id', dv.producto_id,
                            'producto', p.nombre,
                            'cantidad', dv.cantidad,
                            'precio_unitario', dv.precio_unitario,
                            'subtotal', dv.subtotal
                        )
                    ) FILTER (WHERE dv.id IS NOT NULL),
                    '[]'
                ) AS detalles
            FROM ventas v
            LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
            LEFT JOIN productos p ON p.id = dv.producto_id
            WHERE v.id = $1
            GROUP BY v.id
            `,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Venta no encontrada"
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error("Error al obtener venta:", error);

        res.status(500).json({
            mensaje: "Error al obtener la venta"
        });
    }
});

// CONFIRMAR UNA VENTA Y DESCONTAR EL INVENTARIO
router.post("/:id/confirmar", async (req, res) => {
    const { id } = req.params;
    let client;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
            mensaje: "El ID de la venta no es válido"
        });
    }

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // 1. Buscar y bloquear la venta
        const ventaResultado = await client.query(
            `SELECT id, estado, usuario_id, numero_documento
             FROM ventas
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (ventaResultado.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Venta no encontrada"
            });
        }

        const venta = ventaResultado.rows[0];

        // 2. Verificar que esté en BORRADOR
        if (venta.estado !== "BORRADOR") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Solo se pueden confirmar ventas en estado BORRADOR"
            });
        }

        // 3. Obtener los productos de la venta
        const detallesResultado = await client.query(
            `SELECT
                dv.id,
                dv.producto_id,
                dv.cantidad,
                p.nombre AS producto,
                p.estado AS producto_activo
             FROM detalle_ventas dv
             INNER JOIN productos p ON p.id = dv.producto_id
             WHERE dv.venta_id = $1
             ORDER BY dv.producto_id, dv.id`,
            [id]
        );

        const detalles = detallesResultado.rows;

        if (detalles.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "No se puede confirmar una venta sin productos"
            });
        }

        // 4. Verificar que los productos estén activos
        const productoInactivo = detalles.find(
            detalle => !detalle.producto_activo
        );

        if (productoInactivo) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: `El producto ${productoInactivo.producto} está desactivado`
            });
        }

        // 5. Verificar stock y descontar inventario
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
                    mensaje: `No existe inventario para ${detalle.producto}`
                });
            }

            const stockAnterior =
                inventarioResultado.rows[0].cantidad_actual;

            // Comprobar que haya suficiente stock
            if (Number(stockAnterior) < Number(detalle.cantidad)) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    mensaje: `Stock insuficiente para ${detalle.producto}. Disponible: ${stockAnterior}, solicitado: ${detalle.cantidad}`
                });
            }

            // Descontar las unidades
            const inventarioActualizado = await client.query(
                `UPDATE inventario
                 SET cantidad_actual = cantidad_actual - $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE producto_id = $2
                 RETURNING cantidad_actual`,
                [detalle.cantidad, detalle.producto_id]
            );

            const stockNuevo =
                inventarioActualizado.rows[0].cantidad_actual;

            // Registrar movimiento de salida
            await client.query(
                `INSERT INTO movimientos (
                    producto_id,
                    tipo,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    motivo,
                    usuario_id
                )
                VALUES ($1, 'SALIDA', $2, $3, $4, $5, $6)`,
                [
                    detalle.producto_id,
                    detalle.cantidad,
                    stockAnterior,
                    stockNuevo,
                    `Venta #${id} - ${venta.numero_documento || "Sin documento"}`,
                    venta.usuario_id
                ]
            );
        }

        // 6. Cambiar estado de la venta
        const ventaActualizada = await client.query(
            `UPDATE ventas
             SET estado = 'CONFIRMADA'
             WHERE id = $1
             RETURNING id, estado, subtotal, impuesto, total`,
            [id]
        );

        // 7. Confirmar la transacción
        await client.query("COMMIT");

        res.json({
            mensaje: "Venta confirmada correctamente. Inventario actualizado.",
            venta: ventaActualizada.rows[0],
            productos_procesados: detalles.length
        });

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Error al confirmar venta:", error);

        res.status(500).json({
            mensaje: "Error al confirmar la venta"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});


module.exports = router;
