const router = require("express").Router();
const {
    changeStatus,
    modifyReport,
    getActionLogs,
    getDashboard,
} = require("../controllers/admin.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const isPrivileged = [authenticate, authorize("ADMIN", "COLLABORATOR")];
const isAdmin = [authenticate, authorize("ADMIN")];

router.patch("/reports/:reportId/status", ...isPrivileged, changeStatus);
router.patch("/reports/:reportId", ...isPrivileged, modifyReport);
router.get("/logs", ...isAdmin, getActionLogs);
router.get("/dashboard", ...isPrivileged, getDashboard);

module.exports = router;
