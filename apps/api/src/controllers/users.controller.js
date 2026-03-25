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
        const user = await usersService.updateProfile(req.user.id, req.body);
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
    getPublicProfile,
    search,
};

