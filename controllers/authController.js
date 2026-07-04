const db = require("../config/database");
const bcrypt = require("bcrypt");

// =========================
// LOGIN
// =========================
exports.login = (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username and password are required."
        });
    }

    const user = db.prepare(
        "SELECT * FROM users WHERE username = ?"
    ).get(username);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid username or password."
        });
    }

    const validPassword = bcrypt.compareSync(
        password,
        user.password
    );

    if (!validPassword) {
        return res.status(401).json({
            success: false,
            message: "Invalid username or password."
        });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
    };

    res.json({
        success: true,
        message: "Login successful."
    });

};

// =========================
// GET LOGGED-IN USER
// =========================
exports.me = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Not logged in"
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });

};

// =========================
// LOGOUT
// =========================
exports.logout = (req, res) => {

    req.session.destroy(() => {
        res.json({
            success: true
        });
    });

};