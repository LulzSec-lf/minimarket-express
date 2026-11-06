
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { verificarToken } = require("../middlewares/auth.middleware");
const { rateLimit } = require("express-rate-limit");
const { registrarAuditoria } = require("../utils/audit");
const { failedLoginState } = require("../utils/security");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { mensaje: "Demasiados intentos. Espera unos minutos e inténtalo nuevamente." }
});

// POST: Iniciar sesión
router.post("/login", loginLimiter, async (req, res) => {
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
                r.nombre AS rol,
                u.intentos_fallidos,
                u.bloqueado_hasta,
                u.token_version
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
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            return res.status(423).json({
                mensaje: "La cuenta está temporalmente bloqueada. Intenta nuevamente más tarde."
            });
        }

        // Comparar contraseña con el hash almacenado
        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            const { attempts, blockedUntil: bloqueadoHasta } = failedLoginState(usuario.intentos_fallidos);
            await pool.query(
                `UPDATE usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3`,
                [attempts, bloqueadoHasta, usuario.id]
            );
            await registrarAuditoria({
                usuarioId: usuario.id,
                accion: "LOGIN_FALLIDO",
                entidad: "usuarios",
                entidadId: usuario.id,
                detalles: { bloqueada: Boolean(bloqueadoHasta) },
                ip: req.ip
            });
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
                rol: usuario.rol,
                token_version: usuario.token_version
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
        );

        // Actualizar último acceso
        await pool.query(
            `UPDATE usuarios
             SET ultimo_acceso = CURRENT_TIMESTAMP,
                 intentos_fallidos = 0,
                 bloqueado_hasta = NULL
             WHERE id = $1`,
            [usuario.id]
        );
        await registrarAuditoria({
            usuarioId: usuario.id,
            accion: "LOGIN_CORRECTO",
            entidad: "usuarios",
            entidadId: usuario.id,
            ip: req.ip
        });

        // Responder sin revelar el hash
        res.json({
            mensaje: "Inicio de sesión correcto",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol_id: usuario.rol_id,
                rol: usuario.rol,
                token_version: usuario.token_version
            }
        });

        router.post("/logout", verificarToken, async (req, res) => {
            try {
                await pool.query("UPDATE usuarios SET token_version = token_version + 1 WHERE id = $1", [req.usuario.id]);
                await registrarAuditoria({
                    usuarioId: req.usuario.id,
                    accion: "LOGOUT",
                    entidad: "usuarios",
                    entidadId: req.usuario.id,
                    ip: req.ip
                });
                res.json({ mensaje: "Sesión cerrada correctamente" });
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                res.status(500).json({ mensaje: "No se pudo cerrar la sesión" });
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
