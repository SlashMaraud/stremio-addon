const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "community.pelisflix200.bypass.v3",
    version: "7.1.0",
    name: "Pelisflix200 (Bypass core)",
    description: "Scraper Pelisflix200 con bypass sin puppeteer",
    resources: ["stream", "catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [
        { type: "movie", id: "pelisflix-movies", name: "Pelisflix Movies" },
        { type: "series", id: "pelisflix-series", name: "Pelisflix Series" }
    ]
};

const builder = new addonBuilder(manifest);

// 🔥 BYPASS REAL DEL ANUNCIO SIN PUPPETEER
async function scrape(imdbId) {
    const url = `https://pelisflix200.cc/pelicula/${imdbId}`;

    const html = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    }).then(r => r.data);

    const $ = cheerio.load(html);

    // 1) Buscar el iframe real (el que aparece DESPUÉS del anuncio)
    const iframe = $("iframe[src*='embed'], iframe[src*='player'], iframe[src*='stream']").attr("src");

    if (!iframe) {
        console.log("No se encontró iframe");
        return [];
    }

    // 2) Cargar el iframe real
    const embedHtml = await axios.get(iframe, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    }).then(r => r.data);

    const $2 = cheerio.load(embedHtml);

    // 3) Buscar el .m3u8 dentro del reproductor
    let m3u8 = "";

    $2("script").each((i, el) => {
        const content = $2(el).html() || "";
        if (content.includes(".m3u8")) {
            const match = content.match(/https?:\/\/[^"']+\.m3u8/);
            if (match) m3u8 = match[0];
        }
    });

    if (!m3u8) {
        console.log("No se encontró m3u8");
        return [];
    }

    return [
        {
            name: "Pelisflix200",
            title: "Pelisflix200",
            url: m3u8
        }
    ];
}

// STREAM HANDLER
builder.defineStreamHandler(async ({ id }) => {
    console.log("Solicitando streams para:", id);

    const streams = await scrape(id);

    return { streams };
});

// CATÁLOGO VACÍO (NECESARIO)
builder.defineCatalogHandler(() => {
    return { metas: [] };
});

module.exports = {
    manifest,
    get: builder.getInterface()
};
