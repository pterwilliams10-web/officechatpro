const db = require("../config/database");

// Send Broadcast
exports.sendBroadcast = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { message } = req.body;

if (!message || message.trim() === "") {
    return res.status(400).json({
        success:false,
        message:"Message required"
    });
}

    db.prepare(`
        INSERT INTO broadcasts
        (
            sender_id,
            sender_name,
            message
        )
        VALUES
        (?, ?, ?)
    `).run(
        req.session.user.id,
        req.session.user.full_name,
        message
    );

    res.json({
        success: true
    });

};

// Load Broadcast History
exports.getBroadcasts = (req, res) => {

    const broadcasts = db.prepare(`
        SELECT
            broadcasts.*,
            users.full_name AS sender_name
        FROM broadcasts

        JOIN users
        ON users.id = broadcasts.sender_id

        ORDER BY broadcasts.created_at DESC
    `).all();

    res.json({
        success: true,
        broadcasts
    });

};