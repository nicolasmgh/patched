const router = require("express").Router();
const {
    changeStatus,
    modifyReport,
    getActionLogs,
    getDashboard,
    getUsers,
    updateUserRole,
    getSuggestions,
    updateSuggestionStatus,
} = require("../controllers/admin.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const isPrivileged = [authenticate, authorize("ADMIN", "COLLABORATOR")];
const isAdmin = [authenticate, authorize("ADMIN")];

router.patch("/reports/:reportId/status", ...isPrivileged, changeStatus);
router.patch("/reports/:reportId", ...isPrivileged, modifyReport);
router.get("/logs", ...isAdmin, getActionLogs);
router.get("/dashboard", ...isPrivileged, getDashboard);
router.get("/users", ...isAdmin, getUsers);
router.patch("/users/:userId/role", ...isAdmin, updateUserRole);
router.get("/suggestions", ...isPrivileged, getSuggestions);
router.patch(
    "/suggestions/:id/status",
    ...isPrivileged,
    updateSuggestionStatus,
);

module.exports = router;
