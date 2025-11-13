import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const API_BASE = "https://stockbot-backend-39ec.onrender.com";
const COLORS = ["#34d399", "#f87171"];

export default function App() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null); // for modal

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login_success")) {
      const data = Object.fromEntries(params.entries());
      delete data.login_success;
      setSummary(data);
      fetchHistory();
    } else fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/backtests`);
      setHistory(res.data.backtests.reverse());
    } catch {
      console.log("⚠️ Could not load history.");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.get(`${API_BASE}/generate_token_url`);
      window.location.href = res.data.login_url;
    } catch {
      setMessage("❌ Failed to connect to backend for login URL.");
    }
  };

  const latestEquity = history[0]?.equity_curve || [];
  const lastSummary = history[0]?.summary || summary;

  const winRate = parseFloat(lastSummary?.["Win Rate %"] || 0);
  const lossRate = 100 - winRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
        ⚡ StockBot Dashboard
      </h1>

      {!summary && history.length === 0 ? (
        <div className="flex flex-col items-center">
          <button
            onClick={handleLogin}
            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold rounded-2xl shadow-lg hover:scale-105 transform transition duration-200"
          >
            🔑 Login with Kite
          </button>
          {message && <p className="mt-4 text-red-400">{message}</p>}
        </div>
      ) : (
        <>
          {/* Summary + Charts */}
          <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              📊 Backtest Summary
            </h2>
            <ul className="grid grid-cols-2 gap-2 mb-6 text-lg">
              {Object.entries(lastSummary || {}).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="font-semibold">{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">📈 Equity Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={latestEquity}>
                    <Line type="monotone" dataKey="equity" stroke="#10b981" />
                    <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">🥇 Win / Loss Ratio</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Wins", value: winRate },
                        { name: "Losses", value: lossRate },
                      ]}
                      dataKey="value"
                      outerRadius={90}
                      label
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={index} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Historical Table */}
          <div className="bg-gray-800 rounded-xl mt-8 p-6 w-full max-w-5xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">📜 Backtest History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700 text-gray-200 text-sm uppercase">
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-right">Total PnL</th>
                    <th className="p-3 text-right">Win Rate %</th>
                    <th className="p-3 text-right">Trades</th>
                    <th className="p-3 text-right">R:R</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((bt, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-700 hover:bg-gray-700 transition"
                    >
                      <td className="p-3">{new Date(bt.timestamp).toLocaleString()}</td>
                      <td className="p-3">{bt.symbol}</td>
                      <td className="p-3 text-right text-green-400">{bt.summary["Total PnL"]}</td>
                      <td className="p-3 text-right">{bt.summary["Win Rate %"]}</td>
                      <td className="p-3 text-right">{bt.summary["Trades"]}</td>
                      <td className="p-3 text-right">{bt.summary["Reward:Risk"]}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelected(bt)}
                          className="px-3 py-1 bg-yellow-400 text-black rounded-md hover:bg-yellow-300"
                        >
                          🔍 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popup Modal */}
          {selected && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-white text-gray-900 rounded-lg p-6 w-full max-w-3xl shadow-2xl relative">
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-2 right-3 text-gray-500 hover:text-black text-2xl"
                >
                  ×
                </button>
                <h3 className="text-2xl font-bold mb-2">📅 {new Date(selected.timestamp).toLocaleString()}</h3>
                <h4 className="font-semibold mb-4 text-gray-600">
                  Symbol: {selected.symbol}
                </h4>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">📈 Equity Curve</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selected.equity_curve}>
                        <Line type="monotone" dataKey="equity" stroke="#10b981" />
                        <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
                        <XAxis dataKey="date" hide />
                        <YAxis />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">📊 Trades</h3>
                    <div className="overflow-y-auto max-h-48 border border-gray-300 rounded-md p-2">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-200 text-gray-800">
                            <th className="p-2">Date</th>
                            <th className="p-2">Action</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-right">PnL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.trades.slice(0, 20).map((t, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{t.Date}</td>
                              <td className="p-2">{t.Action}</td>
                              <td className="p-2 text-right">{t.Price}</td>
                              <td
                                className={`p-2 text-right ${
                                  t.PnL > 0 ? "text-green-600" : "text-red-500"
                                }`}
                              >
                                {t.PnL?.toFixed?.(2) || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="mt-10 text-gray-400 text-sm">
            © {new Date().getFullYear()} StockBot | Powered by FastAPI + React + Render
          </footer>
        </>
      )}
    </div>
  );
}
