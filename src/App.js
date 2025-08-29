// App.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ⚠️ Only for testing locally


function App() {
  const [stepData, setStepData] = useState(null);
  const [loadingStage, setLoadingStage] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const fetchProductsFromBackend = async (searchQuery, context) => {
    if (!searchQuery) return;
    setLoadingStage("searching"); // 🔍 Initial stage

    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    try {
      console.log("➡️ Fetching backend products for query:", searchQuery);

      // 1️⃣ Fetch products from backend with retry
      let backendProducts;
      setLoadingStage("fetching-backend"); // 📦 Backend fetch

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const response = await fetch(
            `http://localhost:5001/api/shopping?query=${encodeURIComponent(searchQuery)}`
          );
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          backendProducts = await response.json();
          console.log("🔥 Backend products fetched:", backendProducts);
          break; // success
        } catch (err) {
          console.warn(`⚠️ Backend fetch attempt ${attempt + 1} failed:`, err);
          if (attempt < 2) await sleep(1000); // wait 1s before retry
          else throw err; // all retries failed
        }
      }
      setLoadingStage("ai-processing"); // 🤖 AI is refining products

      // 2️⃣ Prepare AI prompt for post-processing
      const aiPrompt = `
You are an expert shopping AI.
Instructions:
- Pick the 6 best products based on context.
- Consider BUDGET FROM CONTEXT, reviews, and filters in context.
- DO DEEP RESEARCH TAKE TIME AND ANALYSE
- Return only JSON array of products in the same structure as fetched (title, price, delivery, review, image, sellers).

GOAL
- Pick the best up to 6 products that STRICTLY satisfy the user’s BUDGET and all filters in context.
- Do deep research: verify real-time prices, stock, delivery, and reviews before output.

BUDGET RULES (HARD CAP)
- Treat budget as a hard ceiling: FINAL “to-door” price (item + taxes + shipping + platform fees + required add-ons) must be ≤ BUDGET.
- Prefer items ≥10–15% under budget when quality is similar.
- Exclude anything that exceeds budget after fees, has “starts at”/range pricing you can’t pin down, or shows higher price at checkout.
- If fewer than 6 items meet budget, return fewer. If none meet budget, return [].
Only return JSON. 
Context:
${JSON.stringify(context, null, 2)}

Products fetched from backend:
${JSON.stringify(backendProducts, null, 2)}
`;
      console.log("📝 AI prompt prepared:", aiPrompt);

      // 3️⃣ Call AI API with retry
      let aiJson;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const aiResponse = await fetch("http://localhost:5000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: aiPrompt }),
          });
          if (!aiResponse.ok) throw new Error(`HTTP error! status: ${aiResponse.status}`);
          aiJson = await aiResponse.json();
          console.log("🤖 Raw AI response:", aiJson);
          break; // success
        } catch (err) {
          console.warn(`⚠️ AI API attempt ${attempt + 1} failed:`, err);
          if (attempt < 2) await sleep(1000);
          else throw err;
        }
      }

      const cleanText = aiJson.text.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("✂️ Cleaned AI response text:", cleanText);

      let bestProducts;
      try {
        bestProducts = JSON.parse(cleanText);
        console.log("✅ AI filtered products parsed:", bestProducts);
      } catch (err) {
        console.error("❌ Failed to parse AI filtered products:", err);
        bestProducts = Array.isArray(backendProducts) ? backendProducts : [backendProducts]; // fallback
        console.log("⚠️ Falling back to backend products:", bestProducts);
      }

      // 4️⃣ Update state with AI-filtered products
      setStepData((prev) => ({
        ...prev,
        products: bestProducts,
      }));
      console.log("📦 Updated stepData with best products.");

      return bestProducts;
    } catch (err) {
      console.error("❌ Error fetching backend products or AI post-process:", err);
    } finally {
      setLoadingStage(null); // reset after done
    }
  };




  const fetchNextStep = async (userSelection) => {
    setLoadingStage("sending-query"); // 📨 Sending request to AI

    try {
      // Append user selection to history
      const newHistory = [
        ...history,
        { role: "user", content: userSelection || "Start" }
      ];
      //Speak like a gen z shi casual bro lmfao fr ong lil rude but fun savage shi bro what 😭🙏
      //Always think of User Choosing options, if an option isnt possible, looking at previous choosen option, always include reasaon in brackets () and it might change something

      // Include history in the prompt so Gemini remembers previous steps
      const prompt = `
You are an AI shopping assistant for Indian users, simulating a tap-only (ONLY ONE ANSWER no pick one or more), choose-your-own-adventure style experience. Keep steps short, interactive, and context-aware. Strictly research latest trends, prices, and availability online before suggesting options — do not rely on old knowledge.
⚠ Always use real-time web research for 'latest' products, specs, and prices — never use outdated cutoff knowledge. For example: iPhone 16 is latest, RTX 50 series is latest, NOT iPhone 15 or RTX 30 series.
During Step 4 ALWAYS ADD SKIP ALL and show me product and go to Step 5
AND NEVER ASK JEWLLWERY

ALWAYS ADD GO BACK OPTION(user rephrased and rephrase the question too(eg. Lets rewind, or sum you can think of), update context accordingly)

Always ask for and display brand names only (e.g., Samsung, Apple, Xiaomi) when requesting user preference, using phone models only later in product recommendations.

LATEST INFORMATIONS (RARELY USE THEM WHEN NEEDED, DURING BRAND PRIORITY-Step 4d):

Laptops → Lenovo Legion Gen 10, Acer Predator Helios Neo 16, Samsung Galaxy Book 5 Pro, APPLE M4
Mobiles → Samsung Galaxy S25 Ultra, iPhone 16 Pro Max, Xiaomi 15 Ultra, vivo X200 Pro, OnePlus 13, OPPO Find X8 Pro, Galaxy Z Fold7,
Headphones → Sony WH-1000XM6, Nothing Headphone (1)
Cameras → Panasonic LUMIX S1II, Sony α6700, Canon EOS R5 II, Nikon Z50 II
Smart Watches → Samsung Galaxy Watch Ultra 2025, Apple Watch Series 10, Pixel Watch 3, Galaxy Watch 8
Smart Home → Wipro, Syska, Xiaomi smart bulbs/plugs, Google Nest, Alexa Echo



Step 1: Who are you shopping for?

Options (tap-only):

Self → “For yourself / personal use”

Friend/Family → “For a friend, sibling, parent, or relative?”

Partner/Kid → “For your partner, child, or loved one?”

Group/Workplace → “For a team, office, or group gift?”

Surprise Me → “Let me pick something fun or trending for you”

Rules: Dynamically rephrase or add alternative suggestions based on user context.

Step 2: Pick a category

Options (dynamic, India-relevant):

Tech → Laptops, Mobiles, Headphones, Cameras, Smart Watches, Smart Home

Fashion → Men’s/Women’s Clothing, Footwear, Accessories

Lifestyle → Fitness, Travel Gear, Home Appliances, Kitchen

Gifts → Birthday, Festival, Corporate, Kids, Couples

Explore Random → Trending/seasonal items in India

Rules: Dynamically expand categories if context suggests something else.

Step 3: Pick a subcategory

Suggest subcategories based on the category selected.

Ask clarifying tap-only questions if subcategory is ambiguous.

Example: Tech → Mobiles, Laptops, Tablets, Earphones, Smart Watches

Step 4: Smart Quick Filters (Fully Multi-Tiered & AI-Driven)

Step 4a: Confirm Context → “Is this for gifting or personal use?”
Step 4b: Budget → INR-based dynamic ranges (e.g., Headphones → Under ₹2,000, ₹2,000–₹5,000, ₹5,000–₹15,000, ₹15,000+)
Step 4c: Primary Features → Main features relevant to subcategory (eg .Tech → Device type, Specs, Brand; Fashion → Style, Material, Color)
Step 4d: Secondary / Advanced Features → Multi-select refinements (eg .storage, size, color, design, brand)
Step 4e: Tertiary Features → Rare or specific refinements (eg .Brand preference, High-Res Audio, Foldable design)
Step 4f: Occasion / Use Case → India-relevant (eg .Gifting, Daily Use, Travel, Party, Work, Festival, Office)
Step 4g: Final Confirmation → Summarize all filters and allow user to refine every option
Step 4.5: Salesman-Style Lead-in
- AI dynamically asks a casual, fun question to lead into product recommendations.
- Examples AI can choose from:
    • “Alrighty! Based on your picks, I’ve rounded up some 🔥 options. Wanna check ’em out?”
    • “Sweet choices 😎! Let’s see what’s waiting for you 🛍”
    • “Perfect! Got some top picks for you 🍀 — ready?”
- Options for user:
    • “Yes, show me!” → triggers hidden Google Shopping search + AI refinement
    • “Edit filters” → go back to Step 4g
- Internally, AI generates search query, fetches products, and refines them, but user sees only the friendly prompt.
Step 5: Search

Confirm all selections before showing dynamic results.

AI must research online and suggest real-time products based on all previous filters.


Additional Rules:

After each step, summarize all selections so far.

DONT ASK TOO MANY QUESTIONS, ALWAYS SEARCH IN WEB AND LOOK AT CONTEXT AND DONT REPEAT QUESTIONS

DONT SAY PRIMARY SECONDARY Tertiary AND USE CASE, Rephrase them USER FRIENDLY

DO NOT DISPLAY PRODUCT PRICES IN OPTIONS

Only ask questions until Step 5.

Step 4 must remain fully multi-tiered and AI-driven.

AI can dynamically adapt to very specific requests.

JSON Output Rules for React Frontend Integration

All questions and options must be returned in JSON format.

Each question step must follow this structure:
NO FORMATTING NOTHING
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

Step 5: Final Search Query

Based on all previous selections stored in the "context" object (shopping_for, category, subcategory, filters, use_case, etc.), generate a *one-line search sentence* NO SPECIAL SYMBOLS NO CURRENCY SYMBOLS. 

Return JSON containing BOTH the search query and the full context:
STRICTLY FOLLOW THIS AFTER STEP 5 
ONLY WE NEED THIS NOTHING ELSE
{
  "search_query": "...",
  "context": { ...full context so far... }
}

Do not include anything else.


React frontend will render options as tap buttons. When a user taps, send the selected value back to Gemini API to generate the next step JSON.

Always include a context object summarizing all previous selections to maintain flow across steps.

ONLY GIVE ME IN JSON FORMAT NOTHING ELSE, ADD EMOJIS AND BE CREATIVE. 
Conversation history:
${JSON.stringify(newHistory, null, 2)}
`;
      // 3️⃣ Gemini API call with retry
      let json;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const response = await fetch("http://localhost:5000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          json = await response.json();
          console.log("✅ API response:", json);
          break; // success, break retry loop
        } catch (err) {
          console.warn(`⚠️ API attempt ${attempt + 1} failed:`, err);
          if (attempt < 2) {
            await new Promise((res) => setTimeout(res, 1000)); // wait 1s before retry
          } else {
            throw err; // all retries failed
          }
        }
      }


      // Extract the text and remove ```json blocks
     const jsonMatch = json.text.match(/\{[\s\S]*\}/); // match from first { to last }
if (!jsonMatch) {
  console.error("No JSON object found in AI response!");
  return;
}

let data;
try {
  data = JSON.parse(jsonMatch[0]);
  console.log("Parsed data:", data);
} catch (err) {
  console.error("Failed to parse JSON from API text:", err);
  console.log("Text content:", json.text);
  return;
}
      const context = data.context || {};

      // Read the search_query from Step 5
      const searchQuery = data.search_query || "";
      console.log("One-line search query:", searchQuery);
      const bestProducts = await fetchProductsFromBackend(searchQuery, context);

      // Merge products into stepData before setting state
      setStepData({
        ...data,
        products: bestProducts || [], // merge the AI products
      });

      setHistory([...history, { role: "assistant", content: data }]);


    } catch (err) {
      console.error("Error fetching Gemini API response:", err);
      alert("Something went wrong! Check console.");
    }

    setLoadingStage(null);
    setSelectedOption(null);

  };

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "1.5rem",
        position: "relative",
        background: "linear-gradient(180deg, rgba(10, 10, 10, 1), #171218ff, #291730ff)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 15s ease infinite",
        overflow: "hidden",
      }}
    >
      {/* Subtle light leak */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background:
            "linear-gradient(to top, rgba(178, 102, 237, 0.1), transparent 70%)",
          pointerEvents: "none",
          animation: "lightLeakShift 20s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          background: "transparent",
          padding: "1.2rem",
          width: "100%",
          maxWidth: "1300px",
        }}
      >
        {/* Load Google Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Heading */}
        <motion.h1
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{
            scale: stepData?.question || (stepData?.products?.length > 0) ? 1 : 1.8,
            opacity: 1
          }}
          transition={{
            scale: {
              duration: 1, ease: [0.25, 0.1, 0.25, 1]
              // soft, smooth curve
            },
            opacity: { duration: 0.6 }
          }}
          style={{
            fontSize: "3rem", // initial big size
            marginBottom: "1.4rem",
            fontWeight: 700,
            color: "#f0e6ff",
            textShadow: "0 0 10px rgba(150, 120, 255, 0.4)",
            textAlign: "left",
            transformOrigin: "top left",
          }}
        >
          Shop.ai
        </motion.h1>


        {/* Loader shimmer */}
        {/* Loader shimmer */}
        {/* Loader shimmer */}
        {loadingStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "1rem",
              width: "100%",
              background: "transparent",
            }}
          >
            {/* AI Processing Stage */}
            {loadingStage === "ai-processing" ? (
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px 20px",
                }}
              >
                {/* AI Text with subtle gradient animation */}
                <span
                  style={{
                    fontSize: "15px",
                    fontFamily: "Consolas, monospace",
                    textAlign: "center",
                    background: "linear-gradient(90deg, #a87fff, #d19aff, #b888ff, #e0bbff)",
                    backgroundSize: "300% 100%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "gradientShift 4s linear infinite",
                    textShadow: "0 0 8px rgba(200,150,255,0.3)",
                  }}
                >
                  AI is picking best picks for you...
                </span>

                <style>{`
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
`}</style>

              </div>
            ) : (
              /* Friendly Loading Messages for Other Stages */
              <motion.span
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.6 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "mirror",
                }}
                style={{
                  fontSize: "15px",
                  color: "#ccc",
                  fontFamily: "Consolas, monospace",
                  textAlign: "center",
                  opacity: 0.85,
                }}
              >
                {loadingStage === "sending-query" && "✨ Finding the best options for you..."}
                {loadingStage === "searching" && "🌿 Gathering inspiration..."}
                {loadingStage === "fetching-backend" && "🌊 Curating your perfect picks..."}
              </motion.span>
            )}
          </motion.div>
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
                    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes lightLeakShift {
        0% { transform: translate(0,0); }
        50% { transform: translate(50px, 30px); }
        100% { transform: translate(0,0); }
      }
          `}
        </style>

        {/* Start Button */}
        {!stepData && !loadingStage && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
            style={{
              width: "50%",
              padding: "1.2rem",
              marginTop: "4rem",
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
          {stepData?.question && !loadingStage && (
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
        {/* Products */}
        {stepData?.products?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              marginTop: "2rem",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)", // always 3 per row
              gap: "1.5rem", // bigger gap between cards
            }}
          >

            {stepData.products.map((p, idx) => (
              <motion.div
                key={idx}
                className="product-card"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 120,
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 12px 25px rgba(0,0,0,0.4)",
                }}
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  padding: "1rem",
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(15px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.8rem",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                {/* Subtle animated gradient glow overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: "-150%",
                    left: "-150%",
                    width: "400%",
                    height: "400%",
                    background:
                      "linear-gradient(120deg, rgba(150,100,255,0.05), rgba(200,150,255,0.05), rgba(180,120,255,0.05), rgba(220,180,255,0.05))",
                    animation: "gradientMove 15s linear infinite",
                    mixBlendMode: "overlay",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.6rem",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "400px",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                  />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#f0e6ff",
                      textAlign: "center",
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#ccc",
                      textAlign: "center",
                    }}
                  >
                    {p.delivery ? `🚚 ${p.delivery}` : "Delivery info N/A"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      textAlign: "center",
                      color: "#00ff88",
                    }}
                  >
                    {p.price} {p.review ? `| ⭐ ${p.review}` : ""}
                  </p>
                </div>

                {/* Sellers */}
                {p.sellers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      marginTop: "0.5rem",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {p.sellers.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "0.3rem 0.6rem",
                          borderRadius: "10px",
                          background: "#222222",
                          color: "#b9a7ff",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          textDecoration: "none",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#333333")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#222222")
                        }
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?sz=64&domain_url=${s.url}`}
                          alt={s.website}
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "3px",
                          }}
                        />
                        {s.website} ({s.price})
                      </a>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        <style>
          {`
@keyframes gradientMove {
  0% { transform: translate(0%, 0%) rotate(0deg); }
  50% { transform: translate(20%, 20%) rotate(180deg); }
  100% { transform: translate(0%, 0%) rotate(360deg); }
}
`}
        </style>



      </motion.div>
    </div>
  );
}

export default App;