const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv/config");

const app = express();
const server = http.createServer(app);
const io = require("./utils/socket").init(server);

const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Rate limiter general y restrictivo para reportes (Anti-Abuso)
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 requests por IP cada 15 min
    message:
        "Demasiadas peticiones desde esta IP, por favor intenta nuevamente más tarde.",
});
app.use("/api/", apiLimiter);

// Limiter mas estricto solo para reportes (Anti-SPAM)
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // 20 reportes por hora
    message: "Has superado el límite de reportes por hora.",
});

// Limiter para comentarios (Anti-SPAM)
const commentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 30, // 30 comentarios cada 15 seg/min => No, pongamos 30 cada 15 min. Es bastante.
    message: "Estás comentando demasiado rápido. Espera un momento.",
});

// Limiter para registro de usuarios (Anti-SPAM bots)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000 * 24, // 24 horas
    max: 10, // máximo 10 cuentas por IP al día
    message:
        "Demasiadas cuentas creadas desde esta IP, por favor intenta mañana.",
});

app.use("/api/reports", (req, res, next) => {
    if (req.method === "POST") {
        return reportLimiter(req, res, next);
    }
    next();
});

app.use("/api/reports/:id/comments", (req, res, next) => {
    if (req.method === "POST") {
        return commentLimiter(req, res, next);
    }
    next();
});

app.use("/api/auth/register", registerLimiter);

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", app: "Patched API", version: "1.0.0" });
});

// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/media", require("./routes/media"));
app.use("/api/interactions", require("./routes/interactions"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/users", require("./routes/users"));

server.listen(PORT, () => {
    console.log(`Patched API corriendo en http://localhost:${PORT}`);
});
