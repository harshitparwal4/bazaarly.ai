const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const AMAZON_BASE = "https://www.amazon.in/s?k=";

const headers = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
};

app.get("/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    try {
        const url = `${AMAZON_BASE}${encodeURIComponent(query)}`;
        console.log(`🔍 Fetching: ${url}`);

        const { data } = await axios.get(url, { headers });

        // Check for CAPTCHA
        if (data.includes("Type the characters you see in this image")) {
            console.log("⚠️ Amazon returned CAPTCHA page!");
            return res.status(403).json({ error: "Blocked by Amazon CAPTCHA" });
        }

        const $ = cheerio.load(data);

        const products = [];

        $("div[data-component-type='s-search-result']").each((i, el) => {
            let title =
                $(el).find("h2 span").first().text().trim() ||
                $(el).find("h2").attr("aria-label") ||
                "No title";


            let link = $(el).find("a.a-link-normal").attr("href");
            if (link && !link.startsWith("https")) {
                link = `https://www.amazon.in${link.split("?")[0]}`;
            }

            const image = $(el).find("img.s-image").attr("src");
            const price = $(el)
                .find("span.a-price > span.a-offscreen")
                .first()
                .text()
                .trim();
            const rating = $(el).find("span.a-icon-alt").first().text().trim();

            if (link && !link.startsWith("https")) {
                link = `https://www.amazon.in${link.split("/ref")[0]}`;
            }

            console.log(`\n📦 Product ${i + 1}`);
            console.log("   Title:", title);
            console.log("   Price:", price);
            console.log("   Rating:", rating);
            console.log("   Image:", image);
            console.log("   Link:", link);

            if (title && link && image) {
                products.push({
                    title,
                    price: price || "Not Available",
                    rating: rating || "No ratings",
                    image,
                    link,
                });
            }
        });

        console.log(`\n🎯 Final Products Extracted: ${products.length}`);
        res.json({ products: products.slice(0, 10) });
    } catch (err) {
        console.error("❌ Error while scraping:", err.message);
        res.status(500).json({ error: "Amazon scraping failed" });
    }
});

app.listen(PORT, () =>
    console.log(`🚀 Amazon Scraper API running on http://localhost:${PORT}`)
);
