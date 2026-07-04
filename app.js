require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const session = require("express-session");

require("./config/database");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

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

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", messageRoutes);

io.on("connection", (socket) => {

    console.log("✅ User Connected:", socket.id);

    // attach user later
    socket.on("register", (user) => {
        socket.user = user;
        console.log("👤 Registered:", user.username);
    });

    socket.on("disconnect", () => {
        console.log("❌ User Disconnected:", socket.id);
    });

    socket.on("send_message", (data) => {

    console.log("📩 Message received:", data);

    // broadcast to all users
    socket.broadcast.emit("receive_message", data);

});
});

const PORT = process.env.PORT || 3000;


server.listen(PORT, () => {

    console.log("====================================");
    console.log(" OfficeChat Pro Server Running");
    console.log("====================================");
    console.log(`Open your browser at: http://localhost:${PORT}`);

});