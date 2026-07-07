const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");

const databaseFolder = path.join(__dirname, "..");

const dbPath = path.join(databaseFolder, "officechat.db");

const db = new Database(dbPath);

console.log("SQLite database connected");


// ============================
// USERS TABLE
// ============================

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();


// ============================
// MESSAGES TABLE
// ============================

db.prepare(`
CREATE TABLE IF NOT EXISTS messages (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sender_id INTEGER NOT NULL,

    receiver_id INTEGER NOT NULL,

    message TEXT,

    file_name TEXT,

    file_path TEXT,

    file_type TEXT,

    is_read INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(sender_id) REFERENCES users(id),

    FOREIGN KEY(receiver_id) REFERENCES users(id)

)
`).run();


// ============================
// ANNOUNCEMENTS TABLE
// ============================

db.prepare(`
CREATE TABLE IF NOT EXISTS announcements (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL,

    message TEXT,

    created_by INTEGER NOT NULL,

    is_pinned INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(created_by) REFERENCES users(id)

)
`).run();


// ============================
// CREATE DEFAULT ADMIN
// ============================

const admin = db.prepare(
    "SELECT * FROM users WHERE username = ?"
).get("admin");


if (!admin) {

    const hash = bcrypt.hashSync("admin123", 10);

    db.prepare(`
        INSERT INTO users
        (full_name, username, password, role)
        VALUES (?, ?, ?, ?)
    `).run(
        "System Administrator",
        "admin",
        hash,
        "Admin"
    );

    console.log("✅ Default Admin Created");

}



// ============================
// BROADCASTS TABLE
// ============================

db.prepare(`
CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

module.exports = db;