const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Login
router.post("/login", authController.login);

router.get("/me", authController.me);

// Logged in user
router.get("/auth/me", authController.me);

// Logout
router.get("/auth/logout", authController.logout);

module.exports = router;