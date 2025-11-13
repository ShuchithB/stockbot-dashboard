// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://stockbot-backend-39ec.onrender.com";
const FRONTEND_URL = window.location.origin;

function shortTokenPreview(t) {
  if (!t) return "";
  return t.slice(-8);
}

export default function App() {
  const [connectedBackend, setConnectedBackend] = useState(BACKEND);
  const [tokenOk, setTokenOk] = useState(false);
  const [tokenPreview, setTokenPreview] = useState(null);
  const [strategy, setStrategy] = useState("swing");
  const [startDate, setStartDate] = useState("2024-03-01");
  const [endDate, setEndDate] = useState("2025-11-10");
  const [runningJob, setRunningJob] = useState(null);
  const pollingRef = useRef(null);
  const [latestRun, setLatestRun] = useState(null);
  const [equityData, setEquityData] = useState([]);
  const [winLossData, setWinLossData] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // On load: check debug/token and /latest
    fetch(`${BACKEND}/debug/token`).then(r => r.json()).then(d => {
      if (d?.has_token) {
        setTokenOk(true);
        setTokenPreview(d.token_preview);
      } else {
        setTokenOk(false);
        setTokenPreview(null);
      }
    }).catch(_ => { setTokenOk(false); });

    fetchLatest();
  }, []);

  async function fetchLatest() {
    try {
      const r = await fetch(`${BACKEND}/latest`);
      const j = await r.json();
      if (j?.status === "ok" && j?.data) {
        setLatestRun(j.data);
        mapCharts(j.data);
      } else {
        setLatestRun(null);
        setEquityData([]);
        setWinLossData([]);
      }
    } catch (e) {
      console.error("fetchLatest err", e);
    }
  }

  function mapCharts(run) {
    // equity: array of {date, portfolio_equity or similar}
    const eq = (run.equity_curve || run.equity || []).map((r) => {
      return {
        date: r.date || r[0] || "",
        portfolio_equity: Number(r.portfolio_equity || r.equity || r[1] || 0)
      };
    });
    setEquityData(eq);

    // win/loss from trades
    const trades = run.trades || [];
    let wins = 0, losses = 0;
    trades.forEach(t => {
      const pnl = Number(t.PnL ?? t.PnL ?? 0);
      if (!isNaN(pnl) && pnl > 0) wins++;
      else losses++;
    });
    const wl = [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
    setWinLossData(wl);
  }

  async function handleGenerateToken() {
    try {
      const r = await fetch(`${BACKEND}/generate_token_url`);
      const j = await r.json();
      if (j.login_url) {
        window.location.href = j.login_url; // Open kite login
      } else {
        setStatusMessage("Failed to get login URL from backend");
      }
    } catch (e) {
      console.error(e);
      setStatusMessage("Failed to call backend /generate_token_url");
    }
  }

  async function handleRunNow() {
    setStatusMessage("");
    if (!tokenOk) {
      setStatusMessage("No Kite access token found. Generate via Login with Kite first.");
      return;
    }
    // start job
    const payload = {
      strategy,
      start_date: startDate,
      end_date: endDate,
      symbols_file: "nifty100.csv"
    };
    try {
      const r = await fetch(`${BACKEND}/run_strategy`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.job_id) {
        setStatusMessage("Backtest started. Polling job...");
        setRunningJob(j.job_id);
        pollJob(j.job_id);
      } else if (j.detail) {
        setStatusMessage("Failed to start: " + j.detail);
      } else {
        setStatusMessage("Unexpected response from run_strategy");
      }
    } catch (e) {
      console.error("run err", e);
      setStatusMessage("Failed to call run_strategy");
    }
  }

  async function pollJob(jobId) {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BACKEND}/job_status/${jobId}`);
        const j = await r.json();
        if (j?.status) {
          setStatusMessage(`Job ${jobId}: ${j.status}`);
          if (j.status === "completed") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setRunningJob(null);
            // fetch latest
            await fetchLatest();
            setStatusMessage("Backtest completed and saved.");
          } else if (j.status === "failed" || j.status === "cancelled") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setRunningJob(null);
            setStatusMessage(`Job ${jobId} ended: ${j.error || j.status}`);
          }
        } else {
          // fallback
          console.warn("unexpected job_status response", j);
        }
      } catch (e) {
        console.error("poll error", e);
      }
    }, 4000);
  }

  async function handleRefreshHistory() {
    await fetchLatest();
    setStatusMessage("History refreshed.");
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 36, marginBottom: 6 }}>⚡ StockBot Dashboard</h1>

      <button onClick={handleGenerateToken} style={{ padding: "8px 14px", marginBottom: 12 }}>
        🔑 Login with Kite
      </button>
      <div style={{ marginBottom: 12 }}>Connected to backend: {connectedBackend}</div>

      <div style={{ marginBottom: 8 }}>
        Strategy{" "}
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value="swing">Swing Strategy (ATR/MACD/RSI)</option>
          <option value="momentum">Momentum (dev)</option>
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        Start Date <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div style={{ marginBottom: 8 }}>
        End Date <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={handleRunNow} style={{ padding: "8px 10px", marginRight: 8 }}>Run Now</button>
        <button onClick={handleRefreshHistory} style={{ padding: "8px 10px" }}>Refresh History</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Last run:</strong> {latestRun ? latestRun.timestamp : "No runs yet"}
      </div>

      <div style={{ marginTop: 10 }}>
        {tokenOk ? <div style={{ color: "green" }}>✅ Kite token generated (preview: {tokenPreview})</div> :
          <div style={{ color: "crimson" }}>❌ No Kite token found</div>}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>📈 Equity Growth</h2>
        {equityData && equityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityData}>
              <XAxis dataKey="date" tickFormatter={(d) => d} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="portfolio_equity" stroke="#00a86b" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div>No equity data available yet — run a backtest to see the curve.</div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>🏅 Win / Loss</h2>
        {winLossData && winLossData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={winLossData} dataKey="value" nameKey="name" outerRadius={80} label>
                {winLossData.map((entry, index) => <Cell key={index} fill={index === 0 ? "#4CAF50" : "#F44336"} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div>No trades yet — run a backtest to populate Win/Loss.</div>
        )}
      </div>

      <div style={{ marginTop: 20, color: "#333" }}>
        <strong>Status:</strong> {statusMessage}
      </div>
      <footer style={{ marginTop: 30, color: "#666" }}>
        © {new Date().getFullYear()} StockBot | FastAPI + React + Render
      </footer>
    </div>
  );
}
