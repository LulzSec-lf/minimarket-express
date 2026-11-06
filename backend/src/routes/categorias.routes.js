const express = require("express");
const router = express.Router();
const pool = require("../config/database");

const {
  verificarToken,
  verificarRol
} = require("../middlewares/auth.middleware");

// =====================================
// 1. LISTAR TODAS LAS CATEGORÍAS
// =====================================
router.get(
  "/",
  verificarToken,
  verificarRol("ADMIN", "CAJERO", "ALMACENISTA"),
  async (req, res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          id,
          nombre,
          descripcion,
          estado,
          created_at
        FROM categorias
        ORDER BY id ASC
      `);

      res.json(resultado.rows);

    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        mensaje: "Error al consultar las categorías"
      });
    }
  }
);

// =====================================
// 2. BUSCAR CATEGORÍA POR ID
// =====================================
router.get(
  "/:id",
  verificarToken,
  verificarRol("ADMIN", "CAJERO", "ALMACENISTA"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const resultado = await pool.query(
        `SELECT id, nombre, descripcion, estado, created_at
         FROM categorias
         WHERE id = $1`,
        [id]
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          mensaje: "Categoría no encontrada"
        });
      }

      res.json(resultado.rows[0]);

    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        mensaje: "Error al buscar la categoría"
      });
    }
  }
);

// =====================================
// 3. REGISTRAR CATEGORÍA
// =====================================
router.post(
  "/",
  verificarToken,
  verificarRol("ADMIN"),
  async (req, res) => {
    try {
      const { nombre, descripcion } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          mensaje: "El nombre de la categoría es obligatorio"
        });
      }

      const resultado = await pool.query(
        `INSERT INTO categorias (nombre, descripcion)
         VALUES ($1, $2)
         RETURNING *`,
        [
          nombre.trim(),
          descripcion?.trim() || null
        ]
      );

      res.status(201).json({
        mensaje: "Categoría registrada correctamente",
        categoria: resultado.rows[0]
      });

    } catch (error) {
      console.error(error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          mensaje: "La categoría ya existe"
        });
      }

      res.status(500).json({
        mensaje: "Error al registrar la categoría"
      });
    }
  }
);

// =====================================
// 4. ACTUALIZAR CATEGORÍA
// =====================================
router.put(
  "/:id",
  verificarToken,
  verificarRol("ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          mensaje: "El nombre de la categoría es obligatorio"
        });
      }

      const resultado = await pool.query(
        `UPDATE categorias
         SET nombre = $1,
             descripcion = $2
         WHERE id = $3
         RETURNING *`,
        [
          nombre.trim(),
          descripcion?.trim() || null,
          id
        ]
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          mensaje: "Categoría no encontrada"
        });
      }

      res.json({
        mensaje: "Categoría actualizada correctamente",
        categoria: resultado.rows[0]
      });

    } catch (error) {
      console.error(error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          mensaje: "Ya existe una categoría con ese nombre"
        });
      }

      res.status(500).json({
        mensaje: "Error al actualizar la categoría"
      });
    }
  }
);

// =====================================
// 5. DESACTIVAR CATEGORÍA
// =====================================
router.delete(
  "/:id",
  verificarToken,
  verificarRol("ADMIN"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `UPDATE categorias
         SET estado = false
         WHERE id = $1 AND estado = true
         RETURNING id, nombre, estado`,
        [req.params.id]
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          mensaje: "Categoría no encontrada o ya desactivada"
        });
      }

      res.json({
        mensaje: "Categoría desactivada correctamente",
        categoria: resultado.rows[0]
      });

    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        mensaje: "Error al desactivar la categoría"
      });
    }
  }
);

module.exports = router;