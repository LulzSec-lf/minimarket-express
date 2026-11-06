
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/database");

async function crearAdmin() {
    try {
        const nombre = process.env.ADMIN_NAME?.trim();
        const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD;

        // Validar los datos necesarios
        if (!nombre || !correo || !password) {
            throw new Error(
                "Faltan ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD en el archivo .env"
            );
        }

        if (password.length < 12) {
            throw new Error(
                "La contraseña debe tener al menos 12 caracteres"
            );
        }

        // Comprobar que el rol ADMIN existe y está activo
        const rol = await pool.query(
            "SELECT id FROM roles WHERE id = 1 AND estado = true"
        );

        if (rol.rows.length === 0) {
            throw new Error("No existe un rol ADMIN activo");
        }

        // Evitar crear otro administrador si ya existe uno
        const adminExistente = await pool.query(
            "SELECT id FROM usuarios WHERE rol_id = 1 LIMIT 1"
        );

        if (adminExistente.rows.length > 0) {
            throw new Error("Ya existe un administrador. No se creó otro.");
        }

        // Evitar correos duplicados
        const correoExistente = await pool.query(
            "SELECT id FROM usuarios WHERE correo = $1",
            [correo]
        );

        if (correoExistente.rows.length > 0) {
            throw new Error("Ese correo ya está registrado");
        }

        // Generar hash seguro de la contraseña
        const passwordHash = await bcrypt.hash(password, 12);

        // Registrar el primer administrador
        const resultado = await pool.query(
            `INSERT INTO usuarios
                (nombre, correo, password_hash, rol_id)
             VALUES ($1, $2, $3, 1)
             RETURNING id, nombre, correo, rol_id, estado, created_at`,
            [nombre, correo, passwordHash]
        );

        console.log("Administrador creado correctamente:");
        console.log(resultado.rows[0]);

    } catch (error) {
        console.error("Error:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

crearAdmin();
