const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");

const BASE_URL = "https://pelisflix200.fit";

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

const headers = {
    "User-Agent": "Mozilla/5.0",
    "Referer": BASE_URL
};

/* ------------------------------
   BÚSQUEDA PARA PELÍCULAS
--------------------------------*/

async function buscarPelicula(titulo) {
    const url = `${BASE_URL}/?s=${encodeURIComponent(titulo)}`;
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);

    let link = null;
    $("a[href]").each((i, el) => {
        const href = $(el).attr("href");
        if (href && (href.includes("/pelicula/") || href.includes("/serie/"))) {
            link = href.startsWith("http") ? href : BASE_URL + href;
            return false;
        }
    });

    return link;
}

/* ------------------------------
   BÚSQUEDA PARA SERIES (EPISODIOS)
--------------------------------*/

async function buscarEpisodio(titulo, season, episode) {
    const query = `${titulo} temporada ${season} episodio ${episode}`;
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);

    let link = null;
    $("a[href]").each((i, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        if (href.includes("/episodio/") || href.includes("/capitulo/")) {
            link = href.startsWith("http") ? href : BASE_URL + href;
            return false;
        }

        if (!link && href.includes("/serie/")) {
            link = href.startsWith("http") ? href : BASE_URL + href;
        }
    });

    return link;
}

/* ------------------------------
   EXTRACCIÓN DE IFRAME
--------------------------------*/

async function extraerIframe(url) {
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);

    let iframe = $("iframe").attr("src") || $("iframe").attr("data-src");
    if (!iframe) return null;

    if (!iframe.startsWith("http")) {
        iframe = new URL(iframe, url).href;
    }

    return iframe;
}

/* ------------------------------
   RESOLVERS DE HOSTERS
--------------------------------*/

async function resolverFilemoon(url) {
    const res = await axios.get(url, { headers });
    const match = res.data.match(/file:"(.*?)"/);
    return match ? match[1] : null;
}

async function resolverStreamtape(url) {
    const res = await axios.get(url, { headers });
    const match = res.data.match(/robotlink'\)\.innerHTML = '(.*?)'/);
    if (!match) return null;

    return "https:" + match[1].replace(/\\\//g, "/");
}

async function resolverUqload(url) {
    const res = await axios.get(url, { headers });
    const match = res.data.match(/sources:\s*\[\{file:"(.*?)"/);
    return match ? match[1] : null;
}

async function resolverHoster(url) {
    if (url.includes("filemoon")) return await resolverFilemoon(url);
    if (url.includes("streamtape")) return await resolverStreamtape(url);
    if (url.includes("uqload")) return await resolverUqload(url);

    return null;
}

/* ------------------------------
   HANDLER PRINCIPAL (PELIS + SERIES)
--------------------------------*/

builder.defineStreamHandler(async ({ id, type }) => {
    const parts = id.split(":");
    const imdbId = parts[0];
    const season = parts[1];
    const episode = parts[2];

    const meta = await axios.get(
        `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`
    );

    const titulo = meta.data.meta.name;

    let urlContenido = null;

    if (type === "movie") {
        urlContenido = await buscarPelicula(titulo);
    } else if (type === "series") {
        if (!season || !episode) {
            return { streams: [] };
        }
        urlContenido = await buscarEpisodio(titulo, season, episode);
    }

    if (!urlContenido) return { streams: [] };

    const iframe = await extraerIframe(urlContenido);
    if (!iframe) return { streams: [] };

    const stream = await resolverHoster(iframe);
    if (!stream) return { streams: [] };

    const nombreTipo = type === "movie" ? "Pelisflix (Peli)" : "Pelisflix (Serie)";

    return {
        streams: [
            {
                name: nombreTipo,
                title: "▶️ Reproductor Principal",
                url: stream,
                behaviorHints: { notWebReady: false }
            }
        ]
    };
});

/* ------------------------------
   SERVIDOR HTTP PARA RAILWAY
--------------------------------*/

const PORT = process.env.PORT || 3000;
const router = getRouter(builder.getInterface());

http.createServer((req, res) => {
    router(req, res, () => {
        res.writeHead(404);
        res.end();
    });
}).listen(PORT, () => {
    console.log("Servidor Railway activo en puerto", PORT);
});
