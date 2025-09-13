'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/gameEngine';
import { GAME_CONFIG } from '@/lib/gameConfig';

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = GAME_CONFIG.canvas.width;
    canvas.height = GAME_CONFIG.canvas.height;

    // Initialize game engine
    gameEngineRef.current = new GameEngine(canvas);
    gameEngineRef.current.start();

    // Set initial high score
    setHighScore(gameEngineRef.current.getHighScore());

    // Score update interval
    const scoreInterval = setInterval(() => {
      if (gameEngineRef.current) {
        setScore(gameEngineRef.current.getScore());
        setHighScore(gameEngineRef.current.getHighScore());
      }
    }, 100);

    // Cleanup
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
      clearInterval(scoreInterval);
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: Audio manager muting would be implemented here
    // audioManager.setMuted(!isMuted);
  };

  const handleCanvasClick = () => {
    // Focus canvas for keyboard events
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
       {/* Game Stats */}
      <div className="flex justify-between w-full max-w-2xl px-4 text-sm text-cyan-200">
        <div className="flex space-x-4">
          <span>Depth: {score.toString().padStart(5, '0')}m</span>
          <span>Record: {highScore.toString().padStart(5, '0')}m</span>
        </div>
        <button
          onClick={toggleMute}
          className="text-cyan-300 hover:text-cyan-100 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

       {/* Game Canvas */}
      <div className="relative border-2 border-cyan-400 rounded-lg overflow-hidden bg-blue-900 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="block cursor-pointer focus:outline-none"
          onClick={handleCanvasClick}
          tabIndex={0}
          style={{
            imageRendering: 'pixelated',
          }}
        />
        
        {/* Mobile touch overlay */}
        <div className="absolute inset-0 md:hidden">
          <div className="h-full w-full flex">
            <div 
              className="flex-1 flex items-center justify-center text-cyan-300 text-xs"
              onTouchStart={(e) => {
                e.preventDefault();
                // Trigger swim up
                const event = new KeyboardEvent('keydown', { code: 'Space' });
                window.dispatchEvent(event);
              }}
            >
              SWIM UP
            </div>
            <div 
              className="w-20 flex items-center justify-center text-cyan-300 text-xs"
              onTouchStart={(e) => {
                e.preventDefault();
                // Trigger dive
                const event = new KeyboardEvent('keydown', { code: 'ArrowDown' });
                window.dispatchEvent(event);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                // Release dive
                const event = new KeyboardEvent('keyup', { code: 'ArrowDown' });
                window.dispatchEvent(event);
              }}
            >
              DIVE
            </div>
          </div>
        </div>
      </div>

       {/* Instructions */}
      <div className="text-center space-y-2 max-w-md">
        <div className="text-sm text-cyan-200">
          <div className="hidden md:block">
            <strong>Desktop:</strong> SPACE to swim up • DOWN arrow to dive
          </div>
          <div className="md:hidden">
            <strong>Mobile:</strong> Tap left to swim up • Hold right to dive
          </div>
        </div>
        <div className="text-xs text-teal-300">
          Navigate the underwater world! Avoid sharks, octopuses, and jellyfish!
        </div>
      </div>

      {/* Performance Info */}
      <div className="text-xs text-cyan-400 text-center">
        Ocean depth: {GAME_CONFIG.canvas.width} × {GAME_CONFIG.canvas.height}px
        <br />
        Smooth underwater experience at 60fps
      </div>
    </div>
  );
}