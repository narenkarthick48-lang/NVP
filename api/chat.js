
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const providers = {
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
    model: process.env.OPENROUTER_MODEL
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

async function ask(provider, messages) {
  const config = providers[provider];

  if (!config || !config.key) {
    throw new Error("API key or provider unavailable");
  }

  if (provider === "gemini") {
    const response = await fetch(
      config.url + "?key=" + encodeURIComponent(config.key),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages
            .filter(m => m.role !== "system")
            .map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }))
        })
      }
    );

    const data = await response.json();

    if (!response.ok) throw new Error(data.error?.message);

    return data.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "").join("") || "";
  }

  if (!config.model) {
    throw new Error("Configure a model ID for this provider");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages
    })
  });

  const data = await response.json();

  if (!response.ok) throw new Error(data.error?.message);

  return data.choices?.[0]?.message?.content || "";
}

app.post("/", async (req, res) => {
  try {
    const { message, provider = "auto", history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const messages = [
      {
        role: "system",
        content: "You are NVP AI, a helpful AI assistant."
      },
      ...history.slice(-10).filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      ),
      { role: "user", content: message.trim() }
    ];

    const order = provider === "auto"
      ? ["gemini", "groq", "nvidia", "openrouter", "deepseek", "mistral"]
      : [provider];

    const errors = [];

    for (const name of order) {
      try {
        const reply = await ask(name, messages);

        return res.status(200).json({
          success: true,
          provider: name,
          reply
        });
      } catch (error) {
        errors.push(name);
        if (provider !== "auto") break;
      }
    }

    return res.status(503).json({
      error: "No available AI provider",
      failedProviders: errors
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;
