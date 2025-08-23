import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai"; // 公式SDK

dotenv.config();

const app = express();

// 開発中: CRA は 3000 で動く想定。必要に応じて許可オリジンを調整。
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in server/.env");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 429対策: シンプルな指数バックオフ
async function withBackoff(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      const retryable = status === 429 || status >= 500;
      if (!retryable || i === retries) {
        lastErr = err;
        break;
      }
      const delay = baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * /api/chat
 * body: { message: string }
 * 公式SDKで Chat Completions を呼び出し（現状もっとも互換性が高い）
 * ※ OpenAI は新しい "Responses API" の利用を推奨。必要なら後述の差し替え例を参照。
 */
app.post("/api/chat", async (req, res) => {
  const userMessage = (req.body?.message ?? "").toString();

  if (!userMessage) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await withBackoff(async () => {
      return await client.chat.completions.create({
        // 軽量・安価で十分高品質な最新系モデル。必要に応じて変更可。
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage }
        ]
      });
    });

    const content =
      result?.choices?.[0]?.message?.content ??
      "(no content returned from model)";

    return res.json({
      content,
      usage: result?.usage
    });
  } catch (err) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const data = err?.response?.data ?? {
      error: err?.message ?? "Unknown error"
    };
    return res.status(status).json(data);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

