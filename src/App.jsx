import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://stockbot-backend.onrender.com";

export default function App() {
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login_success")) {
      const data = Object.fromEntries(params.entries());
      delete data.login_success;
      setSummary(data);
      setMessage("✅ Logged in successfully and backtest completed!");
    } else if (params.get("login_error")) {
      setMessage("❌ Token generation failed. Please try again.");
    }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await axios.get(`${API_BASE}/generate_token_url`);
      window.location.href = res.data.login_url;
    } catch {
      setMessage("❌ Failed to connect to backend for login URL.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-4xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
        ⚡ StockBot Dashboard
      </h1>

      {!summary ? (
        <div className="flex flex-col items-center space-y-6">
          <button
            onClick={handleLogin}
            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold rounded-2xl shadow-lg hover:scale-105 transform transition duration-200"
          >
            🔑 Login with Kite
          </button>
          {message && (
            <p className="text-sm text-red-400 font-medium">{message}</p>
          )}
        </div>
      ) : (
        <div className="bg-white text-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 text-center">
            📊 Backtest Summary
          </h2>
          <ul className="space-y-2">
            {Object.entries(summary).map(([key, val]) => (
              <li key={key} className="flex justify-between">
                <span className="font-semibold">{key}</span>
                <span>{val}</span>
              </li>
            ))}
          </ul>
          <div className="text-center mt-6">
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-4 text-sm text-blue-600 underline"
            >
              ↻ Run again
            </button>
          </div>
        </div>
      )}

      <footer className="mt-10 text-gray-400 text-sm">
        © {new Date().getFullYear()} StockBot | Powered by FastAPI + React + Render
      </footer>
    </div>
  );
}
