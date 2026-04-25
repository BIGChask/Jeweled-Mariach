'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TokenIcon, TokenType } from '@/components/Tokens';
import { PapelPicado } from '@/components/Decorations';
import { initAudio, playSwapSound, playMatchSound, playErrorSound } from '@/lib/audio';

const GRID_SIZE = 8;
const TOKEN_TYPES: TokenType[] = ['blue', 'green', 'heart', 'marigold', 'purple', 'yellow'];

interface TileState {
  id: string;
  type: TokenType;
  x: number;
  y: number;
  isMatched: boolean;
  isNew?: boolean;
  power?: 'bomb' | 'color' | 'cross';
}

const uuid = () => Math.random().toString(36).substr(2, 9);

function getRandomType(): TokenType {
  return TOKEN_TYPES[Math.floor(Math.random() * TOKEN_TYPES.length)];
}

const getMatches = (currentBoard: TileState[]) => {
  let matchedIds = new Set<string>();
  let matchGroups: Set<string>[] = [];
  const getTile = (x: number, y: number) => currentBoard.find(t => t.x === x && t.y === y && !t.isMatched);

  // Horizontal
  for (let y = 0; y < GRID_SIZE; y++) {
    let x = 0;
    while (x < GRID_SIZE - 2) {
      let t1 = getTile(x, y);
      if (!t1) { x++; continue; }
      let matchLength = 1;
      while (x + matchLength < GRID_SIZE) {
        let tNext = getTile(x + matchLength, y);
        if (tNext && tNext.type === t1.type) matchLength++;
        else break;
      }
      if (matchLength >= 3) {
        let group = new Set<string>();
        for (let i = 0; i < matchLength; i++) {
          let t = getTile(x + i, y)!;
          matchedIds.add(t.id);
          group.add(t.id);
        }
        matchGroups.push(group);
      }
      x += matchLength;
    }
  }

  // Vertical
  for (let x = 0; x < GRID_SIZE; x++) {
    let y = 0;
    while (y < GRID_SIZE - 2) {
      let t1 = getTile(x, y);
      if (!t1) { y++; continue; }
      let matchLength = 1;
      while (y + matchLength < GRID_SIZE) {
        let tNext = getTile(x, y + matchLength);
        if (tNext && tNext.type === t1.type) matchLength++;
        else break;
      }
      if (matchLength >= 3) {
        let group = new Set<string>();
        for (let i = 0; i < matchLength; i++) {
          let t = getTile(x, y + i)!;
          matchedIds.add(t.id);
          group.add(t.id);
        }
        matchGroups.push(group);
      }
      y += matchLength;
    }
  }

  // Merge intersecting groups
  let mergedGroups: Set<string>[] = [];
  for (let group of matchGroups) {
    let merged = false;
    for (let mGroup of mergedGroups) {
      let intersection = new Set([...group].filter(x => mGroup.has(x)));
      if (intersection.size > 0) {
        group.forEach(id => mGroup.add(id));
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedGroups.push(new Set(group));
    }
  }

  return { matchedIds: Array.from(matchedIds), matchGroups: mergedGroups };
};

export default function MariachiMatch() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<'classic' | 'time_attack' | 'zen'>('classic');
  const [timeLeft, setTimeLeft] = useState(60);

  const [board, setBoard] = useState<TileState[]>([]);
  const [particles, setParticles] = useState<{id: string, x: number, y: number, color: string}[]>([]);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);

  const [isProcessing, setIsProcessing] = useState(true);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState(50);

  useEffect(() => {
    const updateSize = () => {
      if (boardRef.current) {
        setTileSize(boardRef.current.offsetWidth / GRID_SIZE);
      }
    };
    updateSize();
    // A small delay to ensure rendering is complete before measuring
    setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const initBoard = () => {
    let initialBoard: TileState[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let type;
        do {
          type = getRandomType();
        } while (
          (x >= 2 && initialBoard.find(t => t.x === x - 1 && t.y === y)?.type === type && initialBoard.find(t => t.x === x - 2 && t.y === y)?.type === type) ||
          (y >= 2 && initialBoard.find(t => t.x === x && t.y === y - 1)?.type === type && initialBoard.find(t => t.x === x && t.y === y - 2)?.type === type)
        );
        
        initialBoard.push({ id: uuid(), type, x, y, isMatched: false });
      }
    }
    setBoard(initialBoard);
    setIsProcessing(false);
  };

  useEffect(() => {
    initBoard();
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'time_attack') {
      if (timeLeft <= 0) {
        setGameState('gameover');
        return;
      }
      const timer = setInterval(() => {
         setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, gameMode, timeLeft]);

  const startGame = (mode: 'classic' | 'time_attack' | 'zen') => {
    initAudio();
    setGameMode(mode);
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    initBoard();
    setGameState('playing');
  };

  const processMatches = async (currentBoard: TileState[], currentCombo: number, swapInfo?: {id1: string, id2: string}, explicitDestruction?: string[]) => {
    setIsProcessing(true);
    let matchedIdsArr: string[] = [];
    let matchGroups: Set<string>[] = [];
    let newPowersToSpawn: any[] = [];
    
    if (explicitDestruction) {
       matchedIdsArr = explicitDestruction;
    } else {
       const res = getMatches(currentBoard);
       matchedIdsArr = res.matchedIds;
       matchGroups = res.matchGroups;
    }

    if (matchedIdsArr.length === 0) {
      setIsProcessing(false);
      setCombo(1);
      return;
    }

    let toDestroy = new Set<string>(matchedIdsArr);
    let queue = Array.from(toDestroy);

    if (!explicitDestruction) {
        for (let group of matchGroups) {
            let size = group.size;
            let powerTargetId: string | null = null;
            if (swapInfo) {
               let swappedId = group.has(swapInfo.id1) ? swapInfo.id1 : group.has(swapInfo.id2) ? swapInfo.id2 : null;
               if (swappedId) powerTargetId = swappedId;
            }
            if (!powerTargetId) {
               powerTargetId = Array.from(group)[0];
            }
            let targetObj = currentBoard.find(t => t.id === powerTargetId);
            if (!targetObj) continue;

            if (size === 4) {
                newPowersToSpawn.push({ id: powerTargetId, type: targetObj.type, power: 'bomb' });
                toDestroy.delete(powerTargetId);
                queue = queue.filter(q => q !== powerTargetId);
            } else if (size === 5) {
                newPowersToSpawn.push({ id: powerTargetId, type: targetObj.type, power: 'color' });
                toDestroy.delete(powerTargetId);
                queue = queue.filter(q => q !== powerTargetId);
            } else if (size >= 6) {
                newPowersToSpawn.push({ id: powerTargetId, type: targetObj.type, power: 'cross' });
                toDestroy.delete(powerTargetId);
                queue = queue.filter(q => q !== powerTargetId);
            }
        }
    }

    // Now propagate explosions
    while(queue.length > 0) {
        let currentId = queue.shift()!;
        let tile = currentBoard.find(t => t.id === currentId);
        if (!tile) continue;

        if (tile.power === 'bomb') {
           for(let dx=-1; dx<=1; dx++) {
             for(let dy=-1; dy<=1; dy++) {
                let neighbor = currentBoard.find(t => t.x === tile!.x + dx && t.y === tile!.y + dy);
                if (neighbor && !toDestroy.has(neighbor.id) && !newPowersToSpawn.find(p => p.id === neighbor.id)) {
                    toDestroy.add(neighbor.id);
                    queue.push(neighbor.id);
                }
             }
           }
        } else if (tile.power === 'cross') {
           for(let i=0; i<GRID_SIZE; i++) {
               let rId = currentBoard.find(t => t.x === i && t.y === tile!.y)?.id;
               let cId = currentBoard.find(t => t.x === tile!.x && t.y === i)?.id;
               if (rId && !toDestroy.has(rId) && !newPowersToSpawn.find(p => p.id === rId)) { toDestroy.add(rId); queue.push(rId); }
               if (cId && !toDestroy.has(cId) && !newPowersToSpawn.find(p => p.id === cId)) { toDestroy.add(cId); queue.push(cId); }
           }
        } else if (tile.power === 'color') {
            let randomType = TOKEN_TYPES[Math.floor(Math.random()*TOKEN_TYPES.length)];
            let targets = currentBoard.filter(t => t.type === randomType);
            for (let target of targets) {
                if (!toDestroy.has(target.id) && !newPowersToSpawn.find(p => p.id === target.id)) {
                    toDestroy.add(target.id);
                    queue.push(target.id);
                }
            }
        }
    }

    let finalDestroyList = Array.from(toDestroy);
    playMatchSound(currentCombo);

    let boardWithMatches = currentBoard.map(t => {
      let spawn = newPowersToSpawn.find(p => p.id === t.id);
      if (spawn) {
         return { ...t, power: spawn.power, isMatched: false };
      }
      if (finalDestroyList.includes(t.id)) {
         return { ...t, isMatched: true };
      }
      return t;
    });

    setBoard(boardWithMatches);
    setScore(s => s + (finalDestroyList.length * 10 * currentCombo));

    if (currentCombo > 1 && finalDestroyList.length > 0) {
        let newParticles: any[] = [];
        for (let id of finalDestroyList) {
            const t = currentBoard.find(x => x.id === id);
            if (t) {
                for (let i=0; i<3; i++) {
                    newParticles.push({
                        id: uuid(),
                        x: t.x * tileSize + tileSize / 2,
                        y: t.y * tileSize + tileSize / 2,
                        color: ['#e91e63','#ff9800','#00bcd4','#8bc34a','#ffeb3b'][Math.floor(Math.random()*5)]
                    });
                }
            }
        }
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
        }, 1000);
    }


    // Wait for disappear animation
    await new Promise(res => setTimeout(res, 300));

    let nextBoard: TileState[] = [];
    
    for (let x = 0; x < GRID_SIZE; x++) {
      let columnTiles = boardWithMatches
        .filter(t => t.x === x && !t.isMatched)
        .sort((a, b) => b.y - a.y);
      
      let newY = GRID_SIZE - 1;
      
      for (let tile of columnTiles) {
        nextBoard.push({ ...tile, y: newY-- });
      }

      while (newY >= 0) {
        nextBoard.push({
          id: uuid(),
          type: getRandomType(),
          x,
          y: newY--,
          isMatched: false,
          isNew: true
        });
      }
    }

    setBoard(nextBoard);
    
    // Wait for fall animation before cascading
    await new Promise(res => setTimeout(res, 350));
    
    // Remove isNew flag so they don't animate from top next render if they move horizontally
    const cleanedBoard = nextBoard.map(t => ({ ...t, isNew: false }));
    
    // Continue processing if there are new cascades
    setBoard(cleanedBoard);
    const futureMatches = getMatches(cleanedBoard);
    if(futureMatches.matchedIds.length > 0) {
        await new Promise(res => setTimeout(res, 100)); // slight pause before cascade pop
        processMatches(cleanedBoard, currentCombo + 1);
    } else {
        setIsProcessing(false);
    }
  };

  const handleSwap = async (x1: number, y1: number, x2: number, y2: number) => {
    if (isProcessing) return;
    
    const isAdjacent = (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);
    if (!isAdjacent) {
      setSelected({ x: x2, y: y2 });
      return;
    }

    setIsProcessing(true);
    setSelected(null);

    const t1 = board.find(t => t.x === x1 && t.y === y1);
    const t2 = board.find(t => t.x === x2 && t.y === y2);
    
    if (!t1 || !t2) return setIsProcessing(false);

    let tempBoard = board.map(t => {
      if (t.id === t1.id) return { ...t, x: x2, y: y2 };
      if (t.id === t2.id) return { ...t, x: x1, y: y1 };
      return t;
    });

    playSwapSound();
    
    let explicitDestroy: string[] = [];
    if (t1.power === 'color') {
        explicitDestroy.push(t1.id);
        tempBoard.filter(t => t.type === t2.type).forEach(t => explicitDestroy.push(t.id));
    } else if (t2.power === 'color') {
        explicitDestroy.push(t2.id);
        tempBoard.filter(t => t.type === t1.type).forEach(t => explicitDestroy.push(t.id));
    }

    if (explicitDestroy.length > 0) {
        setBoard(tempBoard);
        await new Promise(res => setTimeout(res, 250)); // let swap finish
        processMatches(tempBoard, 1, {id1: t1.id, id2: t2.id}, explicitDestroy);
        return;
    }

    setBoard(tempBoard);
    await new Promise(res => setTimeout(res, 250));

    const matchedInfo = getMatches(tempBoard);
    
    if (matchedInfo.matchedIds.length > 0) {
      processMatches(tempBoard, 1, {id1: t1.id, id2: t2.id});
    } else {
      // Swap back
      playErrorSound();
      tempBoard = tempBoard.map(t => {
        if (t.id === t1.id) return { ...t, x: x1, y: y1 };
        if (t.id === t2.id) return { ...t, x: x2, y: y2 };
        return t;
      });
      setBoard(tempBoard);
      await new Promise(res => setTimeout(res, 250));
      setIsProcessing(false);
    }
  };

  const handleTileClick = (x: number, y: number) => {
    initAudio();
    if (isProcessing) return;
    if (!selected) {
      setSelected({ x, y });
    } else {
      if (selected.x === x && selected.y === y) {
        setSelected(null);
      } else {
        handleSwap(selected.x, selected.y, x, y);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0a0a] text-white flex flex-col font-sans overflow-hidden relative border-8 border-[#2d1b0d] select-none">
      <PapelPicado className="absolute top-0 left-0 w-full flex justify-around pointer-events-none z-20 opacity-50 mix-blend-screen" />

      {gameState === 'playing' ? (
        <header className="pt-16 pb-4 flex flex-col md:flex-row justify-between items-center px-4 md:px-12 z-10 w-full gap-4">
          <div className="flex gap-4 items-center w-full md:w-auto">
             <button onClick={() => setGameState('menu')} className="bg-[#1e1414] border-2 border-white/20 px-3 py-2 rounded-xl active:bg-white/10 shrink-0 text-xl font-bold shadow-lg">
               ⬅️
             </button>
             <div className="flex flex-col items-center md:items-start text-center md:text-left">
               <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-[#ffeb3b] drop-shadow-[0_4px_0_rgba(233,30,99,1)]">FIESTA MATCH!</h1>
               <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] uppercase text-pink-500 font-bold mt-1 md:mt-0">
                 {gameMode === 'classic' && 'MODO CLÁSICO'}
                 {gameMode === 'time_attack' && 'CONTRA RELOJ'}
                 {gameMode === 'zen' && 'MODO ZEN'}
               </p>
             </div>
          </div>
          <div className="flex gap-4 md:gap-8 items-center justify-center w-full md:w-auto">
            {gameMode === 'time_attack' && (
              <div className="text-center bg-black/40 p-3 md:p-4 rounded-xl border border-[#e91e63] w-24 md:w-32 shadow-xl shadow-[#e91e63]/20">
                <div className="text-[8px] md:text-[10px] text-pink-400 uppercase tracking-widest mb-1">Tiempo</div>
                <div className="text-2xl md:text-4xl font-mono text-white leading-none">{timeLeft}s</div>
              </div>
             )}
            <div className="text-center bg-black/40 p-3 md:p-4 rounded-xl border border-white/10 w-28 md:w-40 shadow-xl">
              <div className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest mb-1">Puntuación</div>
              <AnimatePresence mode="popLayout">
                <motion.span 
                  key={score}
                  initial={{ scale: 1.5, color: '#fef08a' }}
                  animate={{ scale: 1, color: '#00ffcc' }}
                  className="text-2xl md:text-4xl font-mono text-[#00ffcc] leading-none"
                >
                  {score.toLocaleString().padStart(6, '0')}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <div className="text-center bg-black/40 p-3 md:p-4 rounded-xl border border-white/10 w-20 md:w-32 shadow-xl">
              <div className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest mb-1">Combo</div>
              <div className="h-8 md:h-10 flex items-center justify-center">
                <AnimatePresence mode="wait">
                   {combo > 1 ? (
                     <motion.div 
                        key={combo}
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="text-xl md:text-3xl font-black text-pink-500 italic drop-shadow-[0_2px_0_rgba(255,255,255,0.5)] leading-none"
                     >
                        x{combo}
                     </motion.div>
                   ) : (
                     <motion.div key="none" className="text-xl md:text-3xl font-mono text-gray-500 leading-none">
                        --
                     </motion.div>
                   )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <div className="pt-16 pb-4" />
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full mx-auto z-10 pb-8">
        {gameState === 'menu' && (
           <div className="flex flex-col items-center justify-center w-full max-w-sm gap-8 flex-1">
             <div className="flex flex-col items-center mb-4 relative">
               <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-[#ffeb3b] drop-shadow-[0_8px_0_rgba(233,30,99,1)] text-center transform -rotate-3 leading-none">FIESTA<br/>MATCH!</h1>
               <div className="absolute -bottom-6 bg-[#3d2b2b] px-4 py-1 rounded-full border-2 border-pink-500 uppercase font-bold text-[10px] tracking-widest rotate-2 shadow-lg">El Grito de la Victoria</div>
             </div>
             
             <div className="flex flex-col gap-4 w-full mt-4">
                <button 
                  onClick={() => startGame('classic')}
                  className="bg-[#e91e63] hover:bg-[#d81b60] border-b-8 border-pink-900 text-white font-black text-2xl py-4 rounded-2xl active:translate-y-2 active:border-b-0 transition-all flex flex-col items-center shadow-2xl"
                >
                  <span>MODO CLÁSICO</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1 font-bold">Juego Libre</span>
                </button>
                <button 
                  onClick={() => startGame('time_attack')}
                  className="bg-[#ff9800] hover:bg-[#f57c00] border-b-8 border-orange-900 text-white font-black text-2xl py-4 rounded-2xl active:translate-y-2 active:border-b-0 transition-all flex flex-col items-center shadow-2xl"
                >
                  <span>CONTRA RELOJ</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1 font-bold">60 Segundos</span>
                </button>
                <button 
                  onClick={() => startGame('zen')}
                  className="bg-[#00bcd4] hover:bg-[#00acc1] border-b-8 border-blue-900 text-white font-black text-2xl py-4 rounded-2xl active:translate-y-2 active:border-b-0 transition-all flex flex-col items-center shadow-2xl"
                >
                  <span>MODO ZEN</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1 font-bold">Relajante</span>
                </button>
             </div>
           </div>
        )}

        {gameState === 'gameover' && (
           <div className="flex flex-col items-center justify-center w-full max-w-sm gap-8 flex-1 text-center bg-black/60 p-8 rounded-3xl border-4 border-[#e91e63] shadow-2xl backdrop-blur-sm">
             <h2 className="text-4xl font-black italic tracking-tight text-white mb-2">¡TIEMPO AGOTADO!</h2>
             <div className="text-6xl mb-4 font-mono text-[#00ffcc] drop-shadow-[0_0_15px_rgba(0,255,204,0.5)]">
                {score.toLocaleString().padStart(6, '0')}
             </div>
             <p className="text-sm text-gray-300 uppercase tracking-widest font-bold mb-8">Puntuación Final</p>
             <button 
               onClick={() => startGame('time_attack')}
               className="w-full bg-[#8bc34a] hover:bg-[#7cb342] border-b-8 border-green-900 text-white font-black text-xl py-4 rounded-2xl active:translate-y-2 active:border-b-0 transition-all"
             >
               JUGAR OTRA VEZ
             </button>
             <button 
               onClick={() => setGameState('menu')}
               className="w-full bg-transparent border-2 border-white/20 text-white font-bold text-sm py-4 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all uppercase tracking-widest"
             >
               Menú Principal
             </button>
           </div>
        )}

        {gameState === 'playing' && (
          <div 
            className="relative bg-[#1e1414] p-4 md:p-6 rounded-3xl border-4 border-[#3d2b2b] shadow-2xl w-full max-w-[400px] aspect-square flex-shrink-0"
          >
            {/* Level Indicator mapped from styling */}
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#ffeb3b] rounded-full border-4 border-[#1e1414] flex items-center justify-center text-black font-black italic shadow-lg z-20">
              LV1
            </div>
            
            <div className="w-full h-full relative overflow-hidden rounded-xl">
              {/* Board Grid Background */}
              <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
                 {Array.from({length: GRID_SIZE * GRID_SIZE}).map((_, i) => (
                     <div key={i} className="p-0.5 w-full h-full"> 
                       <div className="w-full h-full bg-white/5 rounded-lg border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
                     </div>
                 ))}
              </div>

              {/* Actual interactable area */}
              <div 
                ref={boardRef}
                className="absolute inset-0 z-10"
              >
              <AnimatePresence>
                 {particles.map(p => (
                     <motion.div 
                        key={p.id}
                        initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                        animate={{ 
                           x: p.x + (Math.random() - 0.5) * 150, 
                           y: p.y + (Math.random() - 0.5) * 150, 
                           scale: 0, 
                           opacity: 0,
                           rotate: Math.random() * 360
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute w-3 h-3 rounded-full pointer-events-none z-50 border border-white/50"
                        style={{ backgroundColor: p.color }}
                     />
                 ))}
                 
                {board.map((tile) => (
                  <motion.div
                    key={tile.id}
                    layout
                    initial={tile.isNew ? { y: -tileSize * 4, opacity: 0 } : false}
                    animate={{ 
                      x: tile.x * tileSize, 
                      y: tile.y * tileSize,
                      opacity: tile.isMatched ? 0 : 1,
                      scale: tile.isMatched ? 1.3 : (selected?.x === tile.x && selected?.y === tile.y ? 1.05 : 1),
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 30,
                      opacity: { duration: tile.isMatched ? 0.3 : 0.1 },
                      scale: { duration: tile.isMatched ? 0.3 : 0.1 }
                    }}
                    className="absolute p-0.5"
                    style={{ 
                      width: tileSize, 
                      height: tileSize,
                      zIndex: tile.isMatched ? 30 : (selected?.x === tile.x && selected?.y === tile.y ? 20 : 10)
                    }}
                  >
                    <div 
                      className={`w-full h-full relative cursor-pointer group active:scale-95 transition-transform`}
                      onClick={(e) => {
                          e.preventDefault();
                          handleTileClick(tile.x, tile.y)
                      }}
                      onTouchStart={(e) => {
                          handleTileClick(tile.x, tile.y)
                      }}
                    >
                      <TokenIcon type={tile.type} className={`w-full h-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] group-hover:brightness-110 transition-all filter ${tile.power === 'color' ? 'brightness-[1.5] saturate-[2]' : ''} ${tile.isMatched ? 'brightness-[2] saturate-[2]' : ''}`} />
                      
                      {tile.isMatched && (
                         <div className="absolute inset-0 m-auto w-full h-full bg-white rounded-lg opacity-50 pointer-events-none mix-blend-overlay" />
                      )}

                      {tile.power === 'bomb' && (
                         <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-red-500 rounded-full animate-ping opacity-75 pointer-events-none" />
                      )}
                      
                      {tile.power === 'color' && (
                         <div className="absolute inset-0 m-auto w-[85%] h-[85%] rounded-full animate-spin border-4 border-white border-dashed drop-shadow-[0_0_8px_rgba(255,255,255,1)] pointer-events-none mix-blend-overlay" />
                      )}
                      
                      {tile.power === 'cross' && (
                         <>
                           <div className="absolute inset-0 m-auto w-[120%] h-[6px] bg-[#00ffcc] shadow-[0_0_12px_#00ffcc] pointer-events-none mix-blend-screen opacity-80" />
                           <div className="absolute inset-0 m-auto h-[120%] w-[6px] bg-[#00ffcc] shadow-[0_0_12px_#00ffcc] pointer-events-none mix-blend-screen opacity-80" />
                         </>
                      )}

                       {selected?.x === tile.x && selected?.y === tile.y && (
                          <div className="absolute inset-0 border-4 border-yellow-300 rounded shadow-[0_0_15px_rgba(253,224,71,0.8),inset_0_0_10px_rgba(253,224,71,0.5)] animate-pulse pointer-events-none" />
                       )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="h-12 bg-[#2d1b0d] flex items-center px-4 md:px-12 justify-between border-t border-white/10 shrink-0 z-10 w-full relative">
        <div className="text-[8px] md:text-[9px] text-orange-200/50 uppercase tracking-[.4em] truncate flex-1">
          Tradición • Pasión • Música
        </div>
        <div className="flex gap-4">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes swing {
          0%, 100% { transform: rotate(3deg); }
          50% { transform: rotate(-3deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
        }
        .clip-path-papel {
          clip-path:polygon(0% 0%, 100% 0%, 100% 80%, 85% 100%, 70% 80%, 50% 100%, 30% 80%, 15% 100%, 0% 80%);
        }
      `}} />
    </div>
  );
}
