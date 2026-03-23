const router = require("express").Router();
const { create, remove, flag } = require("../controllers/comments.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

router.post("/:reportId", authenticate, create);
router.delete("/:commentId", authenticate, remove);
router.patch(
    "/flag/:commentId",
    authenticate,
    authorize("ADMIN", "COLLABORATOR"),
    flag,
);

module.exports = router;
