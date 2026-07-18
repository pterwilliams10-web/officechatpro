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

router.delete(
    "/groups/:id",
    groupController.deleteGroup
);

router.put(
    "/groups/:id",
    groupController.renameGroup
);

router.get(
    "/groups/:id",
    groupController.getGroupDetails
);

router.post(
    "/groups/add-member",
    groupController.addMember
);


module.exports = router;