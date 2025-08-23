import { useState } from "react";
import axios from "axios";

export default function Chat() {
  const [newQuestion, setNewQuestion] = useState("");
  const [storedValues, setStoredValues] = useState([]);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!newQuestion.trim()) return;

    setLoader(true);
    setError("");

    try {
      // proxy を設定した場合は "/api/chat" でOK。未設定なら "http://localhost:3001/api/chat"
      const { data } = await axios.post("/api/chat", { message: newQuestion });

      const reply = data?.content ?? "(no content)";
      setStoredValues((prev) => [...prev, { q: newQuestion, a: reply }]);
      setNewQuestion("");
    } catch (err) {
      console.error("API Error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong.";
      setError(msg);
    } finally {
      setLoader(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1>Chat</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Say hello..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loader}>
          {loader ? "Sending..." : "Send"}
        </button>
      </form>

      {error && (
        <div style={{ color: "crimson", marginTop: 8 }}>Error: {error}</div>
      )}

      <div style={{ marginTop: 16 }}>
        {storedValues.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div><strong>You:</strong> {item.q}</div>
            <div><strong>AI:</strong> {item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

