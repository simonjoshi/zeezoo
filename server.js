require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const VAPI_PRIVATE_KEY  = process.env.VAPI_PRIVATE_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || "11300a9b-a11b-4841-ba88-6e06b79658bf";

if (!VAPI_PRIVATE_KEY) {
  console.error("ERROR: VAPI_PRIVATE_KEY environment variable is not set.");
  process.exit(1);
}

app.post("/api/chat", async (req, res) => {
  const { input, previousChatId } = req.body;
  if (!input || typeof input !== "string") return res.status(400).json({ error: "input is required" });

  const body = { assistantId: VAPI_ASSISTANT_ID, input };
  if (previousChatId) body.previousChatId = previousChatId;

  try {
    const vapiRes = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${VAPI_PRIVATE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await vapiRes.json();
    if (!vapiRes.ok) return res.status(vapiRes.status).json(data);

    let reply = "";
    if (Array.isArray(data.output) && data.output.length) {
      const msgs = data.output.filter(m => m.role === "assistant");
      const last = msgs[msgs.length - 1] || data.output[data.output.length - 1];
      reply = last?.content || "";
    } else if (typeof data.output === "string") {
      reply = data.output;
    } else if (data.message) {
      reply = data.message;
    }

    res.json({ chatId: data.id, reply: reply || "(no response)" });
  } catch (err) {
    console.error("Vapi proxy error:", err);
    res.status(502).json({ error: "Failed to reach Vapi" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zeezoo site running at http://localhost:${PORT}`));
