const db = require("../config/database");

// Create Group
exports.createGroup = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const { name, description, members } = req.body;

    if (!name) {
        return res.json({
            success: false,
            message: "Group name is required."
        });
    }

    const result = db.prepare(`
        INSERT INTO groups
        (
            name,
            description,
            created_by
        )
        VALUES
        (?, ?, ?)
    `).run(
        name,
        description || "",
        req.session.user.id
    );

    const groupId = result.lastInsertRowid;

    // Add creator as Owner
    db.prepare(`
        INSERT INTO group_members
        (
            group_id,
            user_id,
            role
        )
        VALUES
        (?, ?, ?)
    `).run(
        groupId,
        req.session.user.id,
        "Owner"
    );

    // Add selected members
    if (Array.isArray(members)) {

        const insert = db.prepare(`
            INSERT INTO group_members
            (
                group_id,
                user_id,
                role
            )
            VALUES
            (?, ?, ?)
        `);

        members.forEach(userId => {

            if (userId != req.session.user.id) {

                insert.run(
                    groupId,
                    userId,
                    "Member"
                );

            }

        });

    }

    res.json({
        success: true,
        message: "Group created successfully."
    });

};

// Get Groups
exports.getGroups = (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false
        });
    }

    const groups = db.prepare(`
        SELECT
            g.id,
            g.name,
            g.description
        FROM groups g

        INNER JOIN group_members gm
            ON gm.group_id = g.id

        WHERE gm.user_id = ?

        ORDER BY g.name
    `).all(req.session.user.id);

    res.json(groups);

};