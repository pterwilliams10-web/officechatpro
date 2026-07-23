const db = require("../config/database");

function logAudit(userId, action, details, ip) {
    try {
        db.prepare(`
            INSERT INTO audit_logs (user_id, action, details, ip_address)
            VALUES (?, ?, ?, ?)
        `).run(
            userId || null,
            action,
            details ? JSON.stringify(details) : null,
            ip || null
        );
    } catch (err) {
        console.error("Audit log error:", err.message);
    }
}

module.exports = { logAudit };
