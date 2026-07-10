require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const session = require("express-session");
const db = require("./config/database");


const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// ===============================
// Online Users
// ===============================
const onlineUsers = new Map();

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);
app.use(compression());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
    "/bootstrap",
    express.static(path.join(__dirname, "node_modules", "bootstrap", "dist"))
);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "admin.html"));
});

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/uploadRoutes");
const historyRoutes = require("./routes/history");
const broadcastRoutes = require("./routes/broadcast");
const groupRoutes = require("./routes/groups");
const groupMessageRoutes =
require("./routes/groupMessages");

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/upload", uploadRoutes);
app.use("/", historyRoutes);
app.use("/", broadcastRoutes);
app.use("/", groupRoutes);
app.use("/", groupMessageRoutes);

io.on("connection", (socket) => {

    console.log("✅ User Connected:", socket.id);

    // attach user later
    socket.on("register", (user) => {

    socket.user = user;

    onlineUsers.set(user.id, socket.id);

    console.log("🟢 Online:", user.full_name);

    io.emit("online_users", Array.from(onlineUsers.keys()));

});

    socket.on("disconnect", () => {

    if (socket.user) {

        onlineUsers.delete(socket.user.id);

        console.log("🔴 Offline:", socket.user.full_name);

        io.emit("online_users", Array.from(onlineUsers.keys()));

    }

});
    socket.on("send_message", (data) => {

    console.log("📩 Message received:", data);

    // broadcast to all users
    socket.broadcast.emit("receive_message", data);

});

// Inside your io.on("connection", (socket) => { ... }) block:
socket.on("broadcast_message", (data) => {
    // Sends the payload to every single active client connected online
    io.emit("receive_broadcast", {
        sender_name: data.sender_name,
        message: data.message,
        created_at: data.created_at || new Date()
    });
});
});

const PORT = process.env.PORT || 3000;


server.listen(PORT, () => {

    console.log("====================================");
    console.log(" OfficeChat Pro Server Running");
    console.log("====================================");
    console.log(`Open your browser at: http://localhost:${PORT}`);

});

