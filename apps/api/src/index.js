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

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", app: "UrbanPatch API", version: "1.0.0" });
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
    console.log(`UrbanPatch API corriendo en http://localhost:${PORT}`);
});
