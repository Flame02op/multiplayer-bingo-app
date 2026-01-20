import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, set, onValue, update } from 'firebase/database';
import { Users, Play, Pause, RotateCcw, Trophy, Grid, Crown, Copy, Check } from 'lucide-react';

const App = () => {
  const [gameState, setGameState] = useState('loading');
  const [playerName, setPlayerName] = useState('');
  const [myId, setMyId] = useState(null);
  const [myCard, setMyCard] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameId, setGameId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCallingNumber, setIsCallingNumber] = useState(false);
  const [aiAnnouncement, setAiAnnouncement] = useState('');

  // Generate a random bingo card
  const generateCard = () => {
    const card = [];
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75]   // O
    ];

    for (let col = 0; col < 5; col++) {
      const column = [];
      const [min, max] = ranges[col];
      const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          column.push({ number: 'FREE', marked: true });
        } else {
          const idx = Math.floor(Math.random() * available.length);
          column.push({ number: available[idx], marked: false });
          available.splice(idx, 1);
        }
      }
      card.push(column);
    }
    return card;
  };

  const generateGameId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Get AI announcement for the called number
  const getAIAnnouncement = async (number, calledCount, players) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      console.warn('⚠️ Gemini API key not found! Using fallback announcements.');
      const fallbacks = [
        `${getLetter(number)}-${number}! We're at ${calledCount} numbers called!`,
        `Here comes ${getLetter(number)}-${number}! Keep those daubers ready, folks!`,
        `${getLetter(number)}-${number}, and the game continues! ${calledCount} down, ${75 - calledCount} to go!`
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    try {
      // Check for close-to-winning players
      const playersArray = Object.values(players);
      let closeCalls = 0;
      playersArray.forEach(player => {
        if (player.card) {
          const card = player.card;
          // Check rows
          for (let row = 0; row < 5; row++) {
            const markedInRow = card.filter(col => col[row]?.marked).length;
            if (markedInRow === 4) closeCalls++;
          }
          // Check columns
          for (let col = 0; col < 5; col++) {
            const markedInCol = card[col]?.filter(cell => cell?.marked).length || 0;
            if (markedInCol === 4) closeCalls++;
          }
        }
      });

      console.log('🤖 Calling Gemini API...');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a charismatic, witty Bingo game host with tons of energy! You're hosting a live game right now.

CURRENT SITUATION:
- Number just called: ${getLetter(number)}-${number}
- Numbers called so far: ${calledCount} out of 75
- Total players: ${playersArray.length}
- Players close to winning: ${closeCalls > 0 ? 'YES! Multiple players are ONE away!' : 'Not yet'}

YOUR JOB: Create ONE fun announcement (2-3 sentences MAX) that:
1. Creatively announces ${getLetter(number)}-${number} with a catchy phrase, rhyme, or fun fact about the number ${number}
2. Add exciting commentary about the game progress

STYLE: Be energetic, funny, and engaging! Use exclamations! Build excitement!

EXAMPLES:
- "B-7, lucky number seven! We're just getting started folks, and I can already feel the energy in the room!"
- "G-52, pick a number, any number! Wow, we're at the halfway mark and someone's getting dangerously close to BINGO!"
- "N-42, the answer to life, the universe, and everything! Three players are just ONE number away - this could be it!"
- "O-69, oh my! The crowd goes wild! We've called ${calledCount} numbers and the tension is absolutely electric!"
- "I-25, quarter of a hundred! Keep your eyes on those cards, folks, victory is within reach!"

Make it unique and exciting for ${getLetter(number)}-${number}! Your announcement:`
            }]
          }],
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 150,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Gemini response:', data);
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const announcement = data.candidates[0].content.parts[0].text.trim();
        console.log('🎙️ AI Generated:', announcement);
        return announcement;
      }
      
      // Fallback messages with variety
      const fallbacks = [
        `${getLetter(number)}-${number}! We're at ${calledCount} numbers - keep those cards ready!`,
        `Here comes ${getLetter(number)}-${number}! ${closeCalls > 0 ? "Someone's really close!" : "Still waiting for that first BINGO!"}`,
        `${getLetter(number)}-${number}, let's go! ${calledCount} down, ${75 - calledCount} to go!`
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
      
    } catch (error) {
      console.error('❌ AI announcement error:', error);
      // Enhanced fallback with number-specific facts
      const numberFacts = {
        7: `${getLetter(number)}-7, lucky number seven! The most popular lucky number worldwide!`,
        11: `${getLetter(number)}-11, legs eleven! Looking good on the board!`,
        13: `${getLetter(number)}-13, some say unlucky but not today! Fortune favors the bold!`,
        21: `${getLetter(number)}-21, blackjack! A winning number in more ways than one!`,
        42: `${getLetter(number)}-42, the answer to everything! Douglas Adams would be proud!`,
        50: `${getLetter(number)}-50, halfway there! We're living on a prayer!`,
        69: `${getLetter(number)}-69! Nice! The crowd is loving this one!`,
        75: `${getLetter(number)}-75, the big one! Top of the board!`,
      };
      
      return numberFacts[number] || `${getLetter(number)}-${number}! Number ${calledCount} is on the board - who's getting close?`;
    }
  };

  // Get game ID from URL or generate new one
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('game') || generateGameId();
    setGameId(id);
    
    if (!urlParams.get('game')) {
      window.history.replaceState({}, '', `?game=${id}`);
    }
  }, []);

  // Listen to game state changes
  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(database, `games/${gameId}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameData(data);
        setGameState('ready');
      } else {
        // Initialize new game
        const newGame = {
          state: 'lobby',
          players: {},
          calledNumbers: [],
          currentNumber: null,
          winners: {},
          hostId: null,
          callSpeed: 3000,
          autoCall: false,
          createdAt: Date.now()
        };
        set(gameRef, newGame);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Join game
  const joinGame = async () => {
    if (!playerName.trim() || !gameData || !gameId) return;
    
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const card = generateCard();
    
    setMyId(id);
    setMyCard(card);

    const newPlayer = {
      id,
      name: playerName.trim(),
      card,
      hasWon: false,
      joinedAt: Date.now()
    };

    const gameRef = ref(database, `games/${gameId}`);
    const updates = {};
    updates[`players/${id}`] = newPlayer;
    
    if (!gameData.hostId) {
      updates.hostId = id;
      setIsHost(true);
    }

    await update(gameRef, updates);
  };

  // Start game (host only)
  const startGame = async () => {
    if (!isHost || !gameData || !gameId) return;
    
    const gameRef = ref(database, `games/${gameId}`);
    const updates = {
      state: 'playing',
      calledNumbers: [],
      currentNumber: null,
      winners: {}
    };

    // Generate new cards for all players
    const players = gameData.players || {};
    Object.keys(players).forEach(playerId => {
      updates[`players/${playerId}/card`] = generateCard();
      updates[`players/${playerId}/hasWon`] = false;
    });

    await update(gameRef, updates);
  };

  // Call number (host only)
  const callNumber = async () => {
    if (!isHost || !gameData || gameData.state !== 'playing' || !gameId) return;
    if (isCallingNumber) return; // Prevent concurrent calls
    
    setIsCallingNumber(true);

    const available = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(n => !(gameData.calledNumbers || []).includes(n));
    
    if (available.length === 0) {
      const gameRef = ref(database, `games/${gameId}`);
      await update(gameRef, { state: 'ended' });
      setIsCallingNumber(false);
      return;
    }

    const next = available[Math.floor(Math.random() * available.length)];
    const newCalledNumbers = [...(gameData.calledNumbers || []), next];
    
    // Get AI announcement
    const players = gameData.players ? Object.values(gameData.players) : [];
    const announcement = await getAIAnnouncement(next, newCalledNumbers.length, players);
    setAiAnnouncement(announcement);
    
    const gameRef = ref(database, `games/${gameId}`);
    const updates = {
      currentNumber: next,
      calledNumbers: newCalledNumbers,
      lastAnnouncement: announcement
    };

    // Mark numbers on all cards
    const playersObj = gameData.players || {};
    Object.keys(playersObj).forEach(playerId => {
      const player = playersObj[playerId];
      if (!player || !player.card) return;
      
      const updatedCard = player.card.map(col => col.map(cell => 
        cell.number === next ? { ...cell, marked: true } : cell
      ));
      updates[`players/${playerId}/card`] = updatedCard;

      // Check for winner
      if (!player.hasWon && checkWin(updatedCard)) {
        updates[`players/${playerId}/hasWon`] = true;
        updates[`winners/${playerId}`] = player;
        updates.state = 'ended';
      }
    });

    try {
      await update(gameRef, updates);
    } catch (error) {
      console.error('Error calling number:', error);
    } finally {
      setIsCallingNumber(false);
    }
  };

  // Check if a card has won
  const checkWin = (card) => {
    if (!card || card.length !== 5) return false;
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      if (card.every(col => col[row] && col[row].marked)) {
        return true;
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      if (card[col] && card[col].every(cell => cell && cell.marked)) {
        return true;
      }
    }

    // Check diagonals
    if (card.every((col, i) => col[i] && col[i].marked) ||
        card.every((col, i) => col[4 - i] && col[4 - i].marked)) {
      return true;
    }

    return false;
  };

  // Toggle auto-call (host only)
  const toggleAutoCall = async () => {
    if (!isHost || !gameData || !gameId) return;
    
    const gameRef = ref(database, `games/${gameId}`);
    await update(gameRef, { autoCall: !gameData.autoCall });
  };

  // Reset game (host only)
  const resetGame = async () => {
    if (!isHost || !gameData || !gameId) return;

    const gameRef = ref(database, `games/${gameId}`);
    const updates = {
      state: 'lobby',
      calledNumbers: [],
      currentNumber: null,
      winners: {},
      autoCall: false
    };

    const players = gameData.players || {};
    Object.keys(players).forEach(playerId => {
      updates[`players/${playerId}/hasWon`] = false;
    });

    await update(gameRef, updates);
  };

  // Update call speed (host only)
  const updateCallSpeed = async (speed) => {
    if (!isHost || !gameData || !gameId) return;
    
    const gameRef = ref(database, `games/${gameId}`);
    await update(gameRef, { callSpeed: speed });
  };

  // Copy game link
  const copyGameLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-call numbers
  useEffect(() => {
    if (!isHost || !gameData || !gameData.autoCall || gameData.state !== 'playing') return;

    const interval = setInterval(() => {
      if (!isCallingNumber) {
        callNumber();
      }
    }, gameData.callSpeed || 3000);

    return () => clearInterval(interval);
  }, [isHost, gameData?.autoCall, gameData?.state, gameData?.callSpeed, isCallingNumber]);

  // Update my card when game updates
  useEffect(() => {
    if (myId && gameData && gameData.players && gameData.players[myId]) {
      const myPlayer = gameData.players[myId];
      if (myPlayer.card) {
        setMyCard(myPlayer.card);
      }
      if (myPlayer.id === gameData.hostId) {
        setIsHost(true);
      }
    }
    // Update AI announcement for all players
    if (gameData?.lastAnnouncement) {
      setAiAnnouncement(gameData.lastAnnouncement);
    }
  }, [gameData, myId]);

  const getLetter = (num) => {
    if (num === 'FREE') return 'N';
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  if (gameState === 'loading' || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  const inGame = myId !== null;
  const players = gameData.players ? Object.values(gameData.players) : [];
  const winners = gameData.winners ? Object.values(gameData.winners) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2">🎯 Multiplayer Bingo</h1>
          <p className="text-purple-200">Real-time Bingo for 60-70 Players</p>
          <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-3 inline-block">
            <div className="text-white font-mono text-lg mb-2">Game ID: {gameId}</div>
            <button
              onClick={copyGameLink}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            >
              {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy Game Link</>}
            </button>
          </div>
        </div>

        {/* Join Game Form */}
        {!inGame && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Join the Game</h2>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg mb-4 text-lg"
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
            />
            <button
              onClick={joinGame}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-lg"
            >
              Join Game
            </button>
            <div className="text-white text-center mt-4">
              {players.length} players in lobby
            </div>
          </div>
        )}

        {/* Game Controls */}
        {inGame && (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users className="text-white" size={24} />
                  <span className="text-white font-semibold text-lg">
                    {players.length} Players
                  </span>
                  {isHost && (
                    <span className="bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Crown size={16} /> HOST
                    </span>
                  )}
                </div>

                {isHost && gameData.state === 'lobby' && (
                  <button
                    onClick={startGame}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Play size={20} /> Start Game
                  </button>
                )}

                {isHost && (gameData.state === 'playing' || gameData.state === 'ended') && (
                  <div className="flex gap-2 flex-wrap">
                    {gameData.state === 'playing' && (
                      <>
                        <button
                          onClick={toggleAutoCall}
                          className={`${gameData.autoCall ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2`}
                        >
                          {gameData.autoCall ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Auto</>}
                        </button>
                        <button
                          onClick={callNumber}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold"
                        >
                          Call Number
                        </button>
                      </>
                    )}
                    <button
                      onClick={resetGame}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                      <RotateCcw size={20} /> New Game
                    </button>
                  </div>
                )}
              </div>

              {/* Speed Control */}
              {isHost && gameData.state === 'playing' && (
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Auto-call Speed: {gameData.callSpeed / 1000}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={gameData.callSpeed}
                    onChange={(e) => updateCallSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Game Status */}
            {gameData.state === 'lobby' && (
              <div className="bg-blue-500/20 backdrop-blur-lg rounded-2xl p-6 mb-6 text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  Waiting for host to start the game...
                </div>
                <div className="text-blue-200">
                  {isHost ? "You're the host! Click Start Game when ready." : "The host will start the game soon."}
                </div>
              </div>
            )}

            {/* Current Number Display */}
            {gameData.currentNumber && gameData.state === 'playing' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 text-center">
                <div className="text-6xl font-bold text-white mb-4">
                  {getLetter(gameData.currentNumber)}-{gameData.currentNumber}
                </div>
                {aiAnnouncement && (
                  <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur rounded-xl p-4 mb-4 border-2 border-yellow-400/50">
                    <div className="text-yellow-300 text-sm font-semibold mb-1">🎙️ AI HOST</div>
                    <div className="text-white text-lg font-medium italic">
                      "{aiAnnouncement}"
                    </div>
                  </div>
                )}
                <div className="text-purple-200">
                  {(gameData.calledNumbers || []).length} of 75 numbers called
                </div>
              </div>
            )}

            {/* Winners Display */}
            {winners.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="text-white" size={32} />
                  <h2 className="text-2xl font-bold text-white">Winners!</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {winners.map(w => (
                    <div key={w.id} className="bg-white/20 backdrop-blur rounded-lg p-3 text-white font-semibold">
                      🎉 {w.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* My Card */}
              {myCard && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Grid size={24} /> Your Card
                  </h3>
                  <div className="bg-white rounded-xl p-4">
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {['B', 'I', 'N', 'G', 'O'].map(letter => (
                        <div key={letter} className="text-center font-bold text-xl text-purple-600">
                          {letter}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[0, 1, 2, 3, 4].map(row => (
                        myCard.map((col, colIdx) => {
                          const cell = col[row];
                          return (
                            <div
                              key={`${colIdx}-${row}`}
                              className={`aspect-square flex items-center justify-center rounded-lg text-lg font-bold ${
                                cell.marked
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              } ${cell.number === 'FREE' ? 'bg-yellow-400 text-gray-800' : ''}`}
                            >
                              {cell.number}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Called Numbers */}
              {gameData.state !== 'lobby' && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Called Numbers</h3>
                  <div className="grid grid-cols-8 gap-2 max-h-96 overflow-y-auto">
                    {(gameData.calledNumbers || []).map(num => (
                      <div
                        key={num}
                        className={`aspect-square flex items-center justify-center rounded-lg font-bold ${
                          num === gameData.currentNumber
                            ? 'bg-yellow-400 text-gray-800 animate-pulse'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Players List */}
            {players.length > 0 && (
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Players ({players.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-60 overflow-y-auto">
                  {players.map(p => (
                    <div
                      key={p.id}
                      className={`rounded-lg p-3 text-center font-semibold ${
                        p.hasWon
                          ? 'bg-yellow-400 text-gray-800'
                          : p.id === myId
                          ? 'bg-green-500/40 text-white border-2 border-green-400'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {p.hasWon && '👑 '}{p.id === gameData.hostId && '⭐ '}{p.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;