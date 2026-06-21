const { addonBuilder } = require("stremio-addon-sdk");
const puppeteer = require("puppeteer-core");

const BASE = "https://pelisflix200.cc";
const CHROME_PATH = "/usr/bin/google-chrome";

const manifest = {
    id: "community.pelisflix200.bypass.v3",
    version: "7.1.0",
    name: "Pelisflix200 (Bypass core)",
    description: "Scraper con puppeteer-core + bypass de anuncios para pelisflix200.cc",
    resources: ["stream", "catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [
        { type: "movie", id: "pelisflix-movies", name: "Pelisflix Movies" },
        { type: "series", id: "pelisflix-series", name: "Pelisflix Series" }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => ({
    metas: [
        {
            id: "tt11378946",
            type: "movie",
            name: "Michael (Test)",
            poster: "https://via.placeholder.com/300x450?text=Pelisflix200"
        }
    ]
}));

async function buscarPorTitulo(titulo) {
    const url = `${BASE}/?s=${encodeURIComponent(titulo)}`;
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(/href="(https:\/\/pelisflix200\.cc\/pelicula\/[^"]+)"/);
    return match ? match[1] : null;
}

async function obtenerM3U8(url) {
    console.log("Lanzando navegador con puppeteer-core...");

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-popup-blocking"
        ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", req => {
        const blocked = ["doubleclick", "googlesyndication", "ads", "popunder"];
        if (blocked.some(b => req.url().includes(b))) req.abort();
        else req.continue();
    });

    browser.on("targetcreated", async target => {
        if (target.type() === "page") {
            const popup = await target.page();
            await popup.close();
        }
    });

    let m3u8 = null;

    page.on("request", req => {
        const u = req.url();
        if (u.includes(".m3u8")) {
            console.log("M3U8 detectado:", u);
            m3u8 = u;
        }
    });

    await page.goto(url, { waitUntil: "networkidle2" });

    try {
        await page.click("button, .vjs-big-play-button, .play");
        await page.waitForTimeout(6000);
    } catch (e) {
        console.log("No se pudo hacer clic:", e);
    }

    await browser.close();
    return m3u8;
}

builder.defineStreamHandler(async ({ type, id, extra }) => {
    try {
        const titulo = extra?.name;
        if (!titulo) return { streams: [] };

        const slugUrl = await buscarPorTitulo(titulo);
        if (!slugUrl) return { streams: [] };

        const m3u8 = await obtenerM3U8(slugUrl);
        if (!m3u8) return { streams: [] };

        return {
            streams: [
                {
                    title: "Pelisflix200 HD (Bypass core)",
                    url: m3u8
                }
            ]
        };
    } catch (err) {
        console.log("ERROR STREAM:", err);
        return { streams: [] };
    }
});

module.exports = {
    manifest,
    get: builder.getInterface().get
};
