'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { sdk } from '@farcaster/miniapp-sdk'
interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  apple: Position;
  direction: Position;
  isGameOver: boolean;
  score: number;
  isPlaying: boolean;
  applesEaten: number;
}

interface GameStats {
  fps: number;
  isMobile: boolean;
  playerPosition: Position;
  score: number;
}

const GRID_SIZE = 20;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INITIAL_SNAKE: Position[] = [{ x: 200, y: 200 }];
const INITIAL_DIRECTION: Position = { x: GRID_SIZE, y: 0 };
const MAX_APPLES = 10;

export default function SnakeSurvival(): JSX.Element {
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (document.readyState !== 'complete') {
          await new Promise(resolve => {
            if (document.readyState === 'complete') {
              resolve(void 0)
            } else {
              window.addEventListener('load', () => resolve(void 0), { once: true })
            }
          })
        }
        
        await sdk.actions.ready()
        console.log('Farcaster SDK initialized successfully - app fully loaded')
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
        setTimeout(async () => {
          try {
            await sdk.actions.ready()
            console.log('Farcaster SDK initialized on retry')
          } catch (retryError) {
            console.error('Farcaster SDK retry failed:', retryError)
          }
        }, 1000)
      }
    }

    initializeFarcaster()
  }, [])
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>();

  const [gameState, setGameState] = useState<GameState>({
    snake: [...INITIAL_SNAKE],
    apple: { x: 100, y: 100 },
    direction: { ...INITIAL_DIRECTION },
    isGameOver: false,
    score: 0,
    isPlaying: false,
    applesEaten: 0
  });

  const [gameStats, setGameStats] = useState<GameStats>({
    fps: 0,
    isMobile: false,
    playerPosition: { x: 200, y: 200 },
    score: 0
  });

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = (): void => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setGameStats(prev => ({ ...prev, isMobile: mobile }));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide controls after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Keep gameStateRef synchronized with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const generateRandomApple = useCallback((snake: Position[]): Position => {
    let newApple: Position;
    do {
      newApple = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)) * GRID_SIZE,
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)) * GRID_SIZE
      };
    } while (
      snake.some((segment: Position) => segment.x === newApple.x && segment.y === newApple.y)
    );
    return newApple;
  }, []);

  const checkCollision = useCallback((head: Position, snake: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_WIDTH || head.y < 0 || head.y >= CANVAS_HEIGHT) {
      return true;
    }

    // Self collision
    return snake.some((segment: Position) => segment.x === head.x && segment.y === head.y);
  }, []);

  const updateGame = useCallback((currentTime: number): void => {
    if (currentTime - lastRenderTimeRef.current < 150) return;

    setGameState((prevState: GameState) => {
      if (!prevState.isPlaying || prevState.isGameOver) return prevState;

      const newSnake = [...prevState.snake];
      const head = { ...newSnake[0] };
      head.x += prevState.direction.x;
      head.y += prevState.direction.y;

      if (checkCollision(head, newSnake)) {
        const newState = { ...prevState, isGameOver: true, isPlaying: false };
        gameStateRef.current = newState;
        return newState;
      }

      newSnake.unshift(head);

      let newScore = prevState.score;
      let newApplesEaten = prevState.applesEaten;
      let newApple = prevState.apple;
      let gameOver = false;

      // Check apple collision
      if (head.x === prevState.apple.x && head.y === prevState.apple.y) {
        newScore += 10;
        newApplesEaten += 1;

        if (newApplesEaten >= MAX_APPLES) {
          gameOver = true;
        } else {
          newApple = generateRandomApple(newSnake);
        }
      } else {
        newSnake.pop();
      }

      // Update game stats
      setGameStats(prev => ({
        ...prev,
        playerPosition: head,
        score: newScore
      }));

      const newState = {
        ...prevState,
        snake: newSnake,
        apple: newApple,
        score: newScore,
        applesEaten: newApplesEaten,
        isGameOver: gameOver,
        isPlaying: !gameOver
      };
      
      gameStateRef.current = newState;
      return newState;
    });

    lastRenderTimeRef.current = currentTime;
  }, [checkCollision, generateRandomApple]);

  const updateFPS = useCallback((currentTime: number): void => {
    frameCountRef.current++;

    if (currentTime - lastFpsUpdateRef.current >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / (currentTime - lastFpsUpdateRef.current));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = currentTime;

      setGameStats(prev => ({ ...prev, fps: fpsRef.current }));
    }
  }, []);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D, currentGameState: GameState): void => {
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // Draw snake
    currentGameState.snake.forEach((segment: Position, index: number) => {
      if (index === 0) {
        ctx.fillStyle = '#16a34a'; // Head darker green
      } else {
        ctx.fillStyle = '#22c55e'; // Body lighter green
      }
      ctx.fillRect(segment.x, segment.y, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    // Draw apple
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(currentGameState.apple.x, currentGameState.apple.y, GRID_SIZE - 2, GRID_SIZE - 2);
  }, []);

  const gameLoop = useCallback((currentTime: number): void => {
    updateGame(currentTime);
    updateFPS(currentTime);

    const canvas = canvasRef.current;
    if (!canvas || !gameStateRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGame(ctx, gameStateRef.current);
    
    if (gameStateRef.current.isPlaying) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [updateGame, updateFPS, drawGame]);

  const startGame = useCallback((): void => {
    const newApple = generateRandomApple(INITIAL_SNAKE);
    const newGameState = {
      snake: [...INITIAL_SNAKE],
      apple: newApple,
      direction: { ...INITIAL_DIRECTION },
      isGameOver: false,
      score: 0,
      isPlaying: true,
      applesEaten: 0
    };
    
    setGameState(newGameState);
    gameStateRef.current = newGameState;

    setGameStats(prev => ({
      ...prev,
      playerPosition: INITIAL_SNAKE[0],
      score: 0
    }));

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [generateRandomApple, gameLoop]);

  const handleKeyPress = useCallback((event: KeyboardEvent): void => {
    if (!gameState.isPlaying) return;

    const key = event.key.toLowerCase();
    const currentDirection = gameState.direction;

    setGameState((prev: GameState) => {
      let newDirection = prev.direction;

      switch (key) {
        case 'w':
          if (currentDirection.y === 0) newDirection = { x: 0, y: -GRID_SIZE };
          break;
        case 's':
          if (currentDirection.y === 0) newDirection = { x: 0, y: GRID_SIZE };
          break;
        case 'a':
          if (currentDirection.x === 0) newDirection = { x: -GRID_SIZE, y: 0 };
          break;
        case 'd':
          if (currentDirection.x === 0) newDirection = { x: GRID_SIZE, y: 0 };
          break;
      }

      return { ...prev, direction: newDirection };
    });
  }, [gameState.isPlaying, gameState.direction]);

  const handleMobileControl = useCallback((direction: Position): void => {
    if (!gameState.isPlaying) return;

    setGameState((prev: GameState) => {
      const currentDirection = prev.direction;
      let newDirection = prev.direction;

      if (direction.y !== 0 && currentDirection.y === 0) {
        newDirection = direction;
      } else if (direction.x !== 0 && currentDirection.x === 0) {
        newDirection = direction;
      }

      return { ...prev, direction: newDirection };
    });
  }, [gameState.isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const getGameStatusMessage = (): string => {
    if (gameState.applesEaten >= MAX_APPLES) {
      return 'Congratulations! You survived and collected all apples!';
    }
    if (gameState.isGameOver) {
      return 'Game Over! Try again to beat your score.';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 relative">
      {/* Stats Monitor */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-gray-200 border border-gray-400 rounded px-3 py-2 text-xs font-mono">
          <div>FPS: {gameStats.fps}</div>
          <div>Mobile: {gameStats.isMobile.toString()}</div>
          <div>Position: ({Math.floor(gameStats.playerPosition.x / GRID_SIZE)}, {Math.floor(gameStats.playerPosition.y / GRID_SIZE)})</div>
          <div>Score: {gameStats.score}</div>
        </div>
      </div>

      {/* Control Box */}
      {showControls && (
        <div className={`absolute ${isMobile ? 'top-4 left-4' : 'top-4 left-1/2 transform -translate-x-1/2'} z-20`}>
          <div className="bg-gray-200 border border-gray-400 rounded px-3 py-2 text-xs">
            <div className="font-semibold mb-1">Controls:</div>
            <div>W - Move Up</div>
            <div>A - Move Left</div>
            <div>S - Move Down</div>
            <div>D - Move Right</div>
            {isMobile && <div className="mt-1 text-gray-600">Or use touch controls</div>}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-white border-2 border-gray-300">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold text-black">🐍 Snake Survival</CardTitle>
            <p className="text-gray-700">Collect {MAX_APPLES} apples to win!</p>
          </CardHeader>

          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="border-2 border-gray-400 bg-gray-100"
              />

              {!gameState.isPlaying && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    {gameState.applesEaten >= MAX_APPLES && (
                      <div className="mb-4">
                        <div className="text-2xl font-bold text-yellow-400">🎉 Victory! 🎉</div>
                        <div className="text-lg">Perfect Score!</div>
                      </div>
                    )}
                    {gameState.isGameOver && gameState.applesEaten < MAX_APPLES && (
                      <div className="mb-4">
                        <div className="text-xl font-bold">Game Over</div>
                        <div>Score: {gameState.score}</div>
                      </div>
                    )}
                    {!gameState.isGameOver && gameState.applesEaten === 0 && (
                      <div className="mb-4">
                        <div className="text-xl font-bold">Snake Survival</div>
                        <div>Ready to play?</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">Score: {gameState.score}</div>
              <div className="text-sm text-gray-600">
                Apples: {gameState.applesEaten} / {MAX_APPLES}
              </div>
              
              {getGameStatusMessage() && (
                <div className="text-sm text-center p-2 bg-gray-100 rounded border">
                  {getGameStatusMessage()}
                </div>
              )}
            </div>

            <Button
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
              size="lg"
            >
              {gameState.isPlaying ? 'Restart Game' : 'Start Game'}
            </Button>
          </CardContent>
        </Card>

        {/* Mobile Controls */}
        {isMobile && gameState.isPlaying && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex flex-col items-center space-y-2">
              <Button
                onTouchStart={() => handleMobileControl({ x: 0, y: -GRID_SIZE })}
                className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-full opacity-70"
                size="sm"
              >
                ↑
              </Button>
              <div className="flex space-x-2">
                <Button
                  onTouchStart={() => handleMobileControl({ x: -GRID_SIZE, y: 0 })}
                  className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-full opacity-70"
                  size="sm"
                >
                  ←
                </Button>
                <Button
                  onTouchStart={() => handleMobileControl({ x: GRID_SIZE, y: 0 })}
                  className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-full opacity-70"
                  size="sm"
                >
                  →
                </Button>
              </div>
              <Button
                onTouchStart={() => handleMobileControl({ x: 0, y: GRID_SIZE })}
                className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-full opacity-70"
                size="sm"
              >
                ↓
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}