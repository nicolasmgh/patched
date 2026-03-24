const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const register = async ({
    email,
    password,
    firstName,
    lastName,
    city,
    province,
}) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("El email ya está registrado");

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashed,
            firstName,
            lastName,
            city: city || null,
            province: province || null,
        },
    });

    return sanitize(user);
};

const login = async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Credenciales inválidas");
    if (!user.active) throw new Error("Usuario desactivado");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Credenciales inválidas");

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
    );

    return { token, user: sanitize(user) };
};

// Nunca devolver el password al frontend
const sanitize = (user) => {
    const { password, ...rest } = user;
    return rest;
};

module.exports = { register, login };
