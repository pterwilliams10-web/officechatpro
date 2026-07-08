const db = require("../config/database");

function requireAdmin(req, res) {
    if (!req.session.user) {
        res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
        return false;
    }

    if (req.session.user.role !== "Admin") {
        res.status(403).json({
            success: false,
            message: "Access denied."
        });
        return false;
    }

    return true;
}

exports.createGroup = (req, res) => {
    if (!requireAdmin(req, res)) return;

    const name = (req.body.name || "").trim();
    const memberIds = Array.isArray(req.body.member_ids)
        ? req.body.member_ids.map(Number).filter(Boolean)
        : [];

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Group name is required."
        });
    }

    if (memberIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Select at least one group member."
        });
    }

    const create = db.transaction(() => {
        const result = db.prepare(`
            INSERT INTO chat_groups (name, created_by)
            VALUES (?, ?)
        `).run(name, req.session.user.id);

        const addMember = db.prepare(`
            INSERT OR IGNORE INTO chat_group_members (group_id, user_id)
            VALUES (?, ?)
        `);

        memberIds.forEach(userId => {
            addMember.run(result.lastInsertRowid, userId);
        });

        return result.lastInsertRowid;
    });

    const groupId = create();

    res.json({
        success: true,
        message: "Group created successfully.",
        group_id: groupId
    });
};

exports.getGroups = (req, res) => {
    if (!requireAdmin(req, res)) return;

    const groups = db.prepare(`
        SELECT
            chat_groups.id,
            chat_groups.name,
            chat_groups.created_at,
            users.full_name AS created_by_name,
            COUNT(chat_group_members.user_id) AS member_count,
            GROUP_CONCAT(member_users.full_name, ', ') AS members
        FROM chat_groups
        JOIN users
            ON users.id = chat_groups.created_by
        LEFT JOIN chat_group_members
            ON chat_group_members.group_id = chat_groups.id
        LEFT JOIN users member_users
            ON member_users.id = chat_group_members.user_id
        GROUP BY chat_groups.id
        ORDER BY chat_groups.created_at DESC
    `).all();

    res.json({
        success: true,
        groups
    });
};
