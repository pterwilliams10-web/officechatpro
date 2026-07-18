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



exports.deleteGroup = (req, res) => {

    try {

        const db = require("../config/database");

        const groupId = req.params.id;

        db.prepare("DELETE FROM group_members WHERE group_id = ?")
          .run(groupId);

        db.prepare("DELETE FROM groups WHERE id = ?")
          .run(groupId);

        res.json({
            success: true,
            message: "Group deleted successfully."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to delete group."
        });

    }

};

exports.renameGroup = (req, res) => {

    try {

        const { name, description } = req.body;
        const groupId = req.params.id;

        db.prepare(`
            UPDATE groups
            SET
                name = ?,
                description = ?
            WHERE id = ?
        `).run(
            name,
            description,
            groupId
        );

        res.json({
            success: true,
            message: "Group updated successfully."
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to update group."
        });

    }

};
exports.getGroupDetails = (req, res) => {

    try {

        const groupId = req.params.id;

        const group = db.prepare(`
            SELECT *
            FROM groups
            WHERE id = ?
        `).get(groupId);

        const members = db.prepare(`
            SELECT
                users.id,
                users.full_name,
                group_members.role
            FROM group_members
            JOIN users
                ON users.id = group_members.user_id
            WHERE group_members.group_id = ?
            ORDER BY users.full_name
        `).all(groupId);

        res.json({
            success: true,
            group,
            members
        });

    } catch(err){

        console.error(err);

        res.status(500).json({
            success:false
        });

    }

};

exports.addMember = (req, res) => {

    try {

        const { group_id, user_id } = req.body;

        const exists = db.prepare(`
            SELECT *
            FROM group_members
            WHERE group_id = ?
            AND user_id = ?
        `).get(group_id, user_id);

        if (exists) {

            return res.json({
                success: false,
                message: "User already belongs to this group."
            });

        }

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
            group_id,
            user_id,
            "Member"
        );

        res.json({
            success: true,
            message: "Member added successfully."
        });

    } catch(err){

        console.error(err);

        res.status(500).json({
            success:false,
            message:"Unable to add member."
        });

    }

};


