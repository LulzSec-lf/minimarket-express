
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

const {
    verificarToken,
    verificarRol
} = require("../middlewares/auth.middleware");

// =====================================
// 1. OBTENER TODOS LOS PRODUCTOS
// =====================================
router.get("/", verificarToken, verificarRol("ADMIN", "CAJERO", "ALMACENISTA"), async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.id,
        p.codigo,
        p.codigo_barras,
        p.nombre,
        p.descripcion,
        p.categoria_id,
        c.nombre AS categoria,
        p.imagen_url,
        p.unidad_medida,
        p.precio_compra,
        p.precio_venta,
        p.estado,
        COALESCE(i.cantidad_actual, 0) AS stock,
        COALESCE(i.stock_minimo, 0) AS stock_minimo
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN inventario i ON i.producto_id = p.id
      ORDER BY p.id DESC;
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ mensaje: "Error al consultar productos" });
  }
});

// =====================================
// 2. BUSCAR PRODUCTO POR ID
// =====================================
router.get("/:id", verificarToken, verificarRol("ADMIN", "CAJERO", "ALMACENISTA"), async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT p.*, c.nombre AS categoria,
              COALESCE(i.cantidad_actual, 0) AS stock,
              COALESCE(i.stock_minimo, 0) AS stock_minimo
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.id = $1`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ mensaje: "Error al buscar producto" });
  }
});

// =====================================
// 3. REGISTRAR PRODUCTO
// =====================================
router.post("/", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), async (req, res) => {
  const {
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    categoria_id,
    imagen_url,
    unidad_medida = "unidad",
    precio_compra = 0,
    precio_venta = 0,
    stock_minimo = 0,
    stock_inicial = 0
  } = req.body;

  if (!codigo || !nombre) {
    return res.status(400).json({
      mensaje: "El código y el nombre son obligatorios"
    });
  }

  if (
    !Number.isFinite(Number(precio_compra)) ||
    !Number.isFinite(Number(precio_venta)) ||
    !Number.isFinite(Number(stock_minimo)) ||
    !Number.isFinite(Number(stock_inicial)) ||
    Number(precio_compra) < 0 ||
    Number(precio_venta) < 0 ||
    Number(stock_minimo) < 0 ||
    Number(stock_inicial) < 0
  ) {
    return res.status(400).json({
      mensaje: "Los precios y el stock mínimo deben ser números válidos y no negativos"
    });
  }

  const conexion = await pool.connect();

  try {
    await conexion.query("BEGIN");

    const resultado = await conexion.query(
      `INSERT INTO productos (
        codigo,
        codigo_barras,
        nombre,
        descripcion,
        categoria_id,
        imagen_url,
        unidad_medida,
        precio_compra,
        precio_venta
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        codigo,
        codigo_barras || null,
        nombre,
        descripcion || null,
        categoria_id || null,
        imagen_url || null,
        unidad_medida,
        precio_compra,
        precio_venta
      ]
    );

    const producto = resultado.rows[0];

    await conexion.query(
      `INSERT INTO inventario (
        producto_id,
        cantidad_actual,
        stock_minimo
      )
      VALUES ($1, 0, $2)`,
      [producto.id, stock_minimo]
    );

    if (Number(stock_inicial) > 0) {
      await conexion.query(
        `UPDATE inventario
         SET cantidad_actual = $1
         WHERE producto_id = $2`,
        [stock_inicial, producto.id]
      );
    }

    await conexion.query("COMMIT");

    res.status(201).json({
      mensaje: "Producto registrado correctamente",
      producto
    });
  } catch (error) {
    await conexion.query("ROLLBACK");
    console.error(error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "El código o código de barras ya existe"
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        mensaje: "La categoría indicada no existe"
      });
    }

    res.status(500).json({
      mensaje: "Error al registrar producto"
    });
  } finally {
    conexion.release();
  }
});

// =====================================
// 4. ACTUALIZAR PRODUCTO
// =====================================
router.put("/:id", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), async (req, res) => {
  const { id } = req.params;

  const {
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    categoria_id,
    imagen_url,
    unidad_medida,
    precio_compra,
    precio_venta,
    stock_minimo
  } = req.body;

  if (!codigo || !nombre) {
    return res.status(400).json({
      mensaje: "El código y el nombre son obligatorios"
    });
  }

  if (
    !Number.isFinite(Number(precio_compra)) ||
    !Number.isFinite(Number(precio_venta)) ||
    (stock_minimo !== undefined &&
      (!Number.isFinite(Number(stock_minimo)) || Number(stock_minimo) < 0)) ||
    Number(precio_compra) < 0 ||
    Number(precio_venta) < 0
  ) {
    return res.status(400).json({
      mensaje: "Los precios y el stock mínimo deben ser números válidos y no negativos"
    });
  }

  const conexion = await pool.connect();

  try {
    await conexion.query("BEGIN");

    const resultado = await conexion.query(
      `UPDATE productos SET
        codigo = $1,
        codigo_barras = $2,
        nombre = $3,
        descripcion = $4,
        categoria_id = $5,
        imagen_url = $6,
        unidad_medida = $7,
        precio_compra = $8,
        precio_venta = $9
      WHERE id = $10
      RETURNING *`,
      [
        codigo,
        codigo_barras || null,
        nombre,
        descripcion || null,
        categoria_id || null,
        imagen_url || null,
        unidad_medida || "unidad",
        precio_compra,
        precio_venta,
        id
      ]
    );

    if (resultado.rowCount === 0) {
      await conexion.query("ROLLBACK");
      return res.status(404).json({
        mensaje: "Producto no encontrado"
      });
    }

    if (stock_minimo !== undefined) {
      await conexion.query(
        `UPDATE inventario
         SET stock_minimo = $1
         WHERE producto_id = $2`,
        [stock_minimo, id]
      );
    }

    await conexion.query("COMMIT");

    res.json({
      mensaje: "Producto actualizado correctamente",
      producto: resultado.rows[0]
    });
  } catch (error) {
    await conexion.query("ROLLBACK");
    console.error(error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "El código o código de barras ya existe"
      });
    }

    res.status(500).json({
      mensaje: "Error al actualizar producto"
    });
  } finally {
    conexion.release();
  }
});

// =====================================
// 5. DESACTIVAR PRODUCTO
// =====================================
router.delete("/:id", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), async (req, res) => {
  try {
    const resultado = await pool.query(
      `UPDATE productos
       SET estado = false
       WHERE id = $1 AND estado = true
       RETURNING id, nombre, estado`,
      [req.params.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado o ya desactivado"
      });
    }

    res.json({
      mensaje: "Producto desactivado correctamente",
      producto: resultado.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      mensaje: "Error al desactivar producto"
    });
  }
});

module.exports = router;
