const router = require("express").Router();
const {
    confirm,
    unconfirm,
    follow,
    unfollow,
    voteComment,
} = require("../controllers/interactions.controller");

const { authenticate } = require("../middlewares/auth.middleware");

router.post("/confirm/:reportId", authenticate, confirm);
router.delete("/confirm/:reportId", authenticate, unconfirm);
router.post("/follow/:reportId", authenticate, follow);
router.delete("/follow/:reportId", authenticate, unfollow);
router.post("/vote/:commentId", authenticate, voteComment);

module.exports = router;
