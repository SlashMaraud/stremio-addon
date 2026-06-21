const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://pelisflix200.cc";

const manifest = {
    id: "community.pelisflix.iframes",
    version: "1.1.0",
    name: "Pelisflix (Películas + Series)",
    description: "Addon rápido sin navegador, con soporte para series",
    resources: ["stream"],
    types: ["movie", "series"],
    catalogs: []
};

const builder = new addonBuilder(manifest);

// Buscar slug en Pelisflix
async function searchSlug(query) {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const first = $(".result-item a").first().attr("href");
    if (!first) return null;

    return first.replace(BASE_URL, "");
}

// Extraer iframe
async function getIframe(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    return $("iframe").attr("src") || null;
}

builder.defineStreamHandler(async ({ type, id }) => {
    try {
        console.log("Petición:", type, id);

        // Películas: tt1234567
        // Series: tt1234567:1:2
        const parts = id.split(":");
        const imdb = parts[0];
        const season = parts[1];
        const episode = parts[2];

        // Buscar slug en Pelisflix
        const slug = await searchSlug(imdb);
        if (!slug) return { streams: [] };

        let page;

        if (type === "movie") {
            page = `${BASE_URL}${slug}`;
        } else {
            // Para series, Pelisflix usa /episodio/
            page = `${BASE_URL}/episodio/${slug.split("/")[2]}-${season}x${episode}/`;
        }

        const iframe = await getIframe(page);
        if (!iframe) return { streams: [] };

        return {
            streams: [
                {
                    title: "Pelisflix",
                    url: iframe
                }
            ]
        };

    } catch (e) {
        console.error(e);
        return { streams: [] };
    }
});

module.exports = builder.getInterface();
