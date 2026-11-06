
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// LISTAR PROVEEDORES ACTIVOS
router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, nombre, documento, telefono, correo, direccion, estado
            FROM proveedores
            WHERE estado = true
            ORDER BY id DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al listar proveedores:", error);
        res.status(500).json({ mensaje: "Error al obtener proveedores" });
    }
});

// CONSULTAR PROVEEDOR POR ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT id, nombre, documento, telefono, correo, direccion, estado
             FROM proveedores
             WHERE id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Proveedor no encontrado" });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al consultar proveedor:", error);
        res.status(500).json({ mensaje: "Error al consultar proveedor" });
    }
});

// REGISTRAR PROVEEDOR
router.post("/", async (req, res) => {
    try {
        const { nombre, documento, telefono, correo, direccion } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ mensaje: "El nombre es obligatorio" });
        }

        const resultado = await pool.query(
            `INSERT INTO proveedores
             (nombre, documento, telefono, correo, direccion)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                nombre.trim(),
                documento || null,
                telefono || null,
                correo || null,
                direccion || null
            ]
        );

        res.status(201).json({
            mensaje: "Proveedor registrado correctamente",
            proveedor: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al registrar proveedor:", error);
        res.status(500).json({ mensaje: "Error al registrar proveedor" });
    }
});

// ACTUALIZAR PROVEEDOR
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, documento, telefono, correo, direccion } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ mensaje: "El nombre es obligatorio" });
        }

        const resultado = await pool.query(
            `UPDATE proveedores
             SET nombre = $1,
                 documento = $2,
                 telefono = $3,
                 correo = $4,
                 direccion = $5
             WHERE id = $6
             RETURNING *`,
            [
                nombre.trim(),
                documento || null,
                telefono || null,
                correo || null,
                direccion || null,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Proveedor no encontrado" });
        }

        res.json({
            mensaje: "Proveedor actualizado correctamente",
            proveedor: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar proveedor:", error);
        res.status(500).json({ mensaje: "Error al actualizar proveedor" });
    }
});

// DESACTIVAR PROVEEDOR
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE proveedores
             SET estado = false
             WHERE id = $1 AND estado = true
             RETURNING id, nombre, estado`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Proveedor no encontrado o ya está desactivado" });
        }

        res.json({
            mensaje: "Proveedor desactivado correctamente",
            proveedor: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al desactivar proveedor:", error);
        res.status(500).json({ mensaje: "Error al desactivar proveedor" });
    }
});

module.exports = router;
