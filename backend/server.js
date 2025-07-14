const admin = require("./firebase");
const authenticateFirebase = require("./middleware/auth");
const userDb = require("./db/user");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const Stripe = require("stripe");

dotenv.config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors({
  origin: [
    "https://tailormyletter.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true,
}));

// Stripe webhook must use raw body
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

app.get("/", (req, res) => {
  res.json({ status: "TailorMyLetter backend running!" });
});

const LOOKUP_KEYS = {
  INR: "premium_inr",
  USD: "premium_usd",
  CAD: "premium_cad",
};

// Create checkout session with user info in metadata
app.post("/create-checkout-session", authenticateFirebase, async (req, res) => {
  const { currency } = req.body;
  const { firebaseUid, firebaseEmail } = req;
  const lookupKey = LOOKUP_KEYS[currency] || LOOKUP_KEYS.USD;

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
    success_url: "https://tailormyletter.vercel.app/pricing.html",
    cancel_url: "https://tailormyletter.vercel.app",
    customer_email: firebaseEmail,
    metadata: { firebaseUid }
  });

  res.json({ id: session.id });
});

// Stripe webhook for payment success
app.post("/webhook", async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const firebaseUid = session.metadata.firebaseUid;
    if (firebaseUid) {
      await userDb.setUserPaid(firebaseUid);
    }
  }

  res.status(200).json({ received: true });
});

// Generate endpoint (free or paid logic)
app.post("/generate", authenticateFirebase, async (req, res) => {
  const { resume, jobDescription, tone } = req.body;
  const { firebaseUid, firebaseEmail } = req;

  await userDb.createUserIfNotExists(firebaseUid, firebaseEmail);
  const user = await userDb.getUserByFirebaseUid(firebaseUid);
  if (!user) return res.status(500).json({ error: "User creation failed." });

  if (user.has_used_free_trial && !user.has_paid) {
    return res.status(403).json({ error: "Free trial already used. Please subscribe." });
  }

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

    if (user.has_paid) {
      await userDb.setUserUnpaid(firebaseUid);
    } else {
      await userDb.setFreeTrialUsed(firebaseUid);
    }

    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "AI request failed." });
  }
});

// Register user (for completeness)
app.post("/register", authenticateFirebase, async (req, res) => {
  const { firebaseUid, firebaseEmail } = req;
  await userDb.createUserIfNotExists(firebaseUid, firebaseEmail);
  res.status(200).json({ success: true });
});

// Optional: status endpoint for frontend
app.get("/user/status", authenticateFirebase, async (req, res) => {
  const { firebaseUid } = req;
  const user = await userDb.getUserByFirebaseUid(firebaseUid);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    hasUsedFreeTrial: !!user.has_used_free_trial,
    hasPaid: !!user.has_paid
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
