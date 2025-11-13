/* ---------- src/App.jsx ---------- */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://stockbot-backend-39ec.onrender.com';

const colors = { win: '#2ecc71', loss: '#e74c3c', neutral: '#95a5a6' };

export default function App(){
  const [kiteUrl, setKiteUrl] = useState('');
  const [tokenOk, setTokenOk] = useState(false);
  const [startDate, setStartDate] = useState('2024-03-01');
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusMsg, setStatusMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [equityData, setEquityData] = useState([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [history, setHistory] = useState([]);
  const [strategy, setStrategy] = useState('swing');

  useEffect(()=>{ checkHealth(); fetchHistory(); }, []);

  async function checkHealth(){
    try{
      const r = await fetch(`${BACKEND}/health`);
      const j = await r.json();
      setTokenOk(Boolean(j.token_valid));
    }catch(e){
      console.error('health', e);
      setStatusMsg('Failed to contact backend');
    }
  }

  async function fetchKiteLogin(){
    try{
      const r = await fetch(`${BACKEND}/generate_token_url`);
      const j = await r.json();
      if(j.login_url){
        // open login in new tab
        window.open(j.login_url, '_blank');
        setStatusMsg('Opened Kite login — complete and return here');
      } else setStatusMsg('Could not get login URL');
    }catch(e){ setStatusMsg('Error fetching login URL'); }
  }

  async function runBacktest(){
    setRunning(true); setStatusMsg('Starting backtest...');
    try{
      const body = { strategy, start_date: startDate, end_date: endDate, symbols_file: 'nifty100.csv' };
      const r = await fetch(`${BACKEND}/run_strategy`, { method: 'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json();
      if(j.status === 'started'){
        setStatusMsg('Backtest launched in background — refresh history in a moment');
        setRunning(false);
        setTimeout(()=>fetchHistory(), 4000);
      } else setStatusMsg('Failed to start backtest');
    }catch(e){ setStatusMsg('Error starting backtest'); setRunning(false); }
  }

  async function fetchHistory(){
    try{
      const r = await fetch(`${BACKEND}/backtests`);
      const j = await r.json();
      if(j.status === 'ok'){
        setHistory(j.data || []);
        if(j.data && j.data.length){
          const latest = j.data[0];
          setEquityData(latest.equity_curve || []);
          const t = latest.trades || [];
          const w = t.filter(x=>x.PnL>0).length;
          const l = t.filter(x=>x.PnL<=0).length;
          setWins(w); setLosses(l);
        }
      }
    }catch(e){ console.error('history', e); }
  }

  const pieData = [{ name:'Wins', value:wins }, { name:'Losses', value:losses }];

  return (
    <div className="container">
      <header>
        <h1>⚡ StockBot Dashboard</h1>
        <div className="controls">
          <button onClick={fetchKiteLogin}>🔑 Login with Kite</button>
          <div className="token">{ tokenOk ? '✅ Kite token present' : '❌ No Kite token' }</div>
        </div>
      </header>

      <section className="form">
        <label>Strategy
          <select value={strategy} onChange={e=>setStrategy(e.target.value)}>
            <option value="swing">Swing Strategy (ATR/MACD/RSI)</option>
            <option value="momentum">Momentum (fast)</option>
          </select>
        </label>

        <label>Start Date
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </label>

        <label>End Date
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </label>

        <div className="actions">
          <button onClick={runBacktest} disabled={running}>Run Now</button>
          <button onClick={fetchHistory}>Refresh History</button>
        </div>
        <div className="status">{statusMsg}</div>
      </section>

      <section className="charts">
        <h2>📈 Equity Growth</h2>
        {equityData && equityData.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityData.map(d=>({ date: d.date, equity: d.portfolio_equity }))}>
              <XAxis dataKey="date" tickFormatter={d=>dayjs(d).format('MM/DD')} />
              <YAxis />
              <Tooltip labelFormatter={l=>dayjs(l).format('YYYY-MM-DD')} />
              <Line type="monotone" dataKey="equity" stroke="#16a085" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">No equity data available yet — run a backtest.</div>
        )}

        <h2>🏅 Win / Loss</h2>
        { (wins+losses) > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={90} label>
                {pieData.map((entry, idx)=> (
                  <Cell key={`c-${idx}`} fill={entry.name==='Wins' ? colors.win : colors.loss} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">No trades yet — run a backtest to populate Win/Loss.</div>
        )}
      </section>

      <footer>
        <div>© 2025 StockBot | FastAPI + React + Render</div>
      </footer>
    </div>
  );
}
