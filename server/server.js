import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai"; // 公式SDK
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// === 🧩 __dirname を ESM で定義 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === 📘 prompts.json の絶対パス ===
const PROMPT_FILE = path.resolve(__dirname, "prompts.json");

// === 🌍 環境に応じた CORS 設定 ===
const allowedOrigins = [
  "http://localhost:3000", // 開発環境
  "https://YOUR-APP-NAME.onrender.com", // ← RenderのURLに置き換え！
];

app.use(
  cors({
    origin: function (origin, callback) {
      // originがundefined（同一オリジンなど）でも許可
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 Blocked by CORS: ${origin}`);
        callback(new Error("CORS policy violation"));
      }
    },
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// === 🔑 APIキー確認 ===
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in environment variables.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === 🧠 簡易リトライ（429対策） ===
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
      console.warn(`⚠️ Retry #${i + 1} after ${delay}ms (status ${status})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// === 📚 プロンプト一覧API ===
app.get("/api/prompts", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(PROMPT_FILE, "utf-8"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read prompts.json" });
  }
});

// === 💬 Chat API ===
app.post("/api/chat", async (req, res) => {
  const userMessage = (req.body?.message ?? "").toString();

  if (!userMessage) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await withBackoff(async () => {
      return await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage },
        ],
      });
    });

    const content =
      result?.choices?.[0]?.message?.content ??
      "(no content returned from model)";

    return res.json({
      content,
      usage: result?.usage,
    });
  } catch (err) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const data = err?.response?.data ?? {
      error: err?.message ?? "Unknown error",
    };
    console.error("❌ Chat API error:", data);
    return res.status(status).json(data);
  }
});

// ---------- React ビルド済みファイルを提供 ----------
const clientBuildPath = path.join(__dirname, "../client/build");

// 静的ファイル配信
app.use(express.static(clientBuildPath));

// React Router対応: どのルートでも index.html を返す
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// === 🚀 ポート起動 ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
