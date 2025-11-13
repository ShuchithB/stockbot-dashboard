// src/App.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const API_BASE = "https://stockbot-backend-39ec.onrender.com"; // <<-- CHANGE to your backend URL if different
const COLORS = ["#10b981", "#ef4444"];

function shortDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export default function App() {
  const [strategy, setStrategy] = useState("swing");
  const [startDate, setStartDate] = useState("2024-03-01");
  const [endDate, setEndDate] = useState("2025-11-10");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchHistory();
    const params = new URLSearchParams(window.location.search);
    if (params.get("token_success")) {
      setMessage("✅ Kite token generated. Now you can Run tests.");
    } else if (params.get("token_error")) {
      setMessage("❌ Token generation failed.");
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/backtests`);
      setHistory(res.data.backtests || []);
    } catch (err) {
      console.error("Failed load history", err);
    }
  };

  const handleLogin = async () => {
    setMessage("");
    try {
      const res = await axios.get(`${API_BASE}/generate_token_url`);
      window.location.href = res.data.login_url;
    } catch (err) {
      setMessage("❌ Failed to connect to backend for login URL.");
    }
  };

  const runNow = async () => {
    setRunning(true);
    setMessage("Launching backtest (background). This may take a while...");
    try {
      const payload = {
        strategy,
        start_date: startDate,
        end_date: endDate,
        symbols_file: "nifty100.csv"
      };
      const res = await axios.post(`${API_BASE}/run_strategy`, payload);
      setMessage(res.data.message || "Started");
      // refresh history after a short delay (adjust as needed)
      setTimeout(() => { fetchHistory(); }, 5000);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      setMessage("❌ Failed to start: " + detail);
    } finally {
      setRunning(false);
    }
  };

  // pick last run for charts
  const last = history[0] || null;
  const equityCurve = last?.equity_curve || last?.equity || [];
  const tradeList = last?.trades || [];
  const summary = last?.summary || {};

  const winCount = tradeList.filter(t => (t.PnL || 0) > 0).length;
  const lossCount = tradeList.length - winCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-5xl mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            ⚡ StockBot Dashboard
          </h1>
          <div>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-yellow-400 text-black rounded-xl shadow"
            >
              🔑 Login with Kite
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-300 mt-2">Connected to backend: <span className="text-blue-300">{API_BASE}</span></p>
      </header>

      {/* Controls */}
      <div className="w-full max-w-5xl bg-white/5 p-6 rounded-2xl mb-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm mb-1">Strategy</label>
            <select value={strategy} onChange={(e)=>setStrategy(e.target.value)} className="w-full p-2 rounded bg-white/10">
              <option value="swing">Swing Strategy (ATR/MACD/RSI) — full test</option>
              <option value="momentum">Momentum (fast test - single symbol)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full p-2 rounded bg-white/5"/>
          </div>

          <div>
            <label className="block text-sm mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full p-2 rounded bg-white/5"/>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runNow}
            disabled={running}
            className={`px-6 py-2 rounded-2xl font-semibold ${running ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"}`}
          >
            {running ? "Starting..." : "Run Now"}
          </button>

          <button onClick={() => fetchHistory()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Refresh History</button>

          <div className="ml-auto text-sm text-gray-300">
            <span className="font-medium">Last run:</span> { last ? shortDate(last.timestamp) : "No runs yet" }
          </div>
        </div>

        {message && <p className="mt-3 text-sm text-yellow-300">{message}</p>}
      </div>

      {/* Main dashboard (charts & history) */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        <div className="bg-white text-gray-900 p-6 rounded-2xl shadow">
          <h2 className="text-xl font-bold mb-4">📈 Equity Growth</h2>
          {equityCurve && equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve.map(d => ({ date: d.date || d.date, portfolio_equity: d.portfolio_equity || d.equity }))}>
                <Line type="monotone" dataKey="portfolio_equity" stroke="#10b981" strokeWidth={2} dot={false}/>
                <CartesianGrid stroke="#e6e6e6" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-600">No equity data available yet — run a backtest to see the curve.</p>
          )}
        </div>

        <div className="bg-white text-gray-900 p-6 rounded-2xl shadow">
          <h2 className="text-xl font-bold mb-4">🥇 Win / Loss</h2>
          {tradeList.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Wins", value: winCount },
                    { name: "Losses", value: lossCount }
                  ]}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={90}
                  label
                >
                  <Cell fill={COLORS[0]} />
                  <Cell fill={COLORS[1]} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-600">No trade data yet — run a backtest to populate trades.</p>
          )}

          <div className="mt-6">
            <h3 className="font-semibold">Summary</h3>
            <ul className="mt-2 text-sm text-gray-700">
              <li><strong>Total PnL:</strong> {summary["Total PnL"] ?? "-"}</li>
              <li><strong>Win Rate %:</strong> {summary["Win Rate %"] ?? "-"}</li>
              <li><strong>Trades:</strong> {summary["Trades"] ?? tradeList.length}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="w-full max-w-5xl mt-6 bg-white/5 p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-3">📜 Backtest History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-sm text-gray-300 bg-white/2">
                <th className="p-2">Timestamp</th>
                <th className="p-2">Strategy</th>
                <th className="p-2 text-right">Total PnL</th>
                <th className="p-2 text-right">Win Rate %</th>
                <th className="p-2 text-right">Trades</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  <td className="p-2 text-sm">{new Date(h.timestamp).toLocaleString()}</td>
                  <td className="p-2 text-sm">{h.strategy}</td>
                  <td className="p-2 text-sm text-right">{h.summary?.["Total PnL"] ?? "-"}</td>
                  <td className="p-2 text-sm text-right">{h.summary?.["Win Rate %"] ?? "-"}</td>
                  <td className="p-2 text-sm text-right">{h.summary?.["Trades"] ?? (h.trades?.length ?? 0)}</td>
                  <td className="p-2 text-sm">
                    <button onClick={() => setSelected(h)} className="px-3 py-1 rounded bg-yellow-400 text-black">View</button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td className="p-4 text-sm text-gray-400" colSpan={6}>No backtests saved yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-2xl p-6 w-full max-w-4xl relative">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-4 text-xl">×</button>
            <h4 className="text-xl font-bold mb-3">Details — {selected.strategy} — {new Date(selected.timestamp).toLocaleString()}</h4>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold mb-2">Equity Curve</h5>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <LineChart data={selected.equity_curve || selected.equity || []}>
                      <Line dataKey="portfolio_equity" stroke="#10b981" dot={false} />
                      <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                      <XAxis dataKey="date" tickFormatter={shortDate}/>
                      <YAxis/>
                      <Tooltip/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h5 className="font-semibold mb-2">Trades (first 100)</h5>
                <div className="max-h-56 overflow-auto border rounded p-2">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-600">
                      <tr><th>Date</th><th>Action</th><th className="text-right">Price</th><th className="text-right">PnL</th></tr>
                    </thead>
                    <tbody>
                      {(selected.trades || []).slice(0,100).map((t, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1">{t.Date || t.date}</td>
                          <td className="py-1">{t.Action}</td>
                          <td className="py-1 text-right">{t.Price ?? "-"}</td>
                          <td className={`py-1 text-right ${ (t.PnL||0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{t.PnL ?? "-"}</td>
                        </tr>
                      ))}
                      {(!selected.trades || selected.trades.length===0) && (
                        <tr><td className="p-2 text-gray-500" colSpan={4}>No trades</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-sm text-gray-400">© {new Date().getFullYear()} StockBot | FastAPI + React + Render</footer>
    </div>
  );
}
