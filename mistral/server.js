// server.js
import express from "express";
import cors from "cors";
import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Mistral client
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Chat endpoint
app.post("/api/chat", async (req, res) => {
    const { prompt } = req.body;

    // Log the incoming prompt from frontend
    console.log("Received prompt from frontend:", prompt);

    try {
        const response = await client.chat.complete({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: prompt }],
        });

        // Log the AI response
        console.log("AI response:", response.choices[0].message.content);

        res.json({ text: response.choices[0].message.content });
    } catch (err) {
        console.error("Mistral API error:", err);
        res.status(500).json({ error: "Mistral API error" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Mistral AI running on port ${PORT}`));
