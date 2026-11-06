
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// GET: Listar clientes activos
router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM clientes
            WHERE estado = true
            ORDER BY id DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al listar clientes:", error);
        res.status(500).json({
            mensaje: "Error al obtener los clientes"
        });
    }
});

// GET: Obtener un cliente por ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensaje: "ID de cliente inválido"
            });
        }

        const resultado = await pool.query(
            "SELECT * FROM clientes WHERE id = $1 AND estado = true",
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Cliente no encontrado"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al obtener cliente:", error);
        res.status(500).json({
            mensaje: "Error al obtener el cliente"
        });
    }
});

// POST: Registrar un cliente
router.post("/", async (req, res) => {
    try {
        const {
            nombre,
            documento,
            telefono,
            correo,
            direccion
        } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: "El nombre del cliente es obligatorio"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO clientes
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
            mensaje: "Cliente registrado correctamente",
            cliente: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al registrar cliente:", error);
        res.status(500).json({
            mensaje: "Error al registrar el cliente"
        });
    }
});

// PUT: Actualizar un cliente
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            documento,
            telefono,
            correo,
            direccion
        } = req.body;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensaje: "ID de cliente inválido"
            });
        }

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: "El nombre del cliente es obligatorio"
            });
        }

        const resultado = await pool.query(
            `UPDATE clientes
             SET nombre = $1,
                 documento = $2,
                 telefono = $3,
                 correo = $4,
                 direccion = $5
             WHERE id = $6 AND estado = true
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
            return res.status(404).json({
                mensaje: "Cliente no encontrado"
            });
        }

        res.json({
            mensaje: "Cliente actualizado correctamente",
            cliente: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar cliente:", error);
        res.status(500).json({
            mensaje: "Error al actualizar el cliente"
        });
    }
});

// DELETE: Desactivar un cliente
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensaje: "ID de cliente inválido"
            });
        }

        const resultado = await pool.query(
            `UPDATE clientes
             SET estado = false
             WHERE id = $1 AND estado = true
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Cliente no encontrado o ya desactivado"
            });
        }

        res.json({
            mensaje: "Cliente desactivado correctamente",
            cliente: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al desactivar cliente:", error);
        res.status(500).json({
            mensaje: "Error al desactivar el cliente"
        });
    }
});

module.exports = router;
