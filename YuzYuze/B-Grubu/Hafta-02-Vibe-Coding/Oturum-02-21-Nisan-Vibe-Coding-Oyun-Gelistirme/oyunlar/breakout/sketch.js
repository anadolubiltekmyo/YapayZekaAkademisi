let balls = [];
let paddle;
let bricks = [];
let powerups = [];
let floatingTexts = [];
let score = 0;
let lives = 3;
let gameState = 'START'; 

let rowColors = ['#FF4B4B', '#FF4B4B', '#FF8F3D', '#FF8F3D', '#FFD03D', '#06D6A0', '#06D6A0', '#118AB2'];
let rowPoints = [80, 80, 50, 50, 40, 20, 20, 10];
const CANVAS_W = 600;
const CANVAS_H = 400;

function setup() {
  let canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent('game-container');
  textFont('Inter');
  initGame();
}

function initGame() {
  paddle = new Paddle();
  balls = [new Ball()];
  bricks = [];
  powerups = [];
  floatingTexts = [];
  score = 0;
  lives = 3;
  gameState = 'START';
  createBricks();
}

function createBricks() {
  let rows = 8;
  let cols = 12;
  let padding = 4;
  let brickW = CANVAS_W / cols;
  let brickH = 20;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      bricks.push(new Brick(
        j * brickW + padding / 2, 
        i * brickH + 50, 
        brickW - padding, 
        brickH - padding, 
        rowColors[i], 
        rowPoints[i]
      ));
    }
  }
}

function draw() {
  background('#18181f');

  if (gameState === 'START') {
    drawBricks();
    paddle.display();
    
    balls[0].x = paddle.x + paddle.w / 2;
    balls[0].y = paddle.y - balls[0].r;
    balls[0].display();
    
    drawUI();
    
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(28);
    text("BAŞLAMAK İÇİN TIKLA", width / 2, height / 2 + 50);
    textStyle(NORMAL);

  } else if (gameState === 'PLAYING') {
    paddle.update();
    paddle.display();

    // Update and draw powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      let pu = powerups[i];
      pu.update();
      pu.display();
      pu.checkPaddle(paddle);
      if (!pu.active) powerups.splice(i, 1);
    }

    // Update and draw balls
    for (let i = balls.length - 1; i >= 0; i--) {
      let b = balls[i];
      b.update();
      b.display();
      b.checkPaddle(paddle);
      
      for (let br of bricks) {
        if (b.checkBrick(br)) {
          break; // only handle one brick collision per frame per ball optimally
        }
      }

      if (!b.active) balls.splice(i, 1);
    }

    drawBricks();
    drawUI();
    drawFloatingTexts();

    // Life check
    if (balls.length === 0) {
      lives--;
      if (lives <= 0) {
        gameState = 'GAMEOVER';
      } else {
        gameState = 'START';
        balls.push(new Ball());
        powerups = []; 
        paddle.w = paddle.baseW; 
      }
    }

    // Win check
    let allBroken = true;
    for (let br of bricks) {
      if (br.active) {
        allBroken = false;
        break;
      }
    }
    if (allBroken) gameState = 'WIN';

  } else if (gameState === 'GAMEOVER') {
    drawBricks();
    paddle.display();
    drawUI();
    
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(40);
    fill('#FF4B4B');
    text("OYUN BİTTİ", width / 2, height / 2 - 20);
    textSize(20);
    fill(255);
    text("Yeniden Başlamak İçin Tıkla", width / 2, height / 2 + 30);
    textStyle(NORMAL);
    
  } else if (gameState === 'WIN') {
    drawBricks();
    paddle.display();
    drawUI();
    
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(40);
    fill('#06D6A0');
    text("KAZANDIN!", width / 2, height / 2 - 30);
    textSize(24);
    fill(255);
    text("Skor: " + score, width / 2, height / 2 + 10);
    textSize(20);
    text("Yeniden Başlamak İçin Tıkla", width / 2, height / 2 + 50);
    textStyle(NORMAL);
  }
}

function mousePressed() {
  if (gameState === 'START') {
    gameState = 'PLAYING';
    balls[0].vx = random([-3, 3]);
    balls[0].vy = -5;
  } else if (gameState === 'GAMEOVER' || gameState === 'WIN') {
    initGame();
  }
}

function drawBricks() {
  for (let br of bricks) br.display();
}

function drawUI() {
  fill(255);
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(18);
  text("Skor: " + score, 15, 20);
  
  textAlign(RIGHT, CENTER);
  text("Can: " + lives, width - 15, 20);
  textStyle(NORMAL);
}

function drawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.y -= 1;
    ft.life -= 3;
    
    let c = color(ft.color);
    c.setAlpha(ft.life);
    fill(c);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(ft.msg, ft.x, ft.y);
    textStyle(NORMAL);
    
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function activatePowerUp(type, x, y) {
  if (type === 'enlarge') {
    paddle.w = Math.min(paddle.baseW * 1.6, 200);
    paddle.timer = 600; 
    floatingTexts.push({msg: "PADDLE BÜYÜDÜ", x: x, y: y, life: 255, color: '#06D6A0'});
  } else if (type === 'slow') {
    for (let b of balls) {
      if (b.slowTimer <= 0) {
        b.vx *= 0.6;
        b.vy *= 0.6;
      }
      b.slowTimer = 400;
    }
    floatingTexts.push({msg: "TOP YAVAŞLADI", x: x, y: y, life: 255, color: '#118AB2'});
  } else if (type === 'multiball') {
    if (balls.length > 0) {
      let b = balls[balls.length - 1];
      balls.push(new Ball(b.x, b.y, b.vx + random(-1.5, 1.5), -abs(b.vy) - 1));
      balls.push(new Ball(b.x, b.y, b.vx + random(-1.5, 1.5), -abs(b.vy) - 1));
    } else {
      balls.push(new Ball(paddle.x + paddle.w/2, paddle.y - 10, -3, -5));
      balls.push(new Ball(paddle.x + paddle.w/2, paddle.y - 10, 3, -5));
    }
    floatingTexts.push({msg: "+3 TOP", x: x, y: y, life: 255, color: '#FF4B4B'});
  }
}

class Paddle {
  constructor() {
    this.baseW = 80;
    this.w = this.baseW;
    this.h = 12;
    this.x = CANVAS_W / 2 - this.w / 2;
    this.y = CANVAS_H - 30;
    this.timer = 0;
  }
  update() {
    let targetX = mouseX - this.w / 2;
    this.x += (targetX - this.x) * 0.3; 
    this.x = constrain(this.x, 0, CANVAS_W - this.w);
    
    if (this.timer > 0) {
      this.timer--;
      if (this.timer === 0) {
        this.w = this.baseW;
      }
    }
  }
  display() {
    fill('#ffffff');
    noStroke();
    rect(this.x, this.y, this.w, this.h, 6);
  }
}

class Ball {
  constructor(x, y, vx, vy) {
    this.r = 6;
    this.x = x || width / 2;
    this.y = y || height - 40;
    this.vx = vx || 0;
    this.vy = vy || 0;
    this.active = true;
    this.slowTimer = 0;
  }
  update() {
    if (this.slowTimer > 0) {
      this.slowTimer--;
      if (this.slowTimer === 0) {
        this.vx *= 1.66;
        this.vy *= 1.66;
      }
    }
    
    let speed = sqrt(this.vx*this.vx + this.vy*this.vy);
    let maxSpeed = this.slowTimer > 0 ? 5 : 8;
    if (speed > maxSpeed) {
       this.vx = (this.vx / speed) * maxSpeed;
       this.vy = (this.vy / speed) * maxSpeed;
    }
    
    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.r < 0) {
      this.vx = abs(this.vx);
      this.x = this.r;
    } else if (this.x + this.r > width) {
      this.vx = -abs(this.vx);
      this.x = width - this.r;
    }
    
    if (this.y - this.r < 0) {
      this.vy = abs(this.vy);
      this.y = this.r;
    }
    
    if (this.y + this.r > height) {
      this.active = false;
    }
  }
  display() {
    fill('#ffffff');
    noStroke();
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = '#ffffff';
    circle(this.x, this.y, this.r * 2);
    drawingContext.shadowBlur = 0;
  }
  
  checkPaddle(p) {
    if (this.vy > 0) { 
      let testX = this.x;
      let testY = this.y;

      if (this.x < p.x) testX = p.x;
      else if (this.x > p.x + p.w) testX = p.x + p.w;

      if (this.y < p.y) testY = p.y;
      else if (this.y > p.y + p.h) testY = p.y + p.h;

      let distX = this.x - testX;
      let distY = this.y - testY;
      let distance = sqrt((distX * distX) + (distY * distY));

      if (distance <= this.r) {
        this.y = p.y - this.r;
        
        let hitPoint = this.x - (p.x + p.w / 2);
        let normalizedHit = hitPoint / (p.w / 2); 
        
        let speed = sqrt(this.vx*this.vx + this.vy*this.vy);
        let maxAngle = PI / 3; 
        let bounceAngle = normalizedHit * maxAngle;
        
        this.vx = speed * sin(bounceAngle);
        this.vy = -speed * cos(bounceAngle);
      }
    }
  }
  
  checkBrick(b) {
    if (b.active) {
      let testX = this.x;
      let testY = this.y;
      
      if (this.x < b.x) testX = b.x;
      else if (this.x > b.x + b.w) testX = b.x + b.w;
      
      if (this.y < b.y) testY = b.y;
      else if (this.y > b.y + b.h) testY = b.y + b.h;
      
      let distX = this.x - testX;
      let distY = this.y - testY;
      let distance = sqrt((distX*distX) + (distY*distY));
      
      if (distance <= this.r) {
        b.active = false;
        score += b.points;
        spawnPowerup(b.x + b.w/2, b.y + b.h/2);
        
        if (abs(distX) > abs(distY)) {
          this.vx *= -1; 
        } else {
          this.vy *= -1; 
        }
        
        if (this.slowTimer <= 0) {
           this.vx *= 1.02;
           this.vy *= 1.02;
        }

        return true;
      }
    }
    return false;
  }
}

class Brick {
  constructor(x, y, w, h, c, p) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = c;
    this.points = p;
    this.active = true;
  }
  display() {
    if (this.active) {
      fill(this.color);
      noStroke();
      rect(this.x, this.y, this.w, this.h, 4);
    }
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.vy = 2.5;
    this.type = type; 
    this.active = true;
    
    if (this.type === 'enlarge') this.color = '#06D6A0';
    else if (this.type === 'slow') this.color = '#118AB2';
    else this.color = '#FF4B4B';
  }
  update() {
    this.y += this.vy;
    if (this.y > height) this.active = false;
  }
  display() {
    if (this.active) {
      fill(this.color);
      noStroke();
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = this.color;
      
      rectMode(CENTER);
      rect(this.x, this.y, this.r * 2, this.r * 2, 4);
      rectMode(CORNER);
      
      drawingContext.shadowBlur = 0;
      
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(12);
      textStyle(BOLD);
      let letter = this.type === 'enlarge' ? 'P' : (this.type === 'slow' ? 'S' : 'M');
      text(letter, this.x, this.y);
      textStyle(NORMAL);
    }
  }
  checkPaddle(p) {
    if (this.active && 
        this.y + this.r >= p.y && this.y - this.r <= p.y + p.h &&
        this.x + this.r >= p.x && this.x - this.r <= p.x + p.w) {
      this.active = false;
      activatePowerUp(this.type, this.x, this.y);
    }
  }
}

function spawnPowerup(x, y) {
  if (random(1) < 0.05) { 
    let types = ['enlarge', 'slow', 'multiball'];
    let type = random(types);
    powerups.push(new PowerUp(x, y, type));
  }
}
