const authService = require("../services/auth.service");

const register = async (req, res) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({ ok: true, user });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
};

const login = async (req, res) => {
    try {
        const data = await authService.login(req.body);
        res.status(200).json({ ok: true, ...data });
    } catch (err) {
        res.status(401).json({ ok: false, message: err.message });
    }
};

module.exports = { register, login };
