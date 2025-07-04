const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const Stripe = require("stripe");

dotenv.config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

const LOOKUP_KEYS = {
  INR: "premium_inr",
  USD: "premium_usd",
  CAD: "premium_cad",
};

app.post("/create-checkout-session", async (req, res) => {
  const { currency } = req.body;
  const lookupKey = LOOKUP_KEYS[currency] || LOOKUP_KEYS.USD;

  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      success_url: "https://tailormyletter.vercel.app/checkout.html",
      cancel_url: "https://tailormyletter.vercel.app",
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    res.status(500).json({ error: "Failed to create checkout session." });
  }
});

app.post("/generate", async (req, res) => {
  const { resume, jobDescription, tone } = req.body;
  const prompt = `
You are an expert job assistant. Using the resume and job description below, do the following:

1. Write a tailored cover letter in a ${tone} tone.
2. Give an ATS match score out of 100 (not always 85).
3. Provide 2–3 personalized tips to improve the resume.

Respond strictly in this raw JSON format, without code blocks or explanations:
{
  "coverLetter": "...",
  "score": <real score>,
  "feedback": ["...", "..."]
}

Resume:
${resume}

Job Description:
${jobDescription}
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-3.2-24b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are an expert job assistant. Only respond with clean JSON.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    let raw = response.data.choices[0].message.content.trim();
    if (raw.startsWith("```")) {
      raw = raw
        .replace(/^```[a-z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }
    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      return res.status(500).json({ error: "Invalid JSON returned from AI." });
    }

    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "AI request failed." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
