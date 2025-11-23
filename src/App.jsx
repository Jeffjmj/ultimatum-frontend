import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Eye, EyeOff, Shield, Database, Play, 
  RotateCcw, CheckCircle, Download, Trash2, RefreshCw, FileText 
} from 'lucide-react';

// ==========================================
// 🔴 IMPORTANT: PASTE YOUR RAILWAY URL HERE
// ==========================================
const API_URL = "https://ultimatum-production.up.railway.app"; 

const ENDOWMENT = 10;

const GameApp = () => {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // App State
  const [gameState, setGameState] = useState({
    status: 'LOBBY',
    round: 0,
    sub_round: 1,
    treatment: 1,
    pairings: {}
  });
  
  const [myGame, setMyGame] = useState(null);
  const [myPlayerInfo, setMyPlayerInfo] = useState(null);
  const [roleInfo, setRoleInfo] = useState({});
  const [playerCount, setPlayerCount] = useState(0);
  const [fullData, setFullData] = useState(null);

  // --- Polling ---
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const amIResearcher = myPlayerInfo?.role === 'RESEARCHER';
        if (amIResearcher) {
          const response = await fetch(`${API_URL}/export_data`);
          if (response.ok) {
            const data = await response.json();
            setFullData(data);
            setGameState(data.final_state);
            setPlayerCount(Object.keys(data.all_players || {}).length);
          }
        } else {
          const response = await fetch(`${API_URL}/state?uid=${userId}`);
          if (response.ok) {
            const data = await response.json();
            setGameState(data.global);
            setMyPlayerInfo(data.me);
            setMyGame(data.my_game);
            setRoleInfo(data.role_info);
            setPlayerCount(data.all_players_count);
          }
        }
      } catch (error) {
        console.error("Connection error:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [userId, myPlayerInfo?.role]);


  // --- Actions ---
  const registerUser = async () => {
    if (!userName.trim()) return;
    setLoading(true);
    const newUid = crypto.randomUUID();
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: newUid, name: userName })
      });
      if (res.ok) {
          const data = await res.json();
          setMyPlayerInfo(data.player);
          setUserId(newUid);
      }
    } catch (e) {
      alert("Error connecting to server.");
    }
    setLoading(false);
  };

  const handleResearcherAction = async (action) => {
    let endpoint = '';
    let body = {};

    if (action === 'START_T1') {
      endpoint = '/admin/start_treatment';
      body = { treatment: 1 };
    } else if (action === 'START_T2') {
      endpoint = '/admin/start_treatment';
      body = { treatment: 2 };
    } else if (action === 'NEXT_ROUND') {
      endpoint = '/admin/next_round';
    } else if (action === 'RESET_SERVER') {
      if(!confirm("⚠️ ARE YOU SURE? This will delete all data.")) return;
      endpoint = '/reset_server';
    }

    await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if(action === 'RESET_SERVER') window.location.reload(); 
  };

  const downloadData = () => {
    if (!fullData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `experiment_data_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const makeOffer = async (amount) => {
    if (!myGame) return;
    await fetch(`${API_URL}/game/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: myGame.id, amount: amount })
    });
  };

  const respondToOffer = async (accepted) => {
    if (!myGame) return;
    await fetch(`${API_URL}/game/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: myGame.id, accepted: accepted })
    });
  };


  // --- Views ---

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="mb-6 flex items-center justify-center">
            <Database className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">Ultimatum Game</h1>
          <p className="mb-6 text-center text-slate-500">
            Enter your name to join. <br/>
            <span className="text-xs text-slate-400">(First 3 logins become Admins)</span>
          </p>
          <input type="text" placeholder="Full Name" className="mb-6 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500" value={userName} onChange={(e) => setUserName(e.target.value)} />
          <button onClick={registerUser} disabled={!userName || loading} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Connecting..." : "Join Experiment"}
          </button>
          {API_URL.includes("INSERT") && <p className="mt-4 text-center text-xs text-red-500 font-bold">⚠️ SET API_URL IN CODE</p>}
        </div>
      </div>
    );
  }

  // Researcher Dashboard
  if (myPlayerInfo?.role === 'RESEARCHER') {
    const gamesList = fullData?.all_games ? Object.values(fullData.all_games) : [];
    const playersList = fullData?.all_players || {};
    
    // Sort by creation time (Newest first)
    const sortedGames = gamesList.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <header className="mb-6 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Researcher Dashboard</h1>
            <p className="text-sm text-slate-500">Status: <span className="font-mono text-blue-600">{gameState.status}</span></p>
          </div>
          <div className="text-right">
             <div className="text-2xl font-bold text-blue-600">{playerCount}</div>
             <div className="text-xs text-slate-500">Online</div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Play className="w-4 h-4"/> Flow Controls</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => handleResearcherAction('START_T1')} disabled={gameState.status === 'TREATMENT_1'} className="rounded-lg bg-blue-50 p-4 text-blue-700 hover:bg-blue-100 disabled:opacity-50 text-left border border-blue-100">
                <div className="font-bold">1. Start Anonymous</div>
              </button>
              <button onClick={() => handleResearcherAction('START_T2')} disabled={gameState.status === 'TREATMENT_2'} className="rounded-lg bg-purple-50 p-4 text-purple-700 hover:bg-purple-100 disabled:opacity-50 text-left border border-purple-100">
                 <div className="font-bold">2. Start Known</div>
              </button>
              <button onClick={() => handleResearcherAction('NEXT_ROUND')} className="rounded-lg bg-slate-800 p-4 text-white hover:bg-slate-900 text-left shadow-lg">
                 <div className="font-bold">Next Round</div>
                 <div className="text-xs text-slate-400">Current: {gameState.sub_round}/4</div>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
             <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Database className="w-4 h-4"/> Admin</h2>
             <div className="space-y-3">
               <button onClick={downloadData} className="flex w-full items-center justify-between rounded bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100">
                 <span>Download Data</span> <Download className="w-4 h-4"/>
               </button>
               <button onClick={() => handleResearcherAction('RESET_SERVER')} className="flex w-full items-center justify-between rounded bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 border border-red-100">
                 <span>Reset Server</span> <Trash2 className="w-4 h-4"/>
               </button>
             </div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
             <h2 className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400"/> Live Game Feed</h2>
             <span className="text-xs font-mono text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Live</span>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Round</th>
                  <th className="px-6 py-3">Proposer</th>
                  <th className="px-6 py-3">Offer</th>
                  <th className="px-6 py-3">Responder</th>
                  <th className="px-6 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedGames.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No games played yet.</td></tr>
                ) : (
                  sortedGames.map((g) => {
                    const pName = playersList[g.proposer]?.name || '...';
                    const rName = playersList[g.responder]?.name || '...';
                    return (
                      <tr key={g.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-mono text-xs"><span className="rounded bg-slate-200 px-1">T{g.treatment}</span> R{g.round}</td>
                         <td className="px-6 py-4 font-medium text-blue-700">{pName}</td>
                         <td className="px-6 py-4 font-bold">{g.offer !== null ? `$${g.offer}` : '...'}</td>
                         <td className="px-6 py-4 font-medium text-purple-700">{rName}</td>
                         <td className="px-6 py-4">
                            {g.status === 'COMPLETED' ? (
                               <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.response === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{g.response}</span>
                            ) : <span className="text-slate-400 text-xs">Active</span>}
                         </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Lobby (Participant)
  if (gameState.status === 'LOBBY' || gameState.status === 'WAITING_NEXT_PHASE') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-center">
        <div className="animate-pulse rounded-full bg-blue-100 p-6"><RotateCcw className="h-10 w-10 text-blue-600" /></div>
        <h2 className="mt-6 text-xl font-bold text-slate-800">Waiting for Researcher...</h2>
        <p className="mt-8 rounded-full bg-slate-200 px-4 py-1 text-xs text-slate-500">ID: {userId}</p>
      </div>
    );
  }

  // Active Game (Participant View)
  const role = roleInfo?.role;
  const partnerName = roleInfo?.partner_name;
  const displayName = gameState.treatment === 1 ? "Anonymous Partner" : partnerName;
  const displayIcon = gameState.treatment === 1 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">Treatment {gameState.treatment}</span>
            <span className="ml-2 text-sm text-slate-600">Round {gameState.sub_round}</span>
          </div>
          <div className="font-semibold text-slate-700">{userName} (You)</div>
        </div>
      </div>

      <main className="mx-auto mt-8 w-full max-w-xl px-4">
        <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opponent</span>
             <span className="text-slate-400">{displayIcon}</span>
           </div>
           <div className="p-6 text-center">
             <div className="text-2xl font-bold text-slate-800">{displayName}</div>
           </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-800">${ENDOWMENT}</h2>
            <p className="text-slate-500">Total Pot</p>
          </div>

          {!myGame ? (
             <div className="text-center text-slate-500">Loading round...</div>
          ) : (
            <>
              {role === 'PROPOSER' && (
                <>
                  <h3 className="mb-4 text-xl font-semibold text-blue-600">You are the Proposer</h3>
                  {myGame.status === 'WAITING_OFFER' && (
                    <div className="grid grid-cols-5 gap-2">
                       {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((amt) => (
                         <button key={amt} onClick={() => makeOffer(amt)} className="rounded bg-blue-50 py-3 font-bold text-blue-600 hover:bg-blue-600 hover:text-white">${amt}</button>
                       ))}
                    </div>
                  )}
                  {myGame.status === 'OFFER_MADE' && (
                    <div className="rounded bg-yellow-50 p-4 text-center text-yellow-800">Waiting for partner...</div>
                  )}
                </>
              )}

              {role === 'RESPONDER' && (
                <>
                  <h3 className="mb-4 text-xl font-semibold text-purple-600">You are the Responder</h3>
                  {myGame.status === 'WAITING_OFFER' && <p className="text-center text-slate-500">Waiting for offer...</p>}
                  {myGame.status === 'OFFER_MADE' && (
                    <div className="text-center">
                      <div className="mb-6 text-4xl font-bold text-green-600">${myGame.offer}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => respondToOffer(true)} className="rounded-xl bg-green-600 py-4 font-bold text-white">Accept</button>
                        <button onClick={() => respondToOffer(false)} className="rounded-xl bg-red-500 py-4 font-bold text-white">Reject</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {myGame.status === 'COMPLETED' && (
                 <div className="text-center mt-4 p-4 bg-slate-50 rounded">
                    <p className="font-bold text-lg">{myGame.response}</p>
                    <p>You earned: ${myGame.earnings[userId]}</p>
                 </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default GameApp;
