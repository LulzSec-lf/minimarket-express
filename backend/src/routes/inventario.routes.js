const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// ========================================
// 1. REGISTRAR ENTRADA, SALIDA O AJUSTE
// ========================================
router.post("/movimientos", async (req, res) => {
  const { producto_id, tipo, cantidad, motivo } = req.body;
  const usuario_id = req.usuario.id;

  const tiposPermitidos = ["ENTRADA", "SALIDA", "AJUSTE"];

  if (!producto_id || !tiposPermitidos.includes(tipo)) {
    return res.status(400).json({
      mensaje: "Producto y tipo de movimiento válidos son obligatorios"
    });
  }

  const cantidadNumero = Number(cantidad);

  if (
    !Number.isFinite(cantidadNumero) ||
    cantidadNumero < 0 ||
    (tipo !== "AJUSTE" && cantidadNumero === 0)
  ) {
    return res.status(400).json({
      mensaje: tipo === "AJUSTE"
        ? "La cantidad del ajuste debe ser mayor o igual a cero"
        : "La cantidad debe ser mayor que cero"
    });
  }

  const conexion = await pool.connect();

  try {
    await conexion.query("BEGIN");

    // Bloquear el inventario para evitar modificaciones simultáneas
    const inventario = await conexion.query(
      `SELECT cantidad_actual
       FROM inventario
       WHERE producto_id = $1
       FOR UPDATE`,
      [producto_id]
    );

    if (inventario.rowCount === 0) {
      await conexion.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "El producto no tiene un registro de inventario"
      });
    }

    const stockAnterior = inventario.rows[0].cantidad_actual;

    // Calcular el nuevo stock en PostgreSQL
    const actualizacion = await conexion.query(
      `UPDATE inventario
       SET cantidad_actual =
         CASE
           WHEN $2 = 'ENTRADA' THEN cantidad_actual + $3::numeric
           WHEN $2 = 'SALIDA' THEN cantidad_actual - $3::numeric
           WHEN $2 = 'AJUSTE' THEN $3::numeric
         END
       WHERE producto_id = $1
         AND (
           $2 <> 'SALIDA'
           OR cantidad_actual >= $3::numeric
         )
       RETURNING cantidad_actual`,
      [producto_id, tipo, cantidadNumero]
    );

    if (actualizacion.rowCount === 0) {
      await conexion.query("ROLLBACK");
      return res.status(400).json({
        mensaje: "No hay suficiente stock para realizar esta salida"
      });
    }

    const stockNuevo = actualizacion.rows[0].cantidad_actual;

    // En un ajuste se registra la diferencia entre el stock anterior y el nuevo
    const cantidadMovimiento = tipo === "AJUSTE"
      ? Math.abs(Number(stockNuevo) - Number(stockAnterior))
      : cantidadNumero;

    if (Number(cantidadMovimiento) === 0) {
      await conexion.query("ROLLBACK");
      return res.status(400).json({
        mensaje: "El ajuste no presenta diferencias en el inventario"
      });
    }

    // Guardar el movimiento en el historial
    const movimiento = await conexion.query(
      `INSERT INTO movimientos (
        producto_id,
        tipo,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        usuario_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        producto_id,
        tipo,
        cantidadMovimiento,
        stockAnterior,
        stockNuevo,
        motivo || null,
        usuario_id || null
      ]
    );

    await conexion.query("COMMIT");

    res.status(201).json({
      mensaje: "Movimiento registrado correctamente",
      movimiento: movimiento.rows[0]
    });

  } catch (error) {
    await conexion.query("ROLLBACK");
    console.error(error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        mensaje: "El producto o usuario indicado no existe"
      });
    }

    res.status(500).json({
      mensaje: "Error al registrar el movimiento"
    });

  } finally {
    conexion.release();
  }
});

// ========================================
// 2. CONSULTAR HISTORIAL DE MOVIMIENTOS
// ========================================
router.get("/movimientos", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        m.id,
        m.producto_id,
        p.codigo,
        p.nombre AS producto,
        m.tipo,
        m.cantidad,
        m.stock_anterior,
        m.stock_nuevo,
        m.motivo,
        m.usuario_id
      FROM movimientos m
      INNER JOIN productos p
        ON p.id = m.producto_id
      ORDER BY m.id DESC
    `);

    res.json(resultado.rows);

  } catch (error) {
    console.error("Error al consultar movimientos:", error.message);
    res.status(500).json({
      mensaje: "Error al consultar los movimientos"
    });
  }
});

module.exports = router;