const express = require("express");
const puppeteer = require("puppeteer-extra");
const fs = require("fs"); // add this at the top
const cors = require("cors");  // <--- import cors


const MAX_ITEMS = 15;
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
            headless: 'chrome',  // ✅ headless mode ON
            args: [
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080', // ✅ Force big resolution
                '--start-maximized'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });

    }
    async handleCaptcha(page) {
        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            const captcha = await page.$('#captcha-form');
            if (!captcha) return false; // ✅ no captcha → continue scraping

            console.warn(`⚠️ CAPTCHA detected! Attempt ${attempt + 1}/${MAX_RETRIES}`);
            attempt++;
        }

        // If we reach here → captcha didn't clear
        console.error("❌ CAPTCHA still present after retries.");
        return true; // ✅ signal caller to restart browser
    }

    async goToGoogleAndSearch(page, query) {
        // 1. Set custom user agent (mimic a real Chrome browser)
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
        );

        // 2. Set custom timezone, locale, and geolocation for stealth
        await page.emulateTimezone("Asia/Kolkata"); // Change if you want
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(Intl.DateTimeFormat.prototype, "resolvedOptions", {
                value: () => ({
                    timeZone: "Asia/Kolkata",
                    locale: "en-US",
                    calendar: "gregory",
                    numberingSystem: "latn",
                }),
            });
        });

        // 3. Set languages
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "languages", {
                get: () => ["en-US", "en"],
            });
        });

        // 4. Random viewport sizes to avoid detection
        const width = 1920 + Math.floor(Math.random() * 100);
        const height = 1080 + Math.floor(Math.random() * 100);
        await page.setViewport({ width, height });

        // 5. Add small random delays to mimic human interaction
        const humanDelay = async (min = 50, max = 150) => {
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            await new Promise(res => setTimeout(res, delay));
        };

        console.log("🌐 Going to Google homepage...");
        await page.goto("https://www.google.com", { waitUntil: "networkidle2" });
        await humanDelay(500, 1500);

        // 6. Handle consent popup if present
        try {
            const consentButton = await page.$("form:nth-of-type(2) button span");
            if (consentButton) {
                await consentButton.click();
                console.log("✅ Consent accepted");
                await page.waitForTimeout(1500);
            }
        } catch {
            console.log("ℹ️ No consent popup found");
        }

        // 7. Navigate directly to Shopping results URL
        const shoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
        console.log(`🔎 Navigating to Shopping URL: ${shoppingUrl}`);
        await page.goto(shoppingUrl, { waitUntil: "networkidle2" });
        await humanDelay(800, 2000);

        // 8. Handle captcha if any
        // 8. Handle captcha
        const hasCaptcha = await this.handleCaptcha(page);
        if (hasCaptcha) {
            throw new Error("CAPTCHA_BLOCKED");
        }

        // 9. Wait for shopping cards to load
        await page.waitForSelector('[jsname="dQK82e"], [jsname="Nhy0ad"]', { timeout: 20000 });
        console.log("✅ Shopping results loaded!");
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        await page.waitForSelector('[jsname="dQK82e"], [jsname="Nhy0ad"]', { timeout: 20000 });
        const cards = await page.$$('[jsname="dQK82e"], [jsname="Nhy0ad"]');
        const results = [];

        for (const div of cards.slice(0, MAX_ITEMS)) {
            const oid = await div.evaluate(el => el.getAttribute("data-oid"));
            if (!oid) continue;

            const panelSelector = `div[data-mltuid='${oid}']`;

            // Retry logic
            let panel = null;
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    console.log(`➡️ Clicking card ${oid}, attempt ${attempt}...`);
                    await div.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                    await div.click();
                    await this.sleep(1000); // allow JS to render panel
                    panel = await page.$(panelSelector);
                    if (panel) {
                        console.log(`✅ Panel found for card ${oid} on attempt ${attempt}`);
                        break;
                    } else {
                        console.log(`⚠️ Panel not found yet, retrying...`);
                    }
                } catch (err) {
                    console.warn(`⚠️ Error on attempt ${attempt}:`, err.message);
                }
                await this.sleep(2000); // wait before retry
            }


            if (!panel) {
                console.warn(`❌ Failed to find panel for card ${oid}, skipping.`);
                continue;
            }

            const basicData = await this.getBasicDataFromNjFjte(div);

            // Get website + price info for each seller in the panel
            const sellers = await this.getSellerInfo(panel);
            const image = await this.getImageFromPanel(panel);

            results.push({
                ...basicData,
                sellers,
                image,
            });
        }

        return results;
    }


    async scrape(query) {
        let browser, page;
        const MAX_BROWSER_RESTARTS = 10;

        for (let attempt = 1; attempt <= MAX_BROWSER_RESTARTS; attempt++) {
            try {
                browser = await this.initBrowser();
                page = await browser.newPage();
                await page.setUserAgent(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
                );

                console.log(`🔄 Scraping attempt ${attempt}...`);
                await this.goToGoogleAndSearch(page, query);

                // ✅ Dump HTML for debugging
                const html = await page.content();
                fs.writeFileSync("headless_dump.html", html);

                // ✅ Return scraped items
                return await this.scrapeItems(page);

            } catch (err) {
                if (err.message === "CAPTCHA_BLOCKED") {
                    console.warn(`⚠️ Captcha blocked us! Restarting Chrome... (${attempt}/${MAX_BROWSER_RESTARTS})`);
                    if (browser) await browser.close();
                    await new Promise(res => setTimeout(res, 5000)); // small cooldown before retry
                    continue;
                }
                console.error("❌ Unexpected error:", err);
                return [];
            } finally {
                if (browser) await browser.close().catch(() => { });
            }
        }

        console.error("❌ Failed after multiple browser restarts. Giving up.");
        return [];
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
app.listen(PORT, () => console.log(`🔥 Scraping Server running at http://localhost:${PORT}`));
