
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { verificarToken } = require("../middlewares/auth.middleware");

// POST: Iniciar sesión
router.post("/login", async (req, res) => {
    try {
        const { correo, password } = req.body || {};

        // Validar datos
        if (!correo || !password) {
            return res.status(400).json({
                mensaje: "Correo y contraseña son obligatorios"
            });
        }

        // Buscar usuario activo y su rol
        const resultado = await pool.query(
            `SELECT
                u.id,
                u.nombre,
                u.correo,
                u.password_hash,
                u.rol_id,
                r.nombre AS rol
             FROM usuarios u
             INNER JOIN roles r ON r.id = u.rol_id
             WHERE LOWER(u.correo) = LOWER($1)
               AND u.estado = true
               AND r.estado = true`,
            [correo.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const usuario = resultado.rows[0];

        // Comparar contraseña con el hash almacenado
        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        // Verificar configuración JWT
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET no está configurado");
        }

        // Generar token
        const token = jwt.sign(
            {
                id: usuario.id,
                rol_id: usuario.rol_id,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
        );

        // Actualizar último acceso
        await pool.query(
            `UPDATE usuarios
             SET ultimo_acceso = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [usuario.id]
        );

        // Responder sin revelar el hash
        res.json({
            mensaje: "Inicio de sesión correcto",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol_id: usuario.rol_id,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error en login:", error);

        res.status(500).json({
            mensaje: "Error interno al iniciar sesión"
        });
    }
});

// GET: Consultar perfil del usuario autenticado
router.get("/perfil", verificarToken, (req, res) => {
    res.json({
        mensaje: "Acceso autorizado",
        usuario: req.usuario
    });
});
module.exports = router;
