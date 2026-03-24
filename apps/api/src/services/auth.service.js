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

    if (!user.active) {
        // Revisar si tiene una apelación para darle el estado correcto al frontend
        const existingAppeal = await prisma.reportSuggestion.findFirst({
            where: {
                userId: user.id,
                reason: "BAN_APPEAL",
                status: {
                    in: ["PENDING", "REVIEWED", "REJECTED"],
                },
            },
        });

        const error = new Error(
            "Tu cuenta ha sido deshabilitada por faltas a nuestra política de convivencia.",
        );
        error.statusCode = 403;
        error.appealStatus = existingAppeal ? existingAppeal.status : null;
        throw error;
    }

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

const appeal = async ({ email, message }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("No encontramos un usuario con ese email");

    if (user.active) throw new Error("Tu cuenta no está baneada");

    // Revisar si tiene una apelación pendiente (PENDING) o rechazada (REJECTED) o leída y no aceptada (REVIEWED)
    const existingAppeal = await prisma.reportSuggestion.findFirst({
        where: {
            userId: user.id,
            reason: "BAN_APPEAL",
            status: {
                in: ["PENDING", "REVIEWED", "REJECTED"],
            },
        },
    });

    if (existingAppeal) {
        if (existingAppeal.status === "PENDING") {
            throw new Error("Ya tienes una apelación pendiente de revisión.");
        } else {
            throw new Error(
                "Tu apelación anterior fue denegada o ya se encuentra bajo análisis. No podés enviar otra.",
            );
        }
    }

    await prisma.reportSuggestion.create({
        data: {
            userId: user.id,
            reason: "BAN_APPEAL",
            message: message,
        },
    });

    return true;
};

module.exports = { register, login, appeal };
