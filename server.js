const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

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
            content: "You are an expert job assistant. Only respond with clean JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let raw = response.data.choices[0].message.content.trim();
    console.log("🟢 Raw OpenRouter Response:", raw);

    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }

    // Fix escaped newlines that break JSON parsing
    raw = raw.replace(/\\n/g, '\\\\n');

    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError.message);
      console.error("❌ Raw content:", raw);
      return res.status(500).json({ error: "AI returned invalid JSON." });
    }

    res.json(json);
  } catch (err) {
    if (err.response) {
      console.error("❌ OpenRouter Error:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("❌ Server Error:", err.message);
    }
    res.status(500).json({ error: "Failed to get AI response." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
