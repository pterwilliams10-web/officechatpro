const express = require("express");
const router = express.Router();

const groupController = require("../controllers/groupController");

router.post(
    "/groups/create",
    groupController.createGroup
);

router.get(
    "/groups",
    groupController.getGroups
);

// ⭐ Put this FIRST
router.delete(
    "/groups/remove-member",
    groupController.removeMember
);

router.post(
    "/groups/add-member",
    groupController.addMember
);

router.get(
    "/groups/:id",
    groupController.getGroupDetails
);

router.put(
    "/groups/:id",
    groupController.renameGroup
);

router.delete(
    "/groups/:id",
    groupController.deleteGroup
);

module.exports = router;