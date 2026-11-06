
const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
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
