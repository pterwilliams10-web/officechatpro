require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const session = require("express-session");
const { purgeExpiredMessages } = require("./utils/messageExpiry");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

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
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use(
    "/uploads",
    express.static(path.join(__dirname, "public", "uploads"))
);
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
const groupMessageRoutes = require("./routes/groupMessages");
const featureRoutes = require("./routes/features");
const profileRoutes = require("./routes/profile");
const groupFeatureRoutes = require("./routes/groupFeatures");

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/upload", uploadRoutes);
app.use("/", historyRoutes);
app.use("/", broadcastRoutes);
app.use("/", groupRoutes);
app.use("/", groupMessageRoutes);
app.use("/", featureRoutes);
app.use("/", profileRoutes);
app.use("/", groupFeatureRoutes);

io.on("connection", (socket) => {

    console.log("✅ User Connected:", socket.id);

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
        console.log("📩 Private Message:", data);

        const receiverSocketId = onlineUsers.get(data.receiver_id);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive_message", data);
        }

        socket.emit("receive_message", data);
    });

    socket.on("join_group", (groupId) => {
        socket.join("group_" + groupId);
        console.log("👥 Joined Group:", groupId);
    });

    socket.on("group_message", (data) => {
        console.log("👥 Group Message:", data);
        io.to("group_" + data.group_id).emit("receive_group_message", data);
    });

    socket.on("typing", (data) => {
        const receiverSocketId = onlineUsers.get(data.receiver_id);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("user_typing", {
                sender_id: data.sender_id,
                sender_name: data.sender_name
            });
        }
    });

    socket.on("stop_typing", (data) => {
        const receiverSocketId = onlineUsers.get(data.receiver_id);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("user_stop_typing", {
                sender_id: data.sender_id
            });
        }
    });

    socket.on("message_read", (data) => {
        const senderSocketId = onlineUsers.get(data.sender_id);

        if (senderSocketId) {
            io.to(senderSocketId).emit("message_read", {
                reader_id: data.reader_id
            });
        }
    });

    socket.on("broadcast_message", (data) => {
        io.emit("receive_broadcast", {
            sender_name: data.sender_name,
            message: data.message,
            created_at: data.created_at || new Date()
        });
    });

});

purgeExpiredMessages();
setInterval(purgeExpiredMessages, 60 * 1000);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("====================================");
    console.log(" OfficeChat Pro Server Running");
    console.log("====================================");
    console.log(`Open your browser at: http://localhost:${PORT}`);
}).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error("   Stop the old server first:");
        console.error("   netstat -ano | findstr :" + PORT);
        console.error("   Stop-Process -Id YOUR_PID -Force\n");
        process.exit(1);
    }

    throw err;
});
