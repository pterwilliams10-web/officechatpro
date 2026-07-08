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

// Get sender role
const sender = db.prepare(`
    SELECT role
    FROM users
    WHERE id = ?
`).get(sender_id);

// Get receiver role
const receiver = db.prepare(`
    SELECT role
    FROM users
    WHERE id = ?
`).get(receiver_id);

console.log(sender.role, receiver.role);

// Decide expiry
let expires_at;

if (
    sender.role === "Admin" ||
    receiver.role === "Admin"
) {

    expires_at = db.prepare(`
        SELECT datetime('now','+60 days') AS expiry
    `).get().expiry;

} else {

    expires_at = db.prepare(`
        SELECT datetime('now','+1 minute') AS expiry
    `).get().expiry;

}

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
    file_type,
    expires_at
)
VALUES
(?, ?, ?, ?, ?, ?, ?)
`).run(
    sender_id,
    receiver_id,
    message || null,
    file_name || null,
    file_path || null,
    file_type || null,
    expires_at
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

    // Delete expired messages
db.prepare(`
    DELETE FROM messages
    WHERE expires_at IS NOT NULL
    AND expires_at <= datetime('now')
`).run();

    const messages = db.prepare(`
       SELECT *
FROM messages
WHERE
(
    (sender_id=? AND receiver_id=?)
    OR
    (sender_id=? AND receiver_id=?)
)
AND created_at >= datetime('now','-1 hour')
ORDER BY created_at ASC;
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