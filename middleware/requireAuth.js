function requireAuth(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    next();

}

function requireAdmin(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    if (req.session.user.role !== "Admin") {

        return res.status(403).json({
            success: false,
            message: "Admins only."
        });

    }

    next();

}

module.exports = {
    requireAuth,
    requireAdmin
};