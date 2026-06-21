const express = require("express");
const addon = require("./addon");

const app = express();

// ✅ CORS para permitir instalación desde Stremio
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

// ✅ Manifest accesible desde varias rutas
app.get(["/", "/manifest.json", "/manifest-v3.json"], (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(addon.manifest);
});

// ✅ Catálogo vacío (Stremio lo necesita para activar el addon)
app.get("/catalog/:type/:id.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send({ metas: [] });
});

// ✅ Streams
app.get("/:resource/:type/:id.json", async (req, res) => {
    try {
        const response = await addon.get(req.params);
        res.setHeader("Content-Type", "application/json");
        res.send(response);
    } catch (err) {
        console.error("Error en handler:", err);
        res.status(500).send({ error: "Error interno del servidor" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Servidor Railway activo en puerto " + PORT);
});

// ✅ KEEP-ALIVE para evitar que Railway apague el contenedor
setInterval(() => {
    fetch("https://stremio-addon-production-f53e.up.railway.app/manifest-v3.json")
        .then(() => console.log("Keep-alive ping enviado"))
        .catch(() => console.log("Keep-alive falló"));
}, 5 * 60 * 1000); // cada 5 minutos
