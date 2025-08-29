const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs"); // add this at the top
const cors = require("cors");  // <--- import cors

puppeteer.use(StealthPlugin());

const MAX_ITEMS = 3;
const BASE_URL = "https://www.google.com/search?tbm=shop&q=";
const PORT = 5001;

class ShoppingItem {
    constructor({ title, price, delivery, review, urls }) {
        this.title = title;
        this.price = price;
        this.delivery = delivery;
        this.review = review;
        this.urls = urls;
    }
}

class GoogleShoppingScraper {
    async initBrowser() {
        console.log("🚀 Launching Chrome...");
        return puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
        });
    }

    async handleCaptcha(page) {
        const MAX_RETRIES = 5;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                const captcha = await page.$('#captcha-form');
                if (!captcha) break; // no captcha, exit
                console.warn(`⚠️ CAPTCHA detected, waiting 10s to auto continue... (Attempt ${attempt + 1})`);
                await page.waitForTimeout(10000); // wait 10s and retry
                attempt++;
            } catch {
                break; // selector not found, break
            }
        }
    }


    async acceptConsent(page, query) {
        const url = `${BASE_URL}${encodeURIComponent(query)}`;
        await page.goto(url, { waitUntil: "networkidle2" });

        await this.handleCaptcha(page); // auto wait if captcha

        // optional consent click
        try {
            const consentButton = await page.$("form:nth-of-type(2) button span");
            if (consentButton) {
                await consentButton.click();
                console.log("✅ Consent accepted");
                await page.waitForSelector("[jsname='dQK82e']", { timeout: 15000 }); // wait for main cards
            }
        } catch { }

        // final check: wait for cards to appear
        await page.waitForSelector("[jsname='dQK82e']", { timeout: 15000 });
    }

    async getBasicDataFromNjFjte(cardDiv) {
        const innerDiv = await cardDiv.$("div.njFjte[jsname='ZvZkAe']");
        if (!innerDiv) return {};

        const ariaLabel = await innerDiv.evaluate(el => el.getAttribute("aria-label"));
        if (!ariaLabel) return {};

        const titleMatch = ariaLabel.match(/^(.+?)\./);
        const priceMatch = ariaLabel.match(/Current price: ([^.]*)\./);
        const deliveryMatch = ariaLabel.match(/Free delivery|Delivery: ([^.]*)\./);
        const reviewMatch = ariaLabel.match(/Rated ([^ ]+) out of 5/);

        return {
            title: titleMatch ? titleMatch[1] : null,
            price: priceMatch ? priceMatch[1] : null,
            delivery: deliveryMatch ? (deliveryMatch[0].includes("Free") ? "Free" : deliveryMatch[1]) : null,
            review: reviewMatch ? reviewMatch[1] : null
        };
    }

    async getSellerInfo(panel) {
        // panel = div[data-mltuid='${oid}']
        const sellers = await panel.$$eval("div[jsname='uwagwf']", divs =>
            divs.map(div => {
                const link = div.querySelector("a");
                const url = link?.href || null;

                const website = div.querySelector(".hP4iBf")?.textContent?.trim() || null;

                const price = div.querySelector("span[aria-label^='Current price:']")?.textContent?.trim() || null;

                return { url, website, price };
            }).filter(s => s.url && s.price && s.website)
        );

        return sellers;
    }

    async clickAndFetchUrls(div, page) {
        const oid = await div.evaluate(el => el.getAttribute("data-oid"));
        if (!oid) return [];

        const panelSelector = `div[data-mltuid='${oid}']`;

        await div.evaluate(el => el.scrollIntoView({ behavior: "smooth", block: "center" }));
        await div.click().catch(() => { });

        await page.waitForSelector(panelSelector, { timeout: 5000 });
        await this.handleCaptcha(page);

        const urls = await page.$$eval(`${panelSelector} a`, anchors =>
            anchors
                .map(a => a.href)
                .filter(href => {
                    if (!href) return false;
                    if (href.includes("youtube.com")) return false;
                    if (href.includes("reddit.com")) return false;
                    if (href.includes("forums.")) return false;
                    if (href.includes("google.com")) return false;
                    if (href.includes("webcache")) return false;
                    return true;
                })
        );

        const uniqueUrls = [...new Set(urls)];
        return uniqueUrls;
    }
    async getImageFromPanel(panel) {
        try {
            const imgHandle = await panel.$("img.KfAt4d");
            if (!imgHandle) return null;
            const src = await imgHandle.evaluate(img => img.src);
            return src || null;
        } catch {
            return null;
        }
    }


    async scrapeItems(page) {
        await page.waitForSelector("[jsname='dQK82e']", { timeout: 15000 });
        const cards = await page.$$("[jsname='dQK82e']");
        const results = [];

        for (const div of cards.slice(0, MAX_ITEMS)) {
            const oid = await div.evaluate(el => el.getAttribute("data-oid"));
            if (!oid) continue;

            const panelSelector = `div[data-mltuid='${oid}']`;
            await div.click().catch(() => { });
            await page.waitForSelector(panelSelector, { timeout: 5000 });

            const panel = await page.$(panelSelector);
            if (!panel) continue;

            const basicData = await this.getBasicDataFromNjFjte(div);



            // ✅ Get website + price info for each seller in the panel
            const sellers = await this.getSellerInfo(panel);
            const image = await this.getImageFromPanel(panel);

            results.push({
                ...basicData,
                sellers,
                image, // new field for image URL
            });

        }

        return results;
    }


    async scrape(query) {
        const browser = await this.initBrowser();
        const page = await browser.newPage();

        try {
            await this.acceptConsent(page, query);
            return await this.scrapeItems(page);
        } catch (err) {
            console.error(err);
            return [];
        } finally {
            //await browser.close();
        }
    }
}

// Express server
const app = express();
app.use(cors());                        // ✅ allow all origins (or restrict to frontend)

const scraper = new GoogleShoppingScraper();

app.get("/api/shopping", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Missing search query" });

    const data = await scraper.scrape(query);

    // Save to JSON file
    try {
        fs.writeFileSync("shopping_results.json", JSON.stringify(data, null, 2));
        console.log("✅ Saved results to shopping_results.json");
    } catch (err) {
        console.error("Failed to save JSON:", err);
    }

    res.json(data);
});
app.listen(PORT, () => console.log(`🔥 Server running at http://localhost:${PORT}`));
