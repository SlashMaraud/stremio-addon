const express = require("express");
const addon = require("./addon");

const app = express();

// ✅ Manifest accesible desde cualquier ruta
app.get(["/", "/manifest.json", "/manifest-v3.json"], (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(addon.manifest);
});

// ✅ Rutas para catálogo y streams
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

