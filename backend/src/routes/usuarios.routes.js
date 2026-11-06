
const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const pool = require("../config/database");

const {
    verificarToken,
    verificarRol
} = require("../middlewares/auth.middleware");

// GET: Listar usuarios (solo ADMIN)
router.get(
    "/",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nombre,
                    u.correo,
                    u.rol_id,
                    r.nombre AS rol,
                    u.estado,
                    u.ultimo_acceso,
                    u.created_at
                 FROM usuarios u
                 INNER JOIN roles r ON r.id = u.rol_id
                 ORDER BY u.id ASC`
            );

            return res.json({
                mensaje: "Usuarios obtenidos correctamente",
                total: resultado.rows.length,
                usuarios: resultado.rows
            });

        } catch (error) {
            console.error("Error al listar usuarios:", error);

            return res.status(500).json({
                mensaje: "Error interno al consultar usuarios"
            });
        }
    }
);


// GET: Consultar un usuario por ID (solo ADMIN)
router.get(
    "/:id",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const usuarioId = Number(req.params.id);

            if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({
                    mensaje: "ID de usuario no válido"
                });
            }

            const resultado = await pool.query(
                `SELECT
                    u.id,
                    u.nombre,
                    u.correo,
                    u.rol_id,
                    r.nombre AS rol,
                    u.estado,
                    u.ultimo_acceso,
                    u.created_at
                 FROM usuarios u
                 INNER JOIN roles r ON r.id = u.rol_id
                 WHERE u.id = $1`,
                [usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado"
                });
            }

            return res.json({
                mensaje: "Usuario obtenido correctamente",
                usuario: resultado.rows[0]
            });

        } catch (error) {
            console.error("Error al consultar usuario:", error);

            return res.status(500).json({
                mensaje: "Error interno al consultar usuario"
            });
        }
    }
);


// POST: Crear un nuevo usuario (solo ADMIN)
router.post(
    "/",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const {
                nombre,
                correo,
                password,
                rol_id
            } = req.body || {};

            if (!nombre || !correo || !password || !rol_id) {
                return res.status(400).json({
                    mensaje: "Todos los campos son obligatorios"
                });
            }

            if (
                typeof nombre !== "string" ||
                typeof correo !== "string" ||
                typeof password !== "string"
            ) {
                return res.status(400).json({
                    mensaje: "Los datos enviados no son válidos"
                });
            }

            const nombreLimpio = nombre.trim();
            const correoLimpio = correo.trim().toLowerCase();
            const rolId = Number(rol_id);

            if (!nombreLimpio || !correoLimpio) {
                return res.status(400).json({
                    mensaje: "Nombre y correo no pueden estar vacíos"
                });
            }

            if (!Number.isSafeInteger(rolId) || rolId <= 0) {
                return res.status(400).json({
                    mensaje: "El rol seleccionado no es válido"
                });
            }

            if (password.length < 12) {
                return res.status(400).json({
                    mensaje: "La contraseña debe tener al menos 12 caracteres"
                });
            }

            const rol = await pool.query(
                `SELECT id, nombre
                 FROM roles
                 WHERE id = $1 AND estado = true`,
                [rolId]
            );

            if (rol.rows.length === 0) {
                return res.status(400).json({
                    mensaje: "El rol no existe o está desactivado"
                });
            }

            const usuarioExistente = await pool.query(
                `SELECT id
                 FROM usuarios
                 WHERE LOWER(correo) = LOWER($1)`,
                [correoLimpio]
            );

            if (usuarioExistente.rows.length > 0) {
                return res.status(409).json({
                    mensaje: "El correo ya está registrado"
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const resultado = await pool.query(
                `INSERT INTO usuarios (
                    nombre,
                    correo,
                    password_hash,
                    rol_id
                )
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id,
                    nombre,
                    correo,
                    rol_id,
                    estado,
                    created_at`,
                [
                    nombreLimpio,
                    correoLimpio,
                    passwordHash,
                    rolId
                ]
            );

            return res.status(201).json({
                mensaje: "Usuario creado correctamente",
                usuario: resultado.rows[0]
            });

        } catch (error) {
            console.error("Error al crear usuario:", error);

            return res.status(500).json({
                mensaje: "Error interno al crear usuario"
            });
        }
    }
);

// PUT: Actualizar datos de un usuario (solo ADMIN)
router.put(
    "/:id",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const usuarioId = Number(req.params.id);

            const {
                nombre,
                correo,
                rol_id,
                estado
            } = req.body || {};

            if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({
                    mensaje: "ID de usuario no válido"
                });
            }

            if (
                typeof nombre !== "string" ||
                typeof correo !== "string" ||
                typeof estado !== "boolean"
            ) {
                return res.status(400).json({
                    mensaje: "Nombre, correo y estado son obligatorios y deben ser válidos"
                });
            }

            const nombreLimpio = nombre.trim();
            const correoLimpio = correo.trim().toLowerCase();
            const rolId = Number(rol_id);

            if (!nombreLimpio || !correoLimpio) {
                return res.status(400).json({
                    mensaje: "Nombre y correo no pueden estar vacíos"
                });
            }

            if (!Number.isSafeInteger(rolId) || rolId <= 0) {
                return res.status(400).json({
                    mensaje: "El rol seleccionado no es válido"
                });
            }

            const rol = await pool.query(
                `SELECT id
                 FROM roles
                 WHERE id = $1 AND estado = true`,
                [rolId]
            );

            if (rol.rows.length === 0) {
                return res.status(400).json({
                    mensaje: "El rol no existe o está desactivado"
                });
            }

            const correoExistente = await pool.query(
                `SELECT id
                 FROM usuarios
                 WHERE LOWER(correo) = LOWER($1)
                   AND id <> $2`,
                [correoLimpio, usuarioId]
            );

            if (correoExistente.rows.length > 0) {
                return res.status(409).json({
                    mensaje: "El correo ya está registrado por otro usuario"
                });
            }

            const resultado = await pool.query(
                `UPDATE usuarios
                 SET nombre = $1,
                     correo = $2,
                     rol_id = $3,
                     estado = $4
                 WHERE id = $5
                 RETURNING
                    id,
                    nombre,
                    correo,
                    rol_id,
                    estado,
                    created_at`,
                [
                    nombreLimpio,
                    correoLimpio,
                    rolId,
                    estado,
                    usuarioId
                ]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado"
                });
            }

            return res.json({
                mensaje: "Usuario actualizado correctamente",
                usuario: resultado.rows[0]
            });

        } catch (error) {
            console.error("Error al actualizar usuario:", error);

            return res.status(500).json({
                mensaje: "Error interno al actualizar usuario"
            });
        }
    }
);


// PUT: Cambiar contraseña de un usuario (solo ADMIN)

 // PATCH: Activar o desactivar usuario (solo ADMIN)
router.patch(
    "/:id/estado",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const usuarioId = Number(req.params.id);
            const { estado } = req.body || {};

            if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({
                    mensaje: "ID de usuario no válido"
                });
            }

            if (typeof estado !== "boolean") {
                return res.status(400).json({
                    mensaje: "El estado debe ser true o false"
                });
            }

            const resultado = await pool.query(
                `UPDATE usuarios
                 SET estado = $1
                 WHERE id = $2
                 RETURNING id, nombre, correo, rol_id, estado`,
                [estado, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado"
                });
            }

            return res.json({
                mensaje: estado
                    ? "Usuario activado correctamente"
                    : "Usuario desactivado correctamente",
                usuario: resultado.rows[0]
            });

        } catch (error) {
            console.error("Error al cambiar estado del usuario:", error);

            return res.status(500).json({
                mensaje: "Error interno al cambiar estado del usuario"
            });
        }
    }
);


router.put(
    "/:id/password",
    verificarToken,
    verificarRol("ADMIN"),
    async (req, res) => {
        try {
            const usuarioId = Number(req.params.id);
            const { password } = req.body || {};

            if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
                return res.status(400).json({
                    mensaje: "ID de usuario no válido"
                });
            }

            if (
                typeof password !== "string" ||
                password.length < 12
            ) {
                return res.status(400).json({
                    mensaje: "La contraseña debe tener al menos 12 caracteres"
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const resultado = await pool.query(
                `UPDATE usuarios
                 SET password_hash = $1
                 WHERE id = $2
                   AND estado = true
                 RETURNING id, nombre, correo, rol_id`,
                [passwordHash, usuarioId]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado o inactivo"
                });
            }

            return res.json({
                mensaje: "Contraseña actualizada correctamente",
                usuario: resultado.rows[0]
            });

        } catch (error) {
            console.error("Error al cambiar contraseña:", error);

            return res.status(500).json({
                mensaje: "Error interno al cambiar contraseña"
            });
        }
    }
);


module.exports = router;
