
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const PROVIDERS = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    key: process.env.GEMINI_API_KEY
  },

  nvidia: {
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    key: process.env.NVIDIA_API_KEY,
    model: process.env.NVIDIA_MODEL || "openai/gpt-oss-120b"
  },

  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  },

  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free"
  },

  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    key: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
  },

  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    key: process.env.MISTRAL_API_KEY,
    model: process.env.MISTRAL_MODEL || "mistral-small-latest"
  }
};

app.get("/", (req, res) => {
  res.json({
    app: "NVP AI",
    status: "Backend running"
  });
});

app.get("/api/models", (req, res) => {
  res.json({
    providers: Object.keys(PROVIDERS).map(name => ({
      id: name,
      available: Boolean(PROVIDERS[name].key)
    }))
  });
});

async function askProvider(provider, messages) {
  const config = PROVIDERS[provider];

  if (!config || !config.key) {
    throw new Error("Provider API key not configured");
  }

  if (provider === "gemini") {
    const response = await fetch(
      config.url + "?key=" + encodeURIComponent(config.key),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: messages.map(message => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }]
          }))
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini request failed");
    }

    return data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("") || "No response";
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(provider === "openrouter"
        ? { "HTTP-Referer": "https://nvp-ai.vercel.app", "X-Title": "NVP AI" }
        : {})
    },
    body: JSON.stringify({
      model: config.model,
      messages
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `${provider} request failed`);
  }

  return data.choices?.[0]?.message?.content || "No response";
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, provider = "auto", history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const messages = [
      {
        role: "system",
        content: "You are NVP AI, a helpful and intelligent AI assistant."
      },
      ...history.slice(-10).filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      ),
      { role: "user", content: message }
    ];

    const order = provider === "auto"
      ? ["gemini", "groq", "nvidia", "openrouter", "deepseek", "mistral"]
      : [provider];

    const errors = [];

    for (const name of order) {
      if (!PROVIDERS[name]?.key) continue;

      try {
        const reply = await askProvider(name, messages);

        return res.json({
          success: true,
          provider: name,
          reply
        });
      } catch (error) {
        errors.push(`${name}: ${error.message}`);

        if (provider !== "auto") break;
      }
    }

    res.status(503).json({
      success: false,
      error: "No AI provider could respond.",
      details: errors
    });

  } catch (error) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`NVP AI backend running on port ${PORT}`);
});
