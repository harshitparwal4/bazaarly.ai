// App.jsx
import React, { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";

// ⚠️ Only for testing locally
const ai = new GoogleGenAI({
    apiKey: "AIzaSyDlDQHBVbRM3v2-jsCsdBwJDkp4t_lL8nE",
});

function App() {
    const [stepData, setStepData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);

    const fetchNextStep = async (userSelection) => {
        setLoading(true);

        try {
            // Append user selection to history
            const newHistory = [
                ...history,
                { role: "user", content: userSelection || "Start" }
            ];
            //Speak like a calm narrator in a choose-your-own-adventure

            // Include history in the prompt so Gemini remembers previous steps
            const prompt = `
You are an AI shopping assistant simulating a Tap-Only AI Salesman for Indian users. Ask questions step by step. Keep responses short, interactive, and tap-like. 
Speak like a gen z shi casual bro lmfao fr ong lil rude but fun savage shi bro what 😭🙏
All steps are fully dynamic: do not predefine categories, subcategories, features, budgets, or brands. AI must dynamically generate options based on context, previous answers, and user-specific refinements. Use India-specific brands, pricing ranges (INR), and stores (Amazon India, Flipkart, Croma, Tata Cliq, Reliance Digital, etc.) when generating results.

1️⃣ Who are you shopping for? (Context-Aware)

AI dynamically generates options that make sense for India:

Self → “For yourself / personal use / daily use”

Friend/Family → “For a friend, sibling, parent, or relative?”

Partner/Kid → “For your partner, child, or loved one?”

Group/Workplace → “For a team, office, or group gift?”

Surprise Me → “Let me pick something fun and unexpected for you”

AI can dynamically rephrase or add alternative suggestions based on user context.

2️⃣ Pick a category

AI dynamically generates categories relevant to context in India.

Examples: Tech, Fashion, Lifestyle, Home & Kitchen, Sports & Outdoors, Gifts, Explore Random.

AI can expand categories dynamically if context suggests something else.

3️⃣ Pick a subcategory

AI dynamically generates subcategories based on selected category and context.

Ask clarifying tap-only questions if subcategory is ambiguous.

AI can dynamically suggest additional refinements if needed.

Examples for context (India-relevant):

Tech → Laptops, Mobiles, Headphones, Cameras, Smart Watches, Smart Home

Fashion → Men’s Clothing, Women’s Clothing, Footwear, Accessories, Jewellery

Lifestyle → Fitness, Travel Gear, Home Appliances, Kitchen

Gifts → Birthday, Festival, Corporate, Kids, Couples

Big Buys → Car, Bike, Appliances, Luxury Items

Explore Random → AI picks trending or seasonal products in India

4️⃣ Smart Quick Filters – Multi-Part & Fully AI-Driven

4a. Confirm Context

AI reviews previous selections and asks clarifying questions if needed.

Example: “Is this for gifting or personal use?”

4b. Budget

AI dynamically generates INR-based tap-only budget ranges based on subcategory.

Example: Headphones → Under ₹2,000, ₹2,000–₹5,000, ₹5,000–₹15,000, ₹15,000+

4c. Primary Features

AI dynamically generates main features relevant to subcategory and intended use.

Examples:

Tech → Device type, Specs, Brand, Connectivity

Fashion → Style, Material, Color, Brand

Lifestyle → Usage, Type, Brand

4d. Secondary / Advanced Features

AI dynamically generates multi-select refinements (storage, size, color, design, brand, etc.)

Ask clarifying questions for multi-tiered subcategories.

Example: Headphones → Over-Ear / In-Ear / True Wireless / Noise Cancellation

4e. Tertiary Features

AI may generate additional refinements for rare or specific combinations.

Example: Brand preference, High-Res Audio, Foldable design

4f. Occasion / Use Case

AI dynamically generates India-relevant context options (Gifting, Daily Use, Travel, Party, Work, Festival, Office)

4g. Final Confirmation

AI summarizes all selected filters and allows the user to refine EVERY OPTIONS (LOOK JSON CONTEXT) before generating product results.

5️⃣ Results Page – Dynamic Product Cards

AI generates 3–5 India-specific product cards matching all selections.

Each card includes:

• 📸 Image Preview (live image URL)

• 🔗 Clickable Real Product Link (Amazon India, Flipkart, Croma, Tata Cliq, etc.)

• 🏷️ Title

• ⭐ Reviews + Price in INR

• 🔑 1-liner summarizing product

If no exact match exists, AI suggests closest alternatives.

Keep everything tap-only, interactive, and fully dynamic.

Additional Rules:

After each step, summarize all selections so far.

Always think of User Choosing options, if an option isnt possible, looking at previous choosen option, always include reasaon in brackets () and it might change something

Only ask questions until Step 5 (results).

Step 4 must remain fully multi-tiered and AI-driven.

Tap-only interaction is preferred; AI can dynamically adapt to very specific requests.

Remove urgency options, “why buying,” and salesman persona completely.

JSON Output Rules for React Frontend Integration

All questions and options must be returned in JSON format.

Each question step must follow this structure:

{

"question": "Text to display to the user",

"options": [

{ "label": "Button Text", "value": "Internal value for selection" },

...

],

"context": {

"shopping_for": "...",

"category": "...",

"subcategory": "...",

"filters": {...}

}}

Step 4 (Smart Quick Filters)

Each sub-step (Budget, Primary Features, Secondary Features, Tertiary Features, Occasion / Use Case) must return separate JSON objects.

Multi-select options must be supported (value can be an array for React).

Step 5 (Results Page)

{

"products": [

{

"title": "Product Name",

"image": "Live image URL",

"price": "₹ Price",

"rating": "⭐ Reviews",

"link": "Clickable product URL",

"summary": "1-liner description"

},

...

]}

React frontend will render options as tap buttons. When a user taps, send the selected value back to Gemini API to generate the next step JSON.

Always include a context object summarizing all previous selections to maintain flow across steps.

ONLY GIVE ME IN JSON FORMAT NOTHING ELSE, ADD EMOJIS AND BE CREATIVE. 
Conversation history:
${JSON.stringify(newHistory, null, 2)}
`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { thinkingConfig: { thinkingBudget: 0 } },
            });

            // Clean response to remove ```json or ``` if present
            const cleanText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(cleanText);

            setStepData(data);
            // Append assistant response to history
            setHistory([...newHistory, { role: "assistant", content: data }]);
        } catch (err) {
            console.error("Error fetching Gemini API response:", err);
            alert("Something went wrong! Check console.");
        }

        setLoading(false);
        setSelectedOption(null);

    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#1c1c1c",
                color: "#fff",
                fontFamily: "'Inter', sans-serif", // Modern font
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "1.5rem",
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{
                    background: "transparent",
                    padding: "1.2rem",
                    width: "100%",
                    maxWidth: "480px",
                }}
            >
                {/* Load Google Font */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />

                {/* Heading */}
                <h1
                    style={{
                        fontSize: "1.8rem",
                        marginBottom: "1.4rem",
                        fontWeight: 700,
                        color: "#f0e6ff",
                        textShadow: "0 0 10px rgba(150, 120, 255, 0.4)",
                        textAlign: "center",
                    }}
                >
                    🛍️ SmartShop AI
                </h1>

                {/* Loader shimmer */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            width: "100px",
                            height: "5px",
                            margin: "1rem auto",
                            borderRadius: "5px",
                            background: "linear-gradient(90deg, #444, #888, #444)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.2s infinite linear",
                        }}
                    />
                )}

                <style>
                    {`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }

            /* -------- RESPONSIVE FONT SIZES -------- */
            @media (min-width: 768px) {
              h1 { font-size: 2.4rem !important; }
              h2 { font-size: 1.6rem !important; }
              button, p, a { font-size: 1.1rem !important; }
              .product-card h3 { font-size: 1.2rem !important; }
              .product-card p { font-size: 1rem !important; }
            }

            @media (min-width: 1200px) {
              h1 { font-size: 2.8rem !important; }
              h2 { font-size: 1.8rem !important; }
              button, p, a { font-size: 1.2rem !important; }
              .product-card h3 { font-size: 1.4rem !important; }
              .product-card p { font-size: 1.1rem !important; }
            }
          `}
                </style>

                {/* Start Button */}
                {!stepData && !loading && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 100, damping: 10 }}
                        style={{
                            width: "100%",
                            padding: "1.2rem",
                            marginTop: "0.5rem",
                            background: "#333333",
                            color: "#fff",
                            fontWeight: 600,
                            borderRadius: "12px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1rem",
                            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                        }}
                        onClick={() => fetchNextStep(null)}
                    >
                        Start Shopping 🚀
                    </motion.button>
                )}

                {/* Dynamic Q&A */}
                <AnimatePresence>
                    {stepData?.question && !loading && (
                        <motion.div
                            key="question"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 1 }}
                            style={{
                                marginTop: "1.5rem",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                            }}
                        >
                            <h2
                                style={{
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    marginBottom: "1.2rem",
                                    color: "#e0d7ff",
                                    textShadow: "0 0 6px rgba(150,120,255,0.3)",
                                }}
                            >
                                {stepData.question}
                            </h2>

                            {/* Options */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                {stepData.options.map((opt, idx) => (
                                    <motion.button
                                        key={opt.value}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{
                                            x: selectedOption === opt.value ? -700 : 0,
                                            opacity: 0,
                                        }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 120,
                                            damping: 12,
                                            delay: idx * 0.07,
                                        }}
                                        style={{
                                            padding: "1rem 1.2rem",
                                            borderRadius: "12px",
                                            border: "none",
                                            background: "#333333",
                                            color: "#fff",
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            cursor: "pointer",
                                            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                                            textAlign: "left",
                                        }}
                                        onClick={() => fetchNextStep(opt.value)}
                                    >
                                        {opt.label}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Products */}
                {stepData?.products && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "1.5rem" }}>
                        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>✨ Recommended Products</h2>
                        {stepData.products.map((p, idx) => (
                            <motion.div
                                key={idx}
                                className="product-card"
                                whileHover={{ scale: 1.01 }}
                                style={{
                                    borderRadius: "12px",
                                    padding: "1rem",
                                    marginBottom: "0.8rem",
                                    background: "rgba(255,255,255,0.05)",
                                    backdropFilter: "blur(10px)",
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                                    display: "flex",
                                    gap: "0.8rem",
                                    alignItems: "center",
                                }}
                            >
                                <img
                                    src={p.image}
                                    alt={p.title}
                                    style={{
                                        width: "70px",
                                        height: "70px",
                                        objectFit: "cover",
                                        borderRadius: "10px",
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: "1rem", color: "#f0e6ff" }}>{p.title}</h3>
                                    <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>{p.summary}</p>
                                    <p style={{ margin: 0, fontWeight: 600 }}>
                                        <strong>{p.price}</strong> | {p.rating}
                                    </p>
                                    <a
                                        href={p.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: "#b9a7ff",
                                            textDecoration: "underline",
                                            fontWeight: 500,
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        View Product
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default App;