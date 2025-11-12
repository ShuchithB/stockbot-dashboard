import React, { useState } from "react";
import axios from "axios";

const API_BASE = "https://YOUR_RENDER_BACKEND_URL"; // replace after backend deploy

export default function App(){
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [summary, setSummary] = useState(null);

  function openKiteLogin(){
    if(!apiKey){ alert("Enter API Key first"); return; }
    window.open(`https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`,"_blank");
  }

  async function exchangeRequestToken(){
    try{
      setStatusMsg("Exchanging request token...");
      const res = await axios.post(`${API_BASE}/kite/exchange`,{
        api_key: apiKey, api_secret: apiSecret, request_token: requestToken
      });
      setAccessToken(res.data.access_token);
      setStatusMsg("Access token obtained.");
    }catch(err){
      setStatusMsg("Exchange failed: "+(err.response?.data?.detail||err.message));
    }
  }

  async function runOnce(){
    try{
      setStatusMsg("Running backtest...");
      const res = await axios.post(`${API_BASE}/run_once`,{api_key:apiKey,access_token:accessToken});
      setSummary(res.data.summary);
      setStatusMsg("Run complete.");
    }catch(err){
      setStatusMsg("Run failed: "+(err.response?.data?.detail||err.message));
    }
  }

  return (
    <div style={{maxWidth:900,margin:"24px auto",fontFamily:"system-ui"}}>
      <h1>StockBot Dashboard</h1>
      <label>API Key<input value={apiKey} onChange={e=>setApiKey(e.target.value)} /></label>
      <label>API Secret<input value={apiSecret} onChange={e=>setApiSecret(e.target.value)} /></label>
      <button onClick={openKiteLogin}>Open Kite Login</button>
      <label>Request Token<input value={requestToken} onChange={e=>setRequestToken(e.target.value)} /></label>
      <button onClick={exchangeRequestToken}>Exchange Request Token</button>
      <label>Access Token<input value={accessToken} readOnly /></label>
      <button onClick={runOnce}>Run Once</button>
      <p><b>Status:</b> {statusMsg}</p>
      {summary && <pre>{JSON.stringify(summary,null,2)}</pre>}
    </div>
  );
}
