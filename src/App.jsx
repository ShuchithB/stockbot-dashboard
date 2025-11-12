import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://stockbot-backend.onrender.com"; // change to your backend URL

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-01-01");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("token_success")) {
      setMessage("✅ Access Token generated successfully!");
    } else if (params.get("token_error")) {
      setMessage("❌ Token generation failed. Please try again.");
    }
  }, []);

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/generate_token_url`);
      window.location.href = res.data.login_url;
    } catch {
      setMessage("❌ Failed to connect to backend for login URL.");
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${API_BASE}/run_once`, {
        api_key: apiKey,
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });
      setMessage("✅ Backtest started successfully!");
      setResult(res.data);
    } catch {
      setMessage("❌ Failed to start backtest. Check your token or API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
          📈 StockBot Dashboard
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Connected to backend: <span className="text-blue-600">{API_BASE}</span>
        </p>

        <div className="space-y-4">
          <button
            onClick={generateToken}
            disabled={loading}
            className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            🔑 Generate Kite Access Token
          </button>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Kite API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Enter your Kite API Key (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Kite Access Token (optional)
            </label>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Leave blank to use stored token"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>

          {message && (
            <p
              className={`text-center mt-3 font-medium ${
                message.includes("❌") ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </p>
          )}

          {result && (
            <div className="mt-5 border-t pt-4 text-sm text-gray-700">
              <h2 className="text-lg font-bold mb-2">Backtest Result</h2>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center mt-6 text-gray-500 text-sm">
        © {new Date().getFullYear()} StockBot | Powered by FastAPI + React + Render
      </footer>
    </div>
  );
}
