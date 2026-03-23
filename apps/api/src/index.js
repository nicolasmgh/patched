const express = require("express");
const cors = require("cors");
require("dotenv/config");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", app: "UrbanPatch API", version: "1.0.0" });
});

// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));
// app.use('/api/users', require('./routes/users'))

app.listen(PORT, () => {
    console.log(`UrbanPatch API corriendo en http://localhost:${PORT}`);
});
