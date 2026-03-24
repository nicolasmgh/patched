const router = require("express").Router();
const {
    changeStatus,
    modifyReport,
    getActionLogs,
    getDashboard,
    getUsers,
    updateUserRole,
    toggleUserStatus,
    getSuggestions,
    updateSuggestionStatus,
    getPendingMedia,
    updateMediaStatus,
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
router.patch("/users/:userId/status", ...isAdmin, toggleUserStatus);
router.get("/suggestions", ...isPrivileged, getSuggestions);
router.patch(
    "/suggestions/:id/status",
    ...isPrivileged,
    updateSuggestionStatus,
);
router.get("/media/pending", ...isPrivileged, getPendingMedia);
router.patch("/media/:id/status", ...isPrivileged, updateMediaStatus);

module.exports = router;
