import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { 
  Play, 
  RotateCcw, 
  Pause, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Terminal,
  Cpu
} from 'lucide-react';

export type GameDifficulty = 'chill' | 'arcade' | 'overdrive';
export type WallMode = 'solid' | 'wrap';
export type SnakeSkin = 'cyan' | 'magenta' | 'split';

interface Point {
  x: number;
  y: number;
}

interface PixelDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface BonusFood {
  x: number;
  y: number;
  expiresAt: number;
  totalDuration: number;
}

const GRID_SIZE = 20;

const SKIN_CONFIGS: Record<SnakeSkin, { name: string; primary: string; secondary: string }> = {
  cyan: { name: 'CYAN_CORE', primary: '#00f0ff', secondary: '#008b99' },
  magenta: { name: 'MAGENTA_NULL', primary: '#ff007f', secondary: '#99004c' },
  split: { name: 'GLITCH_SPLIT', primary: '#00f0ff', secondary: '#ff007f' },
};

const DIFFICULTY_CONFIG: Record<GameDifficulty, { speedMs: number; label: string; scoreMultiplier: number }> = {
  chill: { speedMs: 125, label: 'NORM_CLOCK', scoreMultiplier: 1.0 },
  arcade: { speedMs: 85, label: 'OVERCLOCK', scoreMultiplier: 1.5 },
  overdrive: { speedMs: 60, label: 'CRITICAL', scoreMultiplier: 2.0 },
};

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cybersonic_snake_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [coresHarvested, setCoresHarvested] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierTimeLeft, setMultiplierTimeLeft] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  // Machine settings
  const [difficulty, setDifficulty] = useState<GameDifficulty>('arcade');
  const [wallMode, setWallMode] = useState<WallMode>('solid');
  const [skin, setSkin] = useState<SnakeSkin>('split');
  const [beatPulse, setBeatPulse] = useState(false);

  // Refs for state machine loop
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirectionRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const bonusFoodRef = useRef<BonusFood | null>(null);
  const debrisRef = useRef<PixelDebris[]>([]);
  const lastTickTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Audio beat subscriber
  useEffect(() => {
    const unsubscribe = audioEngine.onBeat((beat) => {
      if (beat === 0) {
        setBeatPulse(true);
        window.setTimeout(() => setBeatPulse(false), 120);
      }
    });
    return unsubscribe;
  }, []);

  const spawnFood = useCallback((): Point => {
    const snake = snakeRef.current;
    let newFood: Point;
    let attempts = 0;
    while (attempts < 200) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some((s) => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) return newFood;
      attempts++;
    }
    return { x: 5, y: 5 };
  }, []);

  const spawnBonusFood = useCallback(() => {
    const snake = snakeRef.current;
    const food = foodRef.current;
    let point: Point;
    let attempts = 0;
    while (attempts < 200) {
      point = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some((s) => s.x === point.x && s.y === point.y);
      const onFood = food.x === point.x && food.y === point.y;
      if (!onSnake && !onFood) {
        bonusFoodRef.current = {
          x: point.x,
          y: point.y,
          expiresAt: Date.now() + 8500,
          totalDuration: 8500,
        };
        return;
      }
      attempts++;
    }
  }, []);

  // Pixel Debris Burst (Glitch Art particles)
  const addDebris = (x: number, y: number, colorA: string, colorB: string, count = 20) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 2 + Math.random() * 5;
      debrisRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? colorA : colorB,
        size: Math.random() > 0.5 ? 4 : 2,
        life: 0,
        maxLife: 18 + Math.floor(Math.random() * 12),
      });
    }
  };

  const startGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    foodRef.current = spawnFood();
    bonusFoodRef.current = null;
    debrisRef.current = [];
    setScore(0);
    setCoresHarvested(0);
    setMultiplier(1);
    setMultiplierTimeLeft(0);
    setIsNewRecord(false);
    setIsGlitching(false);
    setGameState('PLAYING');
    lastTickTimeRef.current = performance.now();

    audioEngine.resume();
  }, [spawnFood]);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const changeDirection = useCallback((dir: Point) => {
    const current = directionRef.current;
    if (dir.x + current.x === 0 && dir.y + current.y === 0) return;
    nextDirectionRef.current = dir;
    audioEngine.playTurnSfx();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection({ x: 1, y: 0 });
          break;
        case ' ':
          e.preventDefault();
          if (gameState === 'READY' || gameState === 'GAME_OVER') {
            startGame();
          } else {
            togglePause();
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          startGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState, startGame, togglePause]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const delta = time - lastTickTimeRef.current;
      const tickSpeed = DIFFICULTY_CONFIG[difficulty].speedMs;

      if (gameState === 'PLAYING' && delta >= tickSpeed) {
        lastTickTimeRef.current = time;

        directionRef.current = nextDirectionRef.current;
        const head = snakeRef.current[0];
        let nextHead: Point = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y,
        };

        if (wallMode === 'wrap') {
          if (nextHead.x < 0) nextHead.x = GRID_SIZE - 1;
          else if (nextHead.x >= GRID_SIZE) nextHead.x = 0;
          if (nextHead.y < 0) nextHead.y = GRID_SIZE - 1;
          else if (nextHead.y >= GRID_SIZE) nextHead.y = 0;
        } else {
          if (
            nextHead.x < 0 ||
            nextHead.x >= GRID_SIZE ||
            nextHead.y < 0 ||
            nextHead.y >= GRID_SIZE
          ) {
            handleGameOver();
            return;
          }
        }

        const selfHit = snakeRef.current.some(
          (seg, idx) => idx > 0 && seg.x === nextHead.x && seg.y === nextHead.y
        );
        if (selfHit) {
          handleGameOver();
          return;
        }

        const ateFood = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
        const bonusFood = bonusFoodRef.current;
        const ateBonus = bonusFood && nextHead.x === bonusFood.x && nextHead.y === bonusFood.y;

        const newSnake = [nextHead, ...snakeRef.current];

        if (ateFood) {
          addDebris(foodRef.current.x, foodRef.current.y, '#00f0ff', '#ff007f', 24);
          audioEngine.playEatSfx();

          const addPoints = Math.round(100 * DIFFICULTY_CONFIG[difficulty].scoreMultiplier * multiplier);
          setScore((s) => {
            const nextScore = s + addPoints;
            if (nextScore > highScore) {
              setHighScore(nextScore);
              setIsNewRecord(true);
              localStorage.setItem('cybersonic_snake_highscore', nextScore.toString());
            }
            return nextScore;
          });

          setCoresHarvested((a) => {
            const next = a + 1;
            if (next % 4 === 0 && !bonusFoodRef.current) {
              spawnBonusFood();
            }
            return next;
          });

          foodRef.current = spawnFood();
        } else if (ateBonus) {
          addDebris(bonusFood.x, bonusFood.y, '#ff007f', '#ffffff', 32);
          audioEngine.playBonusEatSfx();
          bonusFoodRef.current = null;

          const addPoints = Math.round(350 * DIFFICULTY_CONFIG[difficulty].scoreMultiplier * multiplier);
          setScore((s) => {
            const nextScore = s + addPoints;
            if (nextScore > highScore) {
              setHighScore(nextScore);
              setIsNewRecord(true);
              localStorage.setItem('cybersonic_snake_highscore', nextScore.toString());
            }
            return nextScore;
          });

          setMultiplier(2);
          setMultiplierTimeLeft(10);
        } else {
          newSnake.pop();
        }

        snakeRef.current = newSnake;

        if (bonusFoodRef.current && Date.now() > bonusFoodRef.current.expiresAt) {
          bonusFoodRef.current = null;
        }
      }

      if (multiplier > 1 && gameState === 'PLAYING') {
        setMultiplierTimeLeft((prev) => {
          if (prev <= 0.05) {
            setMultiplier(1);
            return 0;
          }
          return Math.max(0, prev - 0.016);
        });
      }

      drawGlitchCanvas(ctx, canvas.width, canvas.height, time);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, difficulty, wallMode, skin, highScore, multiplier, spawnFood, spawnBonusFood]);

  const handleGameOver = () => {
    audioEngine.playGameOverSfx();
    setIsGlitching(true);
    const head = snakeRef.current[0];
    if (head) {
      addDebris(head.x, head.y, '#ff007f', '#00f0ff', 40);
    }
    setGameState('GAME_OVER');
  };

  // Glitch Art Canvas Renderer
  const drawGlitchCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const cellSize = width / GRID_SIZE;

    // Solid pitch black background
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, width, height);

    // Grid: hard pixel crosshairs and dotted matrix
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.fillRect(x * cellSize + cellSize / 2 - 0.5, y * cellSize + cellSize / 2 - 0.5, 1, 1);
      }
    }

    // Outer boundary: sharp Cyan & Magenta frame
    ctx.strokeStyle = wallMode === 'solid' ? '#ff007f' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Screen tearing lines on canvas
    if (Math.sin(time * 0.005) > 0.96) {
      const tearY = (time * 0.4) % height;
      ctx.fillStyle = 'rgba(255, 0, 127, 0.4)';
      ctx.fillRect(0, tearY, width, 3);
    }

    // Draw Bonus Food (Magenta Glitch Core)
    const bonus = bonusFoodRef.current;
    if (bonus) {
      const bx = bonus.x * cellSize;
      const by = bonus.y * cellSize;
      const glitchJitter = Math.sin(time * 0.03) > 0.7 ? 2 : 0;

      // Chromatic RGB shadow
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(bx - glitchJitter, by, cellSize, cellSize);

      ctx.fillStyle = '#ff007f';
      ctx.fillRect(bx + glitchJitter, by, cellSize, cellSize);

      // Inner white pixel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 4, by + 4, cellSize - 8, cellSize - 8);
    }

    // Draw Standard Food (Cyan Pixel Orb)
    const food = foodRef.current;
    const fx = food.x * cellSize;
    const fy = food.y * cellSize;

    // Cyan pixel block with magenta drop border
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(fx + 2, fy + 2, cellSize - 2, cellSize - 2);

    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(fx, fy, cellSize - 2, cellSize - 2);

    // Food center pixel
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 4, fy + 4, cellSize - 10, cellSize - 10);

    // Draw Snake Segments (Raw pixel blocks)
    const snake = snakeRef.current;
    const skinConfig = SKIN_CONFIGS[skin];

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      const sx = seg.x * cellSize;
      const sy = seg.y * cellSize;

      const primary = skin === 'split' 
        ? (i % 2 === 0 ? '#00f0ff' : '#ff007f') 
        : skinConfig.primary;

      if (isHead) {
        // Head: Sharp pixel block with contrasting Cyan & Magenta
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(sx + 2, sy + 2, cellSize - 2, cellSize - 2);

        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(sx, sy, cellSize - 2, cellSize - 2);

        // Pixel Eyes
        const dir = directionRef.current;
        ctx.fillStyle = '#000000';
        if (dir.x !== 0) {
          const eyeX = dir.x > 0 ? sx + cellSize - 7 : sx + 3;
          ctx.fillRect(eyeX, sy + 3, 3, 3);
          ctx.fillRect(eyeX, sy + cellSize - 8, 3, 3);
        } else {
          const eyeY = dir.y > 0 ? sy + cellSize - 7 : sy + 3;
          ctx.fillRect(sx + 3, eyeY, 3, 3);
          ctx.fillRect(sx + cellSize - 8, eyeY, 3, 3);
        }
      } else {
        // Body: Raw pixel block
        ctx.fillStyle = primary;
        ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

        // Pixel core highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 4, sy + 4, 2, 2);
      }
    }

    // Draw Pixel Debris
    const debris = debrisRef.current;
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.life >= p.maxLife) {
        debris.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto font-terminal">
      {/* Top Telemetry Strip */}
      <div className="w-full flex items-center justify-between gap-4 mb-2.5 px-3 py-2 bg-black border-2 border-cyan-400 shadow-[3px_3px_0px_#ff007f]">
        {/* Core Score Counter */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Terminal className="w-3 h-3 text-[#ff007f]" />
              ACCUMULATED_SCORE:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-white glitch-text-sm tracking-widest">
                {score.toLocaleString()}
              </span>
              {multiplier > 1 && (
                <span className="text-xs font-pixel px-1.5 py-0.5 bg-[#ff007f] text-white font-bold animate-pulse">
                  2X_OVERDRIVE [{Math.ceil(multiplierTimeLeft)}s]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* High Score / Memory Record */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" /> ROM_HIGH_RECORD:
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-cyan-400">
              {highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 font-pixel">
          {gameState === 'PLAYING' && (
            <button
              onClick={togglePause}
              className="px-2.5 py-1 text-xs pixel-btn bg-black text-cyan-400 cursor-pointer"
            >
              HALT
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              onClick={togglePause}
              className="px-2.5 py-1 text-xs pixel-btn-magenta bg-[#ff007f] text-white cursor-pointer"
            >
              RESUME
            </button>
          )}

          {(gameState === 'GAME_OVER' || gameState === 'READY') && (
            <button
              onClick={startGame}
              className="px-3 py-1 text-xs pixel-btn bg-cyan-400 text-black font-bold cursor-pointer"
            >
              EXECUTE
            </button>
          )}

          <button
            onClick={startGame}
            title="SYSTEM_REBOOT (R)"
            className="p-1 pixel-btn bg-black text-slate-400 hover:text-cyan-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Arcade Bezel & Screen Tearing Canvas */}
      <div 
        className={`relative w-full aspect-square max-w-[480px] bg-black border-2 transition-all duration-100 ${
          beatPulse 
            ? 'border-[#ff007f] shadow-[4px_4px_0px_#00f0ff]' 
            : 'border-cyan-400 shadow-[4px_4px_0px_#ff007f]'
        } glitch-crt ${isGlitching ? 'screen-tear-periodic' : ''}`}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          className="w-full h-full block image-rendering-pixelated"
        />

        {/* Horizontal Scanline sweep */}
        <div className="scanline-beam" />

        {/* READY Overlay */}
        {gameState === 'READY' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-30 font-terminal">
            <div className="text-cyan-400 text-sm tracking-widest uppercase mb-1">
              [SYSTEM_INITIALIZED://BOOT_OK]
            </div>
            <h2 className="text-3xl font-pixel text-white glitch-text tracking-wider mb-2">
              SNAKE_MATRIX
            </h2>
            <p className="text-base text-slate-300 max-w-xs mb-5 font-terminal leading-snug">
              HARVEST DATA CORES. AVOID SYNAPTIC WALL IMPACTS. SYNTH CARRIER FREQUENCY RUNNING.
            </p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 pixel-btn bg-cyan-400 text-black font-pixel font-bold text-xs tracking-wider cursor-pointer"
            >
              [PRESS_SPACE_TO_BOOT]
            </button>
            <div className="mt-5 flex items-center gap-3 text-sm text-slate-400 font-terminal">
              <span>KEYS: W-A-S-D / ARROWS</span>
              <span>·</span>
              <span>HALT: SPACE</span>
            </div>
          </div>
        )}

        {/* PAUSED Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-30 font-terminal">
            <h3 className="text-3xl font-pixel text-[#ff007f] glitch-text tracking-widest mb-1">
              CYCLE_HALTED
            </h3>
            <p className="text-base text-slate-300 mb-5">
              STATE PRESERVED IN RAM // PRESS SPACE TO RESUME
            </p>
            <div className="flex items-center gap-3 font-pixel">
              <button
                onClick={togglePause}
                className="px-4 py-1.5 text-xs pixel-btn bg-cyan-400 text-black font-bold"
              >
                RESUME
              </button>
              <button
                onClick={startGame}
                className="px-4 py-1.5 text-xs pixel-btn-magenta bg-black text-[#ff007f]"
              >
                ABORT / REBOOT
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-30 font-terminal">
            <div className="text-sm font-terminal text-[#ff007f] tracking-widest uppercase mb-1 animate-pulse">
              FATAL_EXCEPTION://SYNAPSE_CORRUPTION
            </div>
            <h2 className="text-3xl font-pixel text-white glitch-text tracking-wider mb-3">
              KERNEL_PANIC
            </h2>

            {isNewRecord && (
              <div className="mb-3 px-3 py-1 bg-[#ff007f] text-white font-pixel text-xs tracking-wider border border-cyan-400 shadow-[2px_2px_0px_#00f0ff] animate-bounce">
                *** NEW ROM HIGH RECORD LOGGED ***
              </div>
            )}

            <div className="w-full max-w-xs bg-black border-2 border-cyan-400 p-3 mb-5 font-terminal text-sm text-left">
              <div className="flex justify-between py-0.5 border-b border-slate-800 text-slate-400">
                <span>TERMINAL_SCORE:</span>
                <span className="font-bold text-white tabular-nums">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800 text-slate-400">
                <span>CORES_HARVESTED:</span>
                <span className="font-bold text-cyan-400 tabular-nums">{coresHarvested}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-400">
                <span>CLOCK_RATE:</span>
                <span className="text-[#ff007f] uppercase font-bold">{difficulty}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-6 py-2.5 pixel-btn bg-cyan-400 text-black font-pixel font-bold text-xs tracking-wider cursor-pointer"
            >
              [REBOOT_SYSTEM (SPACE)]
            </button>
          </div>
        )}
      </div>

      {/* Retro D-Pad & Glitch Modulators */}
      <div className="w-full max-w-[480px] mt-3 flex items-center justify-between gap-3 px-1">
        {/* Hardware D-Pad */}
        <div className="grid grid-cols-3 gap-1.5 w-32 shrink-0">
          <div></div>
          <button
            onClick={() => changeDirection({ x: 0, y: -1 })}
            aria-label="Direction Up"
            className="w-10 h-10 pixel-btn bg-black text-cyan-400 flex items-center justify-center"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div></div>
          <button
            onClick={() => changeDirection({ x: -1, y: 0 })}
            aria-label="Direction Left"
            className="w-10 h-10 pixel-btn bg-black text-cyan-400 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection({ x: 0, y: 1 })}
            aria-label="Direction Down"
            className="w-10 h-10 pixel-btn bg-black text-cyan-400 flex items-center justify-center"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection({ x: 1, y: 0 })}
            aria-label="Direction Right"
            className="w-10 h-10 pixel-btn bg-black text-cyan-400 flex items-center justify-center"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Machine Mode Parameters */}
        <div className="flex-1 flex flex-col gap-2 font-terminal text-sm">
          {/* Clock Rate */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">CLOCK_HZ:</span>
            <div className="flex items-center gap-1 font-pixel">
              {(['chill', 'arcade', 'overdrive'] as GameDifficulty[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDifficulty(mode)}
                  className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                    difficulty === mode
                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Wall Boundary Mode */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">KILL_PLANE:</span>
            <div className="flex items-center gap-1 font-pixel">
              <button
                onClick={() => setWallMode('solid')}
                className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                  wallMode === 'solid'
                    ? 'bg-[#ff007f] text-white border-[#ff007f] font-bold'
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                SOLID
              </button>
              <button
                onClick={() => setWallMode('wrap')}
                className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                  wallMode === 'wrap'
                    ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                PORTAL
              </button>
            </div>
          </div>

          {/* Glitch Skin */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">RGB_SPLIT:</span>
            <div className="flex items-center gap-1 font-pixel">
              {(['split', 'cyan', 'magenta'] as SnakeSkin[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSkin(s)}
                  className={`px-1.5 py-0.5 text-[10px] border transition-colors ${
                    skin === s
                      ? 'bg-white text-black border-white font-bold'
                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
