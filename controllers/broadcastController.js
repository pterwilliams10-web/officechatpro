const db = require("../config/database");

// Save a broadcast
exports.sendBroadcast = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { message } = req.body;

    if (!message || message.trim() === "") {
        return res.json({
            success: false,
            message: "Broadcast message is required."
        });
    }

    db.prepare(`
        INSERT INTO broadcasts
        (
            sender_id,
            sender_name,
            message
        )
        VALUES (?, ?, ?)
    `).run(
        req.session.user.id,
        req.session.user.full_name,
        message
    );

    res.json({
        success: true,
        message: "Broadcast sent."
    });

};

// Load broadcasts (last 24 hours)
exports.getBroadcasts = (req, res) => {

    // Remove broadcasts older than 24 hours
    db.prepare(`
        DELETE FROM broadcasts
        WHERE created_at < datetime('now','-1 day')
    `).run();

    const broadcasts = db.prepare(`
        SELECT *
        FROM broadcasts
        ORDER BY created_at DESC
    `).all();

    res.json({
        success: true,
        broadcasts
    });

};