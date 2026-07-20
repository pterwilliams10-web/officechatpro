const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.get("/me", userController.getCurrentUser);

router.get("/users", userController.getUsers);

router.get("/users/all", userController.getAllUsers);

router.post("/users/create", userController.createUser);

router.put("/users/password", userController.updatePassword);

router.put("/users/update", userController.updateUser);

router.put(
    "/admin/reset-password",
    userController.adminResetPassword
);

router.delete("/users/delete", userController.deleteUserByUsername);

router.delete("/users/:id", userController.deleteUser);

module.exports = router;