const db = require("../config/database");
const bcrypt = require("bcrypt");

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