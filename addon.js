const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://pelisflix200.cc";

const manifest = {
    id: "org.pelisflix200",
    version: "1.0.0",
    name: "Pelisflix 200",
    description: "Addon actualizado para Pelisflix200.cc",
    catalogs: [],
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["pelisflix:"]
};

const builder = new addonBuilder(manifest);

async function getIframeSrc(pageUrl) {
    const { data } = await axios.get(pageUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    const $ = cheerio.load(data);
    const iframeSrc = $("iframe").first().attr("src");

    if (!iframeSrc) return null;

    if (iframeSrc.startsWith("//")) return "https:" + iframeSrc;
    if (iframeSrc.startsWith("/")) return BASE_URL + iframeSrc;

    return iframeSrc;
}

builder.defineStreamHandler(async ({ type, id }) => {
    try {
        const cleanId = id.replace("pelisflix:", "");
        let pageUrl;

        if (type === "movie") {
            pageUrl = `${BASE_URL}/pelicula/${cleanId}/`;
        } else if (type === "series") {
            pageUrl = `${BASE_URL}/episodio/${cleanId}/`;
        } else {
            return { streams: [] };
        }

        const iframeSrc = await getIframeSrc(pageUrl);
        if (!iframeSrc) return { streams: [] };

        return {
            streams: [
                {
                    title: "Pelisflix 200",
                    url: iframeSrc
                }
            ]
        };

    } catch (err) {
        console.error(err);
        return { streams: [] };
    }
});

module.exports = builder.getInterface();

