const db = require("../config/database");

// Send Message
exports.sendMessage = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const sender_id = req.session.user.id;
    const {
    receiver_id,
    message,
    file_name,
    file_path,
    file_type
} = req.body;

   if (!receiver_id) {
    return res.json({
        success: false,
        message: "Receiver is required."
    });
}

if (!message && !file_path) {
    return res.json({
        success: false,
        message: "Message or file is required."
    });
}

    db.prepare(`
INSERT INTO messages
(
    sender_id,
    receiver_id,
    message,
    file_name,
    file_path,
    file_type
)
VALUES
(?, ?, ?, ?, ?, ?)
`).run(
    sender_id,
    receiver_id,
    message || null,
    file_name || null,
    file_path || null,
    file_type || null
);

    res.json({
        success: true,
        message: "Message sent successfully."
    });

};



// Load Conversation
exports.getConversation = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const currentUser = req.session.user.id;
    const otherUser = req.params.id;

    const messages = db.prepare(`
        SELECT *
        FROM messages
        WHERE
            (sender_id=? AND receiver_id=?)
            OR
            (sender_id=? AND receiver_id=?)
        ORDER BY created_at ASC
    `).all(
        currentUser,
        otherUser,
        otherUser,
        currentUser
    );

    res.json({
        success: true,
        messages
    });

};

exports.markAsRead = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    const senderId = req.params.id;
    const receiverId = req.session.user.id;

    db.prepare(`
        UPDATE messages
        SET is_read = 1
        WHERE sender_id = ?
        AND receiver_id = ?
        AND is_read = 0
    `).run(senderId, receiverId);

    res.json({
        success: true
    });

};