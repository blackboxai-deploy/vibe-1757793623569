import { GameConfig } from './gameTypes';

export const GAME_CONFIG: GameConfig = {
  canvas: {
    width: 800,
    height: 200,
  },
  dino: {
    x: 50,
    groundY: 100, // Fish swims in middle water
    width: 40,
    height: 30,
    duckHeight: 20,
    jumpForce: -8, // Lighter movement for water
    gravity: 0.3, // Less gravity underwater
    maxFallSpeed: 6,
  },
  ground: {
    y: 170,
    speed: 3,
  },
  obstacles: {
    minDistance: 400,
    maxDistance: 800,
    speed: 3,
  },
  game: {
    initialSpeed: 3,
    speedIncrease: 0.05,
    speedIncreaseInterval: 150, // every 150 points
  },
};

export const SPRITE_CONFIG = {
  dino: {
    running: { frames: 2, frameTime: 300 }, // Swimming animation
    jumping: { frames: 1, frameTime: 0 },   // Moving up
    ducking: { frames: 2, frameTime: 300 }, // Moving down
    dead: { frames: 1, frameTime: 0 },
  },
  obstacles: {
    shark_small: { width: 50, height: 25 },
    shark_large: { width: 70, height: 35 },
    octopus: { width: 45, height: 40, frames: 3, frameTime: 400 },
    jellyfish: { width: 30, height: 35, frames: 2, frameTime: 500 },
  },
  bubbles: {
    width: 8,
    height: 8,
  },
};