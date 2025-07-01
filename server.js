const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Configuration, OpenAIApi } = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Handle POST request from frontend
app.post("/generate", async (req, res) => {
  const { resume, jobDescription, tone } = req.body;

  const prompt = `
You are an expert job assistant. Do the following:

1. Write a tailored cover letter in a ${tone} tone using the resume and job description.
2. Give an estimated ATS match score out of 100.
3. Suggest 2–3 improvements to increase the match score.

Resume:
${resume}

Job Description:
${jobDescription}

Respond in JSON format:
{
  "coverLetter": "...",
  "score": 85,
  "feedback": ["Missing Python", "Use stronger action verbs"]
}
`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.data.choices[0].message.content;
    const json = JSON.parse(raw);
    res.json(json);
  } catch (err) {
    console.error("Error from OpenAI or parsing:", err.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
