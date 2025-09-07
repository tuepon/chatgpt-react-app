import { useState, useEffect } from "react";
import axios from "axios";

export default function Chat() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [inputValue, setInputValue] = useState("");

  // 履歴を localStorage から復元
  const [storedValues, setStoredValues] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });

  const [loader, setLoader] = useState(false);

  // 定型プロンプト取り込み
  useEffect(() => {
    axios.get("/api/prompts")
      .then(res => setPrompts(res.data))
      .catch(err => console.error(err));
  }, []);

  // 履歴をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(storedValues));
  }, [storedValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPrompt && !inputValue) return;

    setLoader(true);
    try {
      const promptToSend = selectedPrompt
        ? `${selectedPrompt} ${inputValue}`
        : inputValue;

      const { data } = await axios.post("/api/chat", { message: promptToSend });
      setStoredValues(prev => [...prev, { prompt: promptToSend, reply: data.content }]);
      setInputValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoader(false);
    }
  };

  const clearHistory = () => {
    setStoredValues([]);
    localStorage.removeItem("chatHistory");
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img
          src="/OpenAI-black-monoblossom.svg"
          alt="OpenAI Logo"
          style={{ height: 32 }}
        />
	  <h1>Chatbot デモ</h1>
      </header>
      <p>定型業務に便利なプロンプト選択を搭載しました。</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select
          value={selectedPrompt}
          onChange={e => setSelectedPrompt(e.target.value)}
        >
          <option value="">-- 定型プロンプトを選択 --</option>
          {prompts.map(p => (
            <option key={p.id} value={p.content}>{p.name}</option>
          ))}
        </select>
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="付加情報を入力（例: URLや文章）"
          style={{ padding: 8 }}
        />
        <button type="submit" disabled={loader}>
          {loader ? "送信中..." : "送信"}
        </button>
        <button type="button" onClick={clearHistory}>
          履歴クリア
        </button> 
      </form>

      <div style={{ marginTop: 16 }}>
        {storedValues.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div><strong>Prompt:</strong> {item.prompt}</div>
            <div><strong>AI:</strong> {item.reply}</div>
          </div>
        ))}
    </div>
   </div>
  );
}

