
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function verificarToken(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                mensaje: "Acceso denegado. Token no proporcionado."
            });
        }

        const token = authorization.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const usuario = await pool.query(
            "SELECT token_version, estado FROM usuarios WHERE id = $1",
            [decoded.id]
        );
        if (!usuario.rows.length || !usuario.rows[0].estado ||
            Number(usuario.rows[0].token_version) !== Number(decoded.token_version || 0)) {
            return res.status(401).json({ mensaje: "La sesión ya no es válida." });
        }
        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado."
        });
    }
}

function verificarRol(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "Debes iniciar sesión."
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: "No tienes permisos para realizar esta acción."
            });
        }

        next();
    };
}

module.exports = {
    verificarToken,
    verificarRol
};
