import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://stockbot-backend-39ec.onrender.com";

function shortDate(d) {
  if (!d) return "";
  // Expect d like "2025-11-13T..." or "2025-11-13"
  return d.split("T")[0];
}

export default function App() {
  const [kiteActive, setKiteActive] = useState(false);
  const [latestBacktest, setLatestBacktest] = useState(null);
  const [equityData, setEquityData] = useState([]);
  const [winLossData, setWinLossData] = useState([]);
  const [startDate, setStartDate] = useState("2024-03-01");
  const [endDate, setEndDate] = useState("2025-11-10");
  const [strategy, setStrategy] = useState("swing");
  const [status, setStatus] = useState("");
  const polling = useRef(null);
  const lastFetchTime = useRef(null); // used to detect new runs

  useEffect(() => {
    checkConfig();
    fetchHistory();
    // cleanup on unmount
    return () => {
      if (polling.current) clearInterval(polling.current);
    };
  }, []);

  async function checkConfig() {
    try {
      const r = await fetch(`${BACKEND}/config`);
      const j = await r.json();
      setKiteActive(Boolean(j.kite_token_active));
    } catch (e) {
      console.error("config err", e);
      setKiteActive(false);
    }
  }

  async function fetchHistory() {
    try {
      const r = await fetch(`${BACKEND}/backtests`);
      const j = await r.json();
      if (j.status === "ok" && Array.isArray(j.data) && j.data.length > 0) {
        const first = j.data[0]; // latest
        setLatestBacktest(first);
        mapCharts(first);
        lastFetchTime.current = first.timestamp || null;
      } else {
        setLatestBacktest(null);
        setEquityData([]);
        setWinLossData([]);
      }
    } catch (e) {
      console.error("history err", e);
    }
  }

  function mapCharts(run) {
    const eq = (run.equity_curve || run.equity || []).map(item => {
      // item might be {date, portfolio_equity} or {"date": "2024-01-01", portfolio_equity: 123}
      return {
        date: item.date || item[0] || "",
        portfolio_equity: Number(item.portfolio_equity ?? item.equity ?? item[1] ?? 0)
      };
    });
    setEquityData(eq);

    const trades = run.trades || [];
    let wins = 0, losses = 0;
    trades.forEach(t => {
      const pnl = Number(t.PnL ?? t.PnL ?? 0);
      if (!isNaN(pnl) && pnl > 0) wins++;
      else losses++;
    });

    setWinLossData([{ name: "Wins", value: wins }, { name: "Losses", value: losses }]);
  }

  async function handleLogin() {
    try {
      setStatus("Getting login URL...");
      const r = await fetch(`${BACKEND}/generate_token_url`);
      const j = await r.json();
      if (j.login_url) {
        // redirect to kite login
        window.location.href = j.login_url;
      } else {
        setStatus("Login URL not returned");
      }
    } catch (e) {
      console.error(e);
      setStatus("Failed to reach backend for login");
    }
  }

  async function handleRunNow() {
    setStatus("Starting backtest...");
    try {
      // remember current latest timestamp so we can detect new run
      const prevTs = lastFetchTime.current;

      const payload = {
        strategy,
        start_date: startDate,
        end_date: endDate,
        symbols_file: "nifty100.csv"
      };

      const r = await fetch(`${BACKEND}/run_strategy`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });

      if (r.status === 400) {
        const j = await r.json();
        setStatus("Failed to start: " + (j.detail || j.msg || JSON.stringify(j)));
        return;
      }
      const j = await r.json();
      setStatus("Backtest launched. Polling for results...");

      // poll /backtests until first item's timestamp is different/newer
      if (polling.current) clearInterval(polling.current);
      polling.current = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND}/backtests`);
          const body = await res.json();
          if (body.status === "ok" && Array.isArray(body.data) && body.data.length > 0) {
            const top = body.data[0];
            if (!prevTs || (top.timestamp && top.timestamp !== prevTs)) {
              clearInterval(polling.current);
              polling.current = null;
              setLatestBacktest(top);
              mapCharts(top);
              lastFetchTime.current = top.timestamp;
              setStatus("Backtest completed and loaded.");
            } else {
              setStatus("Waiting for backtest to finish...");
            }
          }
        } catch (err) {
          console.error("poll error", err);
          setStatus("Polling error (see console).");
        }
      }, 3000);

    } catch (e) {
      console.error(e);
      setStatus("Error launching backtest");
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 18, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 34 }}>⚡ StockBot Dashboard</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleLogin} style={{ padding: "8px 12px", marginRight: 10 }}>🔑 Login with Kite</button>
        <span>Connected to backend: <b>{BACKEND}</b></span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Strategy </label>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value="swing">Swing Strategy (ATR/MACD/RSI)</option>
          <option value="momentum">Momentum (dev)</option>
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div>Start Date</div>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div>End Date</div>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={handleRunNow} style={{ padding: "8px 10px", marginRight: 8 }}>Run Now</button>
        <button onClick={fetchHistory} style={{ padding: "8px 10px" }}>Refresh History</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Last run:</strong> {latestBacktest ? new Date(latestBacktest.timestamp).toLocaleString() : "No runs yet"}
      </div>

      <div style={{ marginTop: 8 }}>
        {kiteActive ? <span style={{ color: "green" }}>✅ Kite token generated</span> :
          <span style={{ color: "crimson" }}>❌ No Kite token found</span>}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>📈 Equity Growth</h2>
        {equityData && equityData.length > 0 ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <XAxis dataKey="date" tickFormatter={(d) => shortDate(d)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="portfolio_equity" stroke="#1976D2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>No equity data available yet — run a backtest to see the curve.</div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>🏆 Win / Loss</h2>
        {winLossData && winLossData.length > 0 ? (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={winLossData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {winLossData.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? "#4CAF50" : "#F44336"} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>No trades yet — run a backtest to populate Win/Loss.</div>
        )}
      </div>

      <div style={{ marginTop: 18, color: "#333" }}>
        <strong>Status:</strong> {status}
      </div>

      <footer style={{ marginTop: 36, color: "#666" }}>
        © {new Date().getFullYear()} StockBot | FastAPI + React
      </footer>
    </div>
  );
}
