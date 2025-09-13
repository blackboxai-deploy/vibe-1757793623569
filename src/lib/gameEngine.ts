import { GameState, DinoState, Obstacle, Cloud } from './gameTypes';
import { GAME_CONFIG, SPRITE_CONFIG } from './gameConfig';
import { audioManager } from './audioManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private dinoState: DinoState;
  private obstacles: Obstacle[] = [];
  private clouds: Cloud[] = [];
  private keys: Set<string> = new Set();
  private lastTime: number = 0;
  private nextObstacleDistance: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.gameState = {
      state: 'MENU',
      score: 0,
      highScore: parseInt(localStorage.getItem('dino-high-score') || '0'),
      speed: GAME_CONFIG.game.initialSpeed,
      groundX: 0,
    };

    this.dinoState = {
      x: GAME_CONFIG.dino.x,
      y: GAME_CONFIG.dino.groundY,
      velocityY: 0,
      state: 'SWIMMING',
      animationFrame: 0,
      animationTimer: 0,
    };

    this.setupEventListeners();
    this.generateInitialClouds();
    this.nextObstacleDistance = GAME_CONFIG.obstacles.minDistance;
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.handleInput(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('click', () => {
      this.handleInput('Space');
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleInput('Space');
    });
  }

   private handleInput(code: string) {
    audioManager.resumeContext();

    if (this.gameState.state === 'MENU' || this.gameState.state === 'GAME_OVER') {
      if (code === 'Space') {
        this.startGame();
      }
    } else if (this.gameState.state === 'PLAYING') {
      if (code === 'Space') {
        this.swimUp();
      } else if (code === 'ArrowDown') {
        this.swimDown();
      }
    }
  }

  private startGame() {
    this.gameState.state = 'PLAYING';
    this.gameState.score = 0;
    this.gameState.speed = GAME_CONFIG.game.initialSpeed;
    this.gameState.groundX = 0;
    
    this.dinoState.x = GAME_CONFIG.dino.x;
    this.dinoState.y = GAME_CONFIG.dino.groundY;
    this.dinoState.velocityY = 0;
    this.dinoState.state = 'SWIMMING';
    this.dinoState.animationFrame = 0;
    this.dinoState.animationTimer = 0;

    this.obstacles = [];
    this.nextObstacleDistance = GAME_CONFIG.obstacles.minDistance;
  }

  private swimUp() {
    this.dinoState.velocityY = GAME_CONFIG.dino.jumpForce;
    this.dinoState.state = 'RISING';
    audioManager.playSound('jump', 0.3);
  }

  private swimDown() {
    this.dinoState.state = 'DIVING';
  }

   private generateInitialClouds() {
    // Generate bubbles instead of clouds
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * GAME_CONFIG.canvas.width,
        y: Math.random() * GAME_CONFIG.canvas.height,
        speed: 0.3 + Math.random() * 0.8,
        size: 3 + Math.random() * 8,
      });
    }
  }

   private updateDino(deltaTime: number) {
    if (this.gameState.state !== 'PLAYING') return;

    // Handle diving - return to swimming when not pressing down
    if (!this.keys.has('ArrowDown') && this.dinoState.state === 'DIVING') {
      this.dinoState.state = 'SWIMMING';
    }

    // Apply water resistance and gravity
    this.dinoState.velocityY += GAME_CONFIG.dino.gravity;
    if (this.dinoState.velocityY > GAME_CONFIG.dino.maxFallSpeed) {
      this.dinoState.velocityY = GAME_CONFIG.dino.maxFallSpeed;
    }

    // Update position
    this.dinoState.y += this.dinoState.velocityY;

    // Water boundaries - fish can't go above surface or hit seafloor
    if (this.dinoState.y <= 20) {
      this.dinoState.y = 20;
      this.dinoState.velocityY = 0;
    }
    if (this.dinoState.y >= GAME_CONFIG.ground.y - GAME_CONFIG.dino.height) {
      this.dinoState.y = GAME_CONFIG.ground.y - GAME_CONFIG.dino.height;
      this.dinoState.velocityY = 0;
    }

    // Update swimming state
    if (this.dinoState.state === 'RISING' && Math.abs(this.dinoState.velocityY) < 1) {
      this.dinoState.state = 'SWIMMING';
    }

    // Animation
    this.dinoState.animationTimer += deltaTime;
    const stateKey = this.dinoState.state.toLowerCase() === 'rising' ? 'jumping' : 
                     this.dinoState.state.toLowerCase() === 'diving' ? 'ducking' : 'running';
    const frameTime = SPRITE_CONFIG.dino[stateKey as keyof typeof SPRITE_CONFIG.dino].frameTime;
    if (frameTime > 0 && this.dinoState.animationTimer >= frameTime) {
      this.dinoState.animationTimer = 0;
      this.dinoState.animationFrame = (this.dinoState.animationFrame + 1) % 
        SPRITE_CONFIG.dino[stateKey as keyof typeof SPRITE_CONFIG.dino].frames;
    }
  }

   private updateObstacles(deltaTime: number) {
    if (this.gameState.state !== 'PLAYING') return;

    // Move and animate existing obstacles
    this.obstacles = this.obstacles.filter(obstacle => {
      obstacle.x -= this.gameState.speed;
      
      // Update animations for sea creatures
      if (obstacle.animationTimer !== undefined) {
        obstacle.animationTimer += deltaTime;
        const frameTime = obstacle.type === 'OCTOPUS_HIGH' || obstacle.type === 'OCTOPUS_LOW' 
          ? SPRITE_CONFIG.obstacles.octopus.frameTime 
          : SPRITE_CONFIG.obstacles.jellyfish.frameTime;
        
        if (obstacle.animationTimer >= frameTime) {
          obstacle.animationTimer = 0;
          const maxFrames = obstacle.type === 'OCTOPUS_HIGH' || obstacle.type === 'OCTOPUS_LOW' 
            ? SPRITE_CONFIG.obstacles.octopus.frames 
            : SPRITE_CONFIG.obstacles.jellyfish.frames;
          obstacle.animationFrame = ((obstacle.animationFrame || 0) + 1) % maxFrames;
        }
      }
      
      return obstacle.x + obstacle.width > 0;
    });

    // Generate new obstacles
    this.nextObstacleDistance -= this.gameState.speed;
    if (this.nextObstacleDistance <= 0) {
      this.generateObstacle();
      this.nextObstacleDistance = GAME_CONFIG.obstacles.minDistance + 
        Math.random() * (GAME_CONFIG.obstacles.maxDistance - GAME_CONFIG.obstacles.minDistance);
    }
  }

   private generateObstacle() {
    const types: Obstacle['type'][] = ['SHARK_SMALL', 'SHARK_LARGE', 'OCTOPUS_HIGH', 'OCTOPUS_LOW', 'JELLYFISH'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle: Obstacle;

    switch (type) {
      case 'SHARK_SMALL':
        obstacle = {
          x: GAME_CONFIG.canvas.width,
          y: GAME_CONFIG.ground.y - SPRITE_CONFIG.obstacles.shark_small.height - 20,
          width: SPRITE_CONFIG.obstacles.shark_small.width,
          height: SPRITE_CONFIG.obstacles.shark_small.height,
          type,
        };
        break;
      case 'SHARK_LARGE':
        obstacle = {
          x: GAME_CONFIG.canvas.width,
          y: GAME_CONFIG.ground.y - SPRITE_CONFIG.obstacles.shark_large.height - 30,
          width: SPRITE_CONFIG.obstacles.shark_large.width,
          height: SPRITE_CONFIG.obstacles.shark_large.height,
          type,
        };
        break;
      case 'OCTOPUS_HIGH':
        obstacle = {
          x: GAME_CONFIG.canvas.width,
          y: 30,
          width: SPRITE_CONFIG.obstacles.octopus.width,
          height: SPRITE_CONFIG.obstacles.octopus.height,
          type,
          animationFrame: 0,
          animationTimer: 0,
        };
        break;
      case 'OCTOPUS_LOW':
        obstacle = {
          x: GAME_CONFIG.canvas.width,
          y: GAME_CONFIG.ground.y - SPRITE_CONFIG.obstacles.octopus.height - 10,
          width: SPRITE_CONFIG.obstacles.octopus.width,
          height: SPRITE_CONFIG.obstacles.octopus.height,
          type,
          animationFrame: 0,
          animationTimer: 0,
        };
        break;
      case 'JELLYFISH':
        obstacle = {
          x: GAME_CONFIG.canvas.width,
          y: 40 + Math.random() * 60,
          width: SPRITE_CONFIG.obstacles.jellyfish.width,
          height: SPRITE_CONFIG.obstacles.jellyfish.height,
          type,
          animationFrame: 0,
          animationTimer: 0,
        };
        break;
    }

    this.obstacles.push(obstacle);
  }

   private updateClouds() {
    if (this.gameState.state !== 'PLAYING') return;

    this.clouds.forEach(cloud => {
      // Bubbles rise and move left
      cloud.x -= cloud.speed;
      cloud.y -= cloud.speed * 0.3; // Bubbles float up
      
      // Reset bubble when it goes off screen
      if (cloud.x + cloud.size < 0 || cloud.y + cloud.size < 0) {
        cloud.x = GAME_CONFIG.canvas.width + Math.random() * 100;
        cloud.y = Math.random() * GAME_CONFIG.canvas.height;
        cloud.size = 3 + Math.random() * 8;
      }
    });
  }

  private updateGame(deltaTime: number) {
    if (this.gameState.state !== 'PLAYING') return;

    // Update score
    this.gameState.score += 0.1;

    // Increase speed
    if (Math.floor(this.gameState.score) % GAME_CONFIG.game.speedIncreaseInterval === 0) {
      this.gameState.speed = Math.min(this.gameState.speed + GAME_CONFIG.game.speedIncrease, 15);
    }

    // Update ground position
    this.gameState.groundX -= this.gameState.speed;
    if (this.gameState.groundX <= -24) {
      this.gameState.groundX = 0;
    }

    // Check collisions
    this.checkCollisions();

    // Play score sound every 100 points
    if (Math.floor(this.gameState.score) % 100 === 0 && this.gameState.score > 0) {
      audioManager.playSound('score', 0.2);
    }
  }

   private checkCollisions() {
    const fishRect = {
      x: this.dinoState.x + 8,
      y: this.dinoState.y + 5,
      width: GAME_CONFIG.dino.width - 16,
      height: this.dinoState.state === 'DIVING' ? GAME_CONFIG.dino.duckHeight - 10 : GAME_CONFIG.dino.height - 10,
    };

    for (const obstacle of this.obstacles) {
      let obstacleRect;
      
      // Different collision boxes for different sea creatures
      switch (obstacle.type) {
        case 'SHARK_SMALL':
        case 'SHARK_LARGE':
          obstacleRect = {
            x: obstacle.x + 8,
            y: obstacle.y + 5,
            width: obstacle.width - 16,
            height: obstacle.height - 10,
          };
          break;
        case 'OCTOPUS_HIGH':
        case 'OCTOPUS_LOW':
          obstacleRect = {
            x: obstacle.x + 5,
            y: obstacle.y + 3,
            width: obstacle.width - 10,
            height: obstacle.height - 6,
          };
          break;
        case 'JELLYFISH':
          obstacleRect = {
            x: obstacle.x + 6,
            y: obstacle.y + 4,
            width: obstacle.width - 12,
            height: obstacle.height - 8,
          };
          break;
        default:
          obstacleRect = {
            x: obstacle.x + 3,
            y: obstacle.y + 3,
            width: obstacle.width - 6,
            height: obstacle.height - 6,
          };
      }

      if (this.isColliding(fishRect, obstacleRect)) {
        this.gameOver();
        return;
      }
    }
  }

  private isColliding(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private gameOver() {
    this.gameState.state = 'GAME_OVER';
    this.dinoState.state = 'DEAD';
    audioManager.playSound('hit', 0.5);

    // Update high score
    const score = Math.floor(this.gameState.score);
    if (score > this.gameState.highScore) {
      this.gameState.highScore = score;
      localStorage.setItem('dino-high-score', score.toString());
    }
  }

   private render() {
    // Clear canvas with underwater gradient
    const waterGradient = this.ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.canvas.height);
    waterGradient.addColorStop(0, '#4169E1'); // Royal blue (surface)
    waterGradient.addColorStop(0.3, '#1E90FF'); // Dodger blue
    waterGradient.addColorStop(0.7, '#00CED1'); // Dark turquoise
    waterGradient.addColorStop(1, '#006400'); // Dark green (deep)
    this.ctx.fillStyle = waterGradient;
    this.ctx.fillRect(0, 0, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height);

    // Draw water surface effect
    this.renderWaterSurface();

    // Draw bubbles
    this.renderClouds();

    // Draw seaweed and seafloor
    this.renderGround();

    // Draw obstacles (sea creatures)
    this.renderObstacles();

    // Draw fish (player)
    this.renderDino();

    // Draw UI
    this.renderUI();
  }

  private renderWaterSurface() {
    // Animated water surface
    const time = Date.now() * 0.003;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let x = 0; x < GAME_CONFIG.canvas.width; x += 10) {
      const y = 15 + Math.sin(x * 0.1 + time) * 3;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    
    // Surface light rays
    this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.2)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = i * 160 + Math.sin(time + i) * 20;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + 30, GAME_CONFIG.canvas.height * 0.6);
      this.ctx.stroke();
    }
  }

   private renderClouds() {
    // Render bubbles
    this.clouds.forEach(bubble => {
      // Bubble gradient
      const bubbleGradient = this.ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.size
      );
      bubbleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      bubbleGradient.addColorStop(0.7, 'rgba(173, 216, 230, 0.4)');
      bubbleGradient.addColorStop(1, 'rgba(0, 100, 200, 0.2)');
      
      this.ctx.fillStyle = bubbleGradient;
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Bubble highlight
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

   private renderGround() {
    // Seafloor gradient
    const seafloorGradient = this.ctx.createLinearGradient(0, GAME_CONFIG.ground.y, 0, GAME_CONFIG.canvas.height);
    seafloorGradient.addColorStop(0, '#8B7355'); // Sandy brown
    seafloorGradient.addColorStop(0.5, '#CD853F'); // Peru
    seafloorGradient.addColorStop(1, '#A0522D'); // Sienna
    this.ctx.fillStyle = seafloorGradient;
    this.ctx.fillRect(0, GAME_CONFIG.ground.y, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height - GAME_CONFIG.ground.y);

    // Seafloor edge
    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(0, GAME_CONFIG.ground.y, GAME_CONFIG.canvas.width, 2);

    // Seaweed
    this.ctx.fillStyle = '#228B22'; // Forest green
    for (let x = this.gameState.groundX; x < GAME_CONFIG.canvas.width + 50; x += 40) {
      const seaweedHeight = 15 + Math.sin(x * 0.1 + Date.now() * 0.002) * 5;
      const seaweedSway = Math.sin(Date.now() * 0.003 + x * 0.1) * 3;
      
      // Seaweed stem
      this.ctx.beginPath();
      this.ctx.moveTo(x + seaweedSway, GAME_CONFIG.ground.y);
      this.ctx.quadraticCurveTo(
        x + seaweedSway + Math.sin(Date.now() * 0.004) * 2, 
        GAME_CONFIG.ground.y - seaweedHeight / 2,
        x + seaweedSway + Math.sin(Date.now() * 0.003) * 4, 
        GAME_CONFIG.ground.y - seaweedHeight
      );
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = '#228B22';
      this.ctx.stroke();
      
      // Seaweed leaves
      for (let i = 1; i < 4; i++) {
        const leafY = GAME_CONFIG.ground.y - (seaweedHeight * i / 4);
        const leafSway = Math.sin(Date.now() * 0.005 + i) * 2;
        this.ctx.fillStyle = '#32CD32';
        this.ctx.beginPath();
        this.ctx.ellipse(x + seaweedSway + leafSway, leafY, 4, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Coral and rocks
    this.ctx.fillStyle = '#FF7F50'; // Coral
    for (let x = this.gameState.groundX; x < GAME_CONFIG.canvas.width; x += 60) {
      if (Math.sin(x * 0.03) > 0.2) {
        // Coral
        this.ctx.beginPath();
        this.ctx.arc(x + 20, GAME_CONFIG.ground.y + 5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Coral branches
        this.ctx.strokeStyle = '#FF6347';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 20, GAME_CONFIG.ground.y + 1);
        this.ctx.lineTo(x + 15, GAME_CONFIG.ground.y - 5);
        this.ctx.moveTo(x + 20, GAME_CONFIG.ground.y + 1);
        this.ctx.lineTo(x + 25, GAME_CONFIG.ground.y - 3);
        this.ctx.stroke();
      } else {
        // Rocks
        this.ctx.fillStyle = '#696969';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 10, GAME_CONFIG.ground.y + 8, 6, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Sand particles
    this.ctx.fillStyle = 'rgba(255, 248, 220, 0.3)';
    for (let x = this.gameState.groundX; x < GAME_CONFIG.canvas.width; x += 20) {
      for (let i = 0; i < 3; i++) {
        const px = x + Math.random() * 15;
        const py = GAME_CONFIG.ground.y + 5 + Math.random() * 10;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

   private renderDino() {
    const fishHeight = this.dinoState.state === 'DIVING' ? GAME_CONFIG.dino.duckHeight : GAME_CONFIG.dino.height;
    const x = this.dinoState.x;
    const y = this.dinoState.y;
    const time = Date.now() * 0.005;

    // Fish color scheme
    const primaryColor = this.dinoState.state === 'DEAD' ? '#8B4513' : '#FF6347'; // Brown when dead, tomato when alive
    const secondaryColor = this.dinoState.state === 'DEAD' ? '#654321' : '#FF4500';
    const bellyColor = this.dinoState.state === 'DEAD' ? '#D2691E' : '#FFA07A';
    const finColor = '#FFD700'; // Gold fins

    // Swimming animation
    const swimBob = Math.sin(time * 2) * 1;
    const bodyY = y + swimBob;

    // Main body (fish-shaped)
    this.ctx.fillStyle = primaryColor;
    this.ctx.beginPath();
    this.ctx.ellipse(x + 20, bodyY + 15, 18, fishHeight/2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Belly
    this.ctx.fillStyle = bellyColor;
    this.ctx.beginPath();
    this.ctx.ellipse(x + 20, bodyY + 18, 12, fishHeight/3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Tail fin (animated)
    const tailWave = Math.sin(time * 3) * 0.3;
    this.ctx.fillStyle = finColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, bodyY + 15);
    this.ctx.lineTo(x - 8, bodyY + 5 + tailWave * 5);
    this.ctx.lineTo(x - 5, bodyY + 15);
    this.ctx.lineTo(x - 8, bodyY + 25 - tailWave * 5);
    this.ctx.closePath();
    this.ctx.fill();

    // Tail fin outline
    this.ctx.strokeStyle = secondaryColor;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Dorsal fin (top)
    if (this.dinoState.state !== 'DIVING') {
      this.ctx.fillStyle = finColor;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 15, bodyY + 5);
      this.ctx.lineTo(x + 12, bodyY - 2);
      this.ctx.lineTo(x + 25, bodyY + 2);
      this.ctx.lineTo(x + 28, bodyY + 8);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Pectoral fins (side)
    const finFlap = Math.sin(time * 2.5) * 0.5;
    this.ctx.fillStyle = finColor;
    
    // Left fin
    this.ctx.save();
    this.ctx.translate(x + 12, bodyY + 20);
    this.ctx.rotate(finFlap);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Right fin
    this.ctx.save();
    this.ctx.translate(x + 28, bodyY + 20);
    this.ctx.rotate(-finFlap);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Head/mouth
    this.ctx.fillStyle = primaryColor;
    this.ctx.beginPath();
    this.ctx.ellipse(x + 35, bodyY + 15, 8, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Mouth
    this.ctx.strokeStyle = secondaryColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x + 40, bodyY + 17, 3, 0, Math.PI);
    this.ctx.stroke();

    // Eye
    if (this.dinoState.state === 'DEAD') {
      // X eyes when dead
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 32, bodyY + 10);
      this.ctx.lineTo(x + 36, bodyY + 14);
      this.ctx.moveTo(x + 36, bodyY + 10);
      this.ctx.lineTo(x + 32, bodyY + 14);
      this.ctx.stroke();
    } else {
      // Fish eye
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x + 34, bodyY + 12, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(x + 35, bodyY + 12, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eye shine
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x + 36, bodyY + 11, 1, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Fish scales/stripes
    if (this.dinoState.state !== 'DEAD') {
      this.ctx.strokeStyle = secondaryColor;
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath();
        this.ctx.arc(x + 15 + i * 6, bodyY + 12, 6, 0, Math.PI, true);
        this.ctx.stroke();
      }
    }

    // Bubbles from fish (breathing)
    if (this.dinoState.state !== 'DEAD' && Math.random() > 0.95) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 2; i++) {
        this.ctx.beginPath();
        this.ctx.arc(x + 42 + i * 4, bodyY + 15 - i * 3, 2 - i, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

   private renderObstacles() {
    this.obstacles.forEach(obstacle => {
      const time = Date.now() * 0.003;
      
      switch (obstacle.type) {
        case 'SHARK_SMALL':
        case 'SHARK_LARGE':
          const sx = obstacle.x;
          const sy = obstacle.y;
          const swidth = obstacle.width;
          const sheight = obstacle.height;
          
          // Shark swimming motion
          const sharkBob = Math.sin(time * 2 + sx * 0.01) * 2;
          
          // Shark body (main)
          const sharkGradient = this.ctx.createLinearGradient(sx, sy, sx + swidth, sy);
          sharkGradient.addColorStop(0, '#708090'); // Slate gray
          sharkGradient.addColorStop(0.3, '#2F4F4F'); // Dark slate gray
          sharkGradient.addColorStop(1, '#696969'); // Dim gray
          this.ctx.fillStyle = sharkGradient;
          this.ctx.beginPath();
          this.ctx.ellipse(sx + swidth/2, sy + sheight/2 + sharkBob, swidth/2, sheight/2, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Shark belly
          this.ctx.fillStyle = '#F5F5F5'; // White smoke
          this.ctx.beginPath();
          this.ctx.ellipse(sx + swidth/2, sy + sheight/2 + 5 + sharkBob, swidth/2.5, sheight/4, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Shark head/snout
          this.ctx.fillStyle = sharkGradient;
          this.ctx.beginPath();
          this.ctx.ellipse(sx + swidth - 8, sy + sheight/2 + sharkBob, 12, sheight/3, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Dorsal fin
          this.ctx.fillStyle = '#2F4F4F';
          this.ctx.beginPath();
          this.ctx.moveTo(sx + swidth/3, sy + sharkBob);
          this.ctx.lineTo(sx + swidth/3 - 5, sy - 8 + sharkBob);
          this.ctx.lineTo(sx + swidth/2, sy + 3 + sharkBob);
          this.ctx.closePath();
          this.ctx.fill();

          // Tail fin (animated)
          const tailSwish = Math.sin(time * 3 + sx * 0.02) * 0.3;
          this.ctx.fillStyle = '#2F4F4F';
          this.ctx.beginPath();
          this.ctx.moveTo(sx, sy + sheight/2 + sharkBob);
          this.ctx.lineTo(sx - 15, sy + sheight/4 + sharkBob + tailSwish * 10);
          this.ctx.lineTo(sx - 8, sy + sheight/2 + sharkBob);
          this.ctx.lineTo(sx - 15, sy + 3*sheight/4 + sharkBob - tailSwish * 10);
          this.ctx.closePath();
          this.ctx.fill();

          // Pectoral fins
          this.ctx.fillStyle = '#708090';
          this.ctx.beginPath();
          this.ctx.ellipse(sx + swidth/4, sy + sheight + sharkBob, 8, 4, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Shark eye
          this.ctx.fillStyle = '#000000';
          this.ctx.beginPath();
          this.ctx.arc(sx + swidth - 15, sy + sheight/3 + sharkBob, 3, 0, Math.PI * 2);
          this.ctx.fill();

          // Scary shark teeth
          this.ctx.fillStyle = '#FFFFFF';
          for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(sx + swidth - 8 + i * 4, sy + sheight/2 + 3 + sharkBob);
            this.ctx.lineTo(sx + swidth - 6 + i * 4, sy + sheight/2 + sharkBob);
            this.ctx.lineTo(sx + swidth - 4 + i * 4, sy + sheight/2 + 3 + sharkBob);
            this.ctx.closePath();
            this.ctx.fill();
          }

          // Gills
          this.ctx.strokeStyle = '#2F4F4F';
          this.ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(sx + swidth/3 + i * 5, sy + sheight/4 + sharkBob);
            this.ctx.lineTo(sx + swidth/3 + i * 5, sy + 3*sheight/4 + sharkBob);
            this.ctx.stroke();
          }
          break;
          
        case 'OCTOPUS_HIGH':
        case 'OCTOPUS_LOW':
          const ox = obstacle.x;
          const oy = obstacle.y;
          const owidth = obstacle.width;
          const oheight = obstacle.height;
          const octoFloat = Math.sin(time * 1.5 + ox * 0.01) * 3;
          
          // Octopus body/head
          const octoGradient = this.ctx.createRadialGradient(ox + owidth/2, oy + oheight/3, 0, ox + owidth/2, oy + oheight/3, owidth/2);
          octoGradient.addColorStop(0, '#8B008B'); // Dark magenta
          octoGradient.addColorStop(0.5, '#9932CC'); // Dark orchid
          octoGradient.addColorStop(1, '#4B0082'); // Indigo
          this.ctx.fillStyle = octoGradient;
          this.ctx.beginPath();
          this.ctx.ellipse(ox + owidth/2, oy + oheight/3 + octoFloat, owidth/2.5, oheight/3, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Tentacles (animated)
          this.ctx.fillStyle = '#8B008B';
          this.ctx.lineWidth = 4;
          this.ctx.lineCap = 'round';
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const tentacleWave = Math.sin(time * 2 + i + ox * 0.01) * 10;
            const tentacleLength = 15 + Math.sin(time + i) * 5;
            
            this.ctx.strokeStyle = i % 2 === 0 ? '#8B008B' : '#9932CC';
            this.ctx.beginPath();
            this.ctx.moveTo(ox + owidth/2, oy + oheight/2 + octoFloat);
            this.ctx.quadraticCurveTo(
              ox + owidth/2 + Math.cos(angle) * tentacleLength + tentacleWave,
              oy + oheight/2 + Math.sin(angle) * tentacleLength + octoFloat,
              ox + owidth/2 + Math.cos(angle) * (tentacleLength + 8) + tentacleWave * 1.5,
              oy + oheight/2 + Math.sin(angle) * (tentacleLength + 8) + octoFloat
            );
            this.ctx.stroke();

            // Tentacle suction cups
            this.ctx.fillStyle = '#FF69B4';
            for (let j = 1; j < 4; j++) {
              const suctionX = ox + owidth/2 + Math.cos(angle) * (tentacleLength * j / 4) + tentacleWave * (j / 4);
              const suctionY = oy + oheight/2 + Math.sin(angle) * (tentacleLength * j / 4) + octoFloat;
              this.ctx.beginPath();
              this.ctx.arc(suctionX, suctionY, 1.5, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }

          // Octopus eyes
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.beginPath();
          this.ctx.arc(ox + owidth/2 - 6, oy + oheight/4 + octoFloat, 4, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.arc(ox + owidth/2 + 6, oy + oheight/4 + octoFloat, 4, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = '#000000';
          this.ctx.beginPath();
          this.ctx.arc(ox + owidth/2 - 6, oy + oheight/4 + octoFloat, 2, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.arc(ox + owidth/2 + 6, oy + oheight/4 + octoFloat, 2, 0, Math.PI * 2);
          this.ctx.fill();

          // Octopus spots
          this.ctx.fillStyle = '#FF1493';
          for (let i = 0; i < 5; i++) {
            const spotX = ox + owidth/4 + Math.random() * owidth/2;
            const spotY = oy + oheight/4 + Math.random() * oheight/3 + octoFloat;
            this.ctx.beginPath();
            this.ctx.arc(spotX, spotY, 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
          break;

        case 'JELLYFISH':
          const jx = obstacle.x;
          const jy = obstacle.y;
          const jwidth = obstacle.width;
          const jheight = obstacle.height;
          const jellyPulse = Math.sin(time * 2 + jx * 0.01) * 0.3 + 1;
          
          // Jellyfish bell/umbrella
          const jellyGradient = this.ctx.createRadialGradient(jx + jwidth/2, jy + jheight/3, 0, jx + jwidth/2, jy + jheight/3, jwidth/2);
          jellyGradient.addColorStop(0, 'rgba(255, 192, 203, 0.8)'); // Pink
          jellyGradient.addColorStop(0.5, 'rgba(255, 105, 180, 0.6)'); // Hot pink
          jellyGradient.addColorStop(1, 'rgba(199, 21, 133, 0.4)'); // Medium violet red
          this.ctx.fillStyle = jellyGradient;
          this.ctx.beginPath();
          this.ctx.ellipse(jx + jwidth/2, jy + jheight/3, (jwidth/2) * jellyPulse, (jheight/3) * jellyPulse, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Jellyfish bell edge
          this.ctx.strokeStyle = 'rgba(255, 20, 147, 0.8)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.ellipse(jx + jwidth/2, jy + jheight/3, (jwidth/2) * jellyPulse, (jheight/3) * jellyPulse, 0, 0, Math.PI * 2);
          this.ctx.stroke();

          // Jellyfish tentacles
          this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.7)';
          this.ctx.lineWidth = 2;
          this.ctx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            const tentacleX = jx + jwidth/4 + (i * jwidth/6);
            const tentacleWave = Math.sin(time * 3 + i + jx * 0.02) * 8;
            const tentacleLength = 20 + Math.sin(time * 1.5 + i) * 8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(tentacleX, jy + jheight/2);
            for (let j = 1; j <= 4; j++) {
              const segmentY = jy + jheight/2 + (tentacleLength * j / 4);
              const segmentX = tentacleX + Math.sin(time * 2 + j + i) * (tentacleWave * j / 4);
              this.ctx.lineTo(segmentX, segmentY);
            }
            this.ctx.stroke();
          }

          // Jellyfish glow effect
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.beginPath();
          this.ctx.ellipse(jx + jwidth/2, jy + jheight/4, (jwidth/4) * jellyPulse, (jheight/6) * jellyPulse, 0, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }
    });
  }

   private renderUI() {
    // Score with underwater-themed background
    this.ctx.fillStyle = 'rgba(0, 100, 200, 0.8)';
    this.ctx.fillRect(GAME_CONFIG.canvas.width - 160, 5, 150, 35);
    
    this.ctx.fillStyle = '#FFFFFF'; // White text for underwater visibility
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'right';
    
    // Score
    const score = Math.floor(this.gameState.score).toString().padStart(5, '0');
    this.ctx.fillText(`HI ${this.gameState.highScore.toString().padStart(5, '0')}`, 
                     GAME_CONFIG.canvas.width - 20, 22);
    this.ctx.fillStyle = '#FFD700'; // Gold score
    this.ctx.fillText(`${score}`, GAME_CONFIG.canvas.width - 20, 35);

    // Game state messages
    this.ctx.textAlign = 'center';

    if (this.gameState.state === 'MENU') {
      // Title background with underwater effect
      this.ctx.fillStyle = 'rgba(0, 100, 200, 0.9)';
      this.ctx.fillRect(GAME_CONFIG.canvas.width / 2 - 150, GAME_CONFIG.canvas.height / 2 - 50, 300, 60);
      
      // Border effect
      this.ctx.strokeStyle = '#00CED1';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(GAME_CONFIG.canvas.width / 2 - 150, GAME_CONFIG.canvas.height / 2 - 50, 300, 60);
      
      this.ctx.fillStyle = '#FFD700'; // Gold
      this.ctx.font = 'bold 24px monospace';
      this.ctx.fillText('🐠 UNDERWATER ADVENTURE', GAME_CONFIG.canvas.width / 2, GAME_CONFIG.canvas.height / 2 - 30);
      
      this.ctx.fillStyle = '#00FFFF'; // Cyan
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText('SPACE TO SWIM UP', GAME_CONFIG.canvas.width / 2, GAME_CONFIG.canvas.height / 2 - 5);
    } else if (this.gameState.state === 'GAME_OVER') {
      // Game over with dark water effect
      this.ctx.fillStyle = 'rgba(0, 0, 100, 0.3)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height);
      
      this.ctx.fillStyle = 'rgba(0, 50, 150, 0.95)';
      this.ctx.fillRect(GAME_CONFIG.canvas.width / 2 - 140, GAME_CONFIG.canvas.height / 2 - 60, 280, 80);
      
      // Border
      this.ctx.strokeStyle = '#FF4500';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(GAME_CONFIG.canvas.width / 2 - 140, GAME_CONFIG.canvas.height / 2 - 60, 280, 80);
      
      this.ctx.fillStyle = '#FF6347'; // Coral red
      this.ctx.font = 'bold 28px monospace';
      this.ctx.fillText('🦈 EATEN BY SEA MONSTER!', GAME_CONFIG.canvas.width / 2, GAME_CONFIG.canvas.height / 2 - 35);
      
      this.ctx.fillStyle = '#00FFFF'; // Cyan
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText('SPACE TO SWIM AGAIN', GAME_CONFIG.canvas.width / 2, GAME_CONFIG.canvas.height / 2 - 5);
    }
  }

  private gameLoop = (currentTime: number) => {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.updateDino(deltaTime);
    this.updateObstacles(deltaTime);
    this.updateClouds();
    this.updateGame(deltaTime);

    this.render();

    if (this.isRunning) {
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    audioManager.initialize();
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  getScore() {
    return Math.floor(this.gameState.score);
  }

  getHighScore() {
    return this.gameState.highScore;
  }
}