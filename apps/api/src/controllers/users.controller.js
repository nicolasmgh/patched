const usersService = require("../services/users.service");

const getMyProfile = async (req, res) => {
    try {
        const user = await usersService.getProfile(req.user.id);
        res.status(200).json({ ok: true, user });
    } catch (err) {
        res.status(404).json({ ok: false, message: err.message });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.file) {
            data.avatarUrl = `/uploads/avatar/${req.file.filename}`;
        } else if (data.removeAvatar === "true" || data.removeAvatar === true) {
            data.avatarUrl = null;
        }

        // Manejar el parseo de booleanos si viene de FormData
        if (typeof data.hideLastName === "string") {
            data.hideLastName = data.hideLastName === "true";
        }

        const user = await usersService.updateProfile(req.user.id, data);
        res.status(200).json({ ok: true, user });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const getNotifications = async (req, res) => {
    try {
        const notifications = await usersService.getNotifications(req.user.id);
        res.status(200).json({ ok: true, notifications });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const markNotificationsRead = async (req, res) => {
    try {
        const result = await usersService.markNotificationsRead(req.user.id);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const result = await usersService.markNotificationRead(
            req.user.id,
            req.params.id,
        );
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

const getPublicProfile = async (req, res) => {
    try {
        const user = await usersService.getPublicProfile(req.params.userId);
        res.status(200).json({ ok: true, user });
    } catch (err) {
        res.status(404).json({ ok: false, message: err.message });
    }
};

const search = async (req, res) => {
    try {
        const users = await usersService.searchUsers(req.query.q);
        res.status(200).json({ ok: true, users });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    getNotifications,
    markNotificationsRead,
    markNotificationRead,
    getPublicProfile,
    search,
};
