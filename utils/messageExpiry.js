const db = require("../config/database");

function purgeExpiredMessages() {
    const result = db.prepare(`
        DELETE FROM messages
        WHERE expires_at IS NOT NULL
        AND expires_at <= datetime('now')
    `).run();

    if (result.changes > 0) {
        console.log(`🗑 Purged ${result.changes} expired message(s)`);
    }

    return result.changes;
}

function getExpiryDays() {
    const row = db.prepare(
        "SELECT value FROM app_settings WHERE key = 'message_expiry_days'"
    ).get();

    return row ? parseInt(row.value, 10) : 30;
}

function computeExpiresAt(senderRole, receiverRole) {
    if (senderRole === "Admin" || receiverRole === "Admin") {
        return db.prepare(`
            SELECT datetime('now', '+60 days') AS expiry
        `).get().expiry;
    }

    const days = getExpiryDays();
    const modifier = `+${days} days`;
    return db.prepare(`
        SELECT datetime('now', ?) AS expiry
    `).get(modifier).expiry;
}

module.exports = {
    purgeExpiredMessages,
    getExpiryDays,
    computeExpiresAt
};
