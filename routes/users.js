const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.get("/users", userController.getUsers);

router.get("/users/all", userController.getAllUsers);

router.post("/users/create", userController.createUser);

router.put("/users/password", userController.updatePassword);

router.put("/users/update", userController.updateUser);

router.delete("/users/delete", userController.deleteUserByUsername);

router.delete("/users/:id", userController.deleteUser);

module.exports = router;