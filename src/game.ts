export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private player!: Player;
    private obstacles: Obstacle[] = [];
    private score: number = 0;
    private gameOver: boolean = false;
    private gameWon: boolean = false;
    private lastObstacleTime: number = 0;
    private obstacleInterval: number = 1000; // ms
    private gameMode: 'score' | 'finish' | 'select' = 'select';
    private obstacleSpeed: number = 5;
    private readonly minHeight: number = 200; // Minimalna wysokość (środek planszy)
    private readonly maxHeight: number = 370; // Maksymalna wysokość (dół planszy)
    private nextObstacleY: number = 0; // Dodajemy zmienną na pozycję Y następnej przeszkody
    private canJumpOnPlatforms: boolean = true;
    private obstaclesCanMove: boolean = true;
    private menuState: 'type' | 'speed' | 'mode' = 'type';
    private selectedType: number = 0;
    private selectedSpeed: number = 0;
    private backgroundOffset: number = 0;
    private cloudPositions: Array<{x: number, y: number}> = [];
    private mountainPositions: Array<{x: number}> = [];

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 400;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;
        
        // Inicjalizacja pozycji chmur
        for (let i = 0; i < 5; i++) {
            this.cloudPositions.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * 100 + 20
            });
        }

        // Inicjalizacja pozycji gór
        for (let i = 0; i < 3; i++) {
            this.mountainPositions.push({
                x: i * 400
            });
        }
        
        this.showModeSelection();
        this.setupEventListeners();
        this.updateNextObstaclePosition();
    }

    private showModeSelection() {
        this.ctx.fillStyle = 'black';
        
        if (this.menuState === 'type') {
            this.ctx.font = '40px Arial';
            this.ctx.fillText('Wybierz typ gry:', this.canvas.width / 2 - 150, 80);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('1 - Normalna gra', this.canvas.width / 2 - 200, 150);
            this.ctx.fillText('2 - Gra bez latających przeszkód', this.canvas.width / 2 - 200, 190);
            this.ctx.fillText('3 - Gra bez wskakiwania na przeszkody', this.canvas.width / 2 - 200, 230);
            this.ctx.fillText('4 - Gra bez wskakiwania i bez latających przeszkód', this.canvas.width / 2 - 200, 270);
        } 
        else if (this.menuState === 'speed') {
            this.ctx.font = '40px Arial';
            this.ctx.fillText('Wybierz prędkość:', this.canvas.width / 2 - 150, 80);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('1 - Super wolno (2x wolniej)', this.canvas.width / 2 - 200, 130);
            this.ctx.fillText('2 - Bardzo wolno (1.5x wolniej)', this.canvas.width / 2 - 200, 160);
            this.ctx.fillText('3 - Wolno', this.canvas.width / 2 - 200, 190);
            this.ctx.fillText('4 - Normalnie', this.canvas.width / 2 - 200, 220);
            this.ctx.fillText('5 - Szybko', this.canvas.width / 2 - 200, 250);
            this.ctx.fillText('6 - Bardzo szybko (1.5x szybciej)', this.canvas.width / 2 - 200, 280);
            this.ctx.fillText('7 - Super szybko (2x szybciej)', this.canvas.width / 2 - 200, 310);
        }
        else if (this.menuState === 'mode') {
            this.ctx.font = '40px Arial';
            this.ctx.fillText('Wybierz tryb gry:', this.canvas.width / 2 - 150, 80);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('1 - Gra na czas (jak najdłużej)', this.canvas.width / 2 - 200, 150);
            this.ctx.fillText('2 - Dojście do mety', this.canvas.width / 2 - 200, 190);
        }
    }

    private initGame() {
        const playerX = this.gameMode === 'select' ? 50 : (this.gameMode === 'score' ? 200 : 50);
        this.player = new Player(playerX, this.canvas.height - 30, this.gameMode === 'select' ? 'score' : this.gameMode);
        this.obstacles = [];
        this.score = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.lastObstacleTime = 0;
        // Ustawiamy interwał bazowy na podstawie prędkości
        this.obstacleInterval = 2500 - (this.obstacleSpeed * 200);
        Obstacle.resetSizeIncrease();
        this.updateNextObstaclePosition();
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.gameMode = 'select';
                this.menuState = 'type';
                this.selectedType = 0;
                this.selectedSpeed = 0;
                setTimeout(() => {
                    this.showModeSelection();
                }, 500);
                return;
            }

            if (this.gameMode === 'select') {
                if (this.menuState === 'type' && ['1', '2', '3', '4'].includes(e.key)) {
                    this.selectedType = parseInt(e.key);
                    this.menuState = 'speed';
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this.showModeSelection();
                }
                else if (this.menuState === 'speed' && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
                    this.selectedSpeed = parseInt(e.key);
                    this.menuState = 'mode';
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this.showModeSelection();
                }
                else if (this.menuState === 'mode' && ['1', '2'].includes(e.key)) {
                    const speed = this.getSpeedForLevel(this.selectedSpeed);
                    const mode = e.key === '1' ? 'score' : 'finish';
                    
                    let canJump = true;
                    let canMove = true;

                    switch (this.selectedType) {
                        case 1: // Normalna gra
                            canJump = true;
                            canMove = true;
                            break;
                        case 2: // Bez latających przeszkód
                            canJump = true;
                            canMove = false;
                            break;
                        case 3: // Bez wskakiwania
                            canJump = false;
                            canMove = true;
                            break;
                        case 4: // Bez wskakiwania i bez latających
                            canJump = false;
                            canMove = false;
                            break;
                    }

                    this.initGameWithMode(mode, speed, canJump, canMove);
                }
                return;
            }

            // Sprawdzamy czy gra jest aktywna i gracz istnieje
            if (this.player && (this.gameMode === 'score' || this.gameMode === 'finish')) {
                if (e.code === 'ArrowUp' && !this.player.isJumping) {
                    this.player.jump();
                }
                if (e.code === 'ArrowDown') {
                    this.player.jumpDown();
                }
                if (e.code === 'ArrowLeft') {
                    this.player.moveLeft();
                }
                if (e.code === 'ArrowRight') {
                    this.player.moveRight();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            // Sprawdzamy czy gra jest aktywna i gracz istnieje
            if (this.player && (this.gameMode === 'score' || this.gameMode === 'finish')) {
                if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                    this.player.stopMoving();
                }
            }
        });
    }

    private drawBackground() {
        // Niebo
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameMode === 'score') {
            // Góry
            this.mountainPositions.forEach((mountain, index) => {
                this.ctx.fillStyle = '#808080';
                this.ctx.beginPath();
                this.ctx.moveTo(mountain.x - this.backgroundOffset, this.canvas.height);
                this.ctx.lineTo(mountain.x + 200 - this.backgroundOffset, this.canvas.height);
                this.ctx.lineTo(mountain.x + 100 - this.backgroundOffset, this.canvas.height - 150);
                this.ctx.closePath();
                this.ctx.fill();

                // Resetuj pozycję gór, gdy wyjdą poza ekran
                if (mountain.x - this.backgroundOffset < -200) {
                    this.mountainPositions[index].x = Math.max(...this.mountainPositions.map(m => m.x)) + 400;
                }
            });

            // Chmury
            this.cloudPositions.forEach((cloud, index) => {
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                const cloudX = cloud.x - this.backgroundOffset;
                this.ctx.arc(cloudX, cloud.y, 20, 0, Math.PI * 2);
                this.ctx.arc(cloudX - 15, cloud.y + 10, 15, 0, Math.PI * 2);
                this.ctx.arc(cloudX + 15, cloud.y + 10, 15, 0, Math.PI * 2);
                this.ctx.fill();

                // Resetuj pozycję chmur, gdy wyjdą poza ekran
                if (cloudX < -50) {
                    this.cloudPositions[index].x = this.canvas.width + 50;
                    this.cloudPositions[index].y = Math.random() * 100 + 20;
                }
            });

            // Wzór na trawie
            this.ctx.fillStyle = '#7BC67B';
            for (let i = 0; i < 20; i++) {
                const x = ((i * 50) - this.backgroundOffset) % this.canvas.width;
                this.ctx.fillRect(x, this.canvas.height - 30, 25, 30);
            }
        }

        // Trawa (zawsze widoczna)
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
    }

    private gameLoop = () => {
        if (this.gameMode === 'select') {
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Aktualizacja pozycji tła tylko w trybie score
        if (this.gameMode === 'score') {
            const speedMultiplier = 1 + Obstacle.getCurrentSizeIncrease() / 25;
            this.backgroundOffset += this.obstacleSpeed * speedMultiplier;
        }
        
        // Rysowanie tła
        this.drawBackground();
        
        // Aktualizacja stanu gry
        this.player.update();
        this.updateObstacles();
        this.checkCollisions();
        if (this.gameMode === 'finish') {
            this.checkWinCondition();
            this.drawFinishLine();
        }
        
        // Rysowanie
        this.drawSpawnLine();
        this.player.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        if (this.gameMode === 'score') {
            this.drawScore();
        }
        
        if (this.gameMode === 'score') {
            this.score++;
        }

        if (this.gameOver) {
            this.drawGameOver();
        } else if (this.gameWon) {
            this.drawGameWon();
        } else {
            requestAnimationFrame(this.gameLoop);
        }
    }

    private updateNextObstaclePosition() {
        this.nextObstacleY = Math.random() * (this.maxHeight - this.minHeight) + this.minHeight;
    }

    private drawSpawnLine() {
        const currentSize = 30 + Obstacle.getCurrentSizeIncrease();
        const nextObstacleSize = currentSize;

        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.canvas.width - nextObstacleSize,
            this.canvas.height,  // Ustawiamy na dole zielonej linii
            nextObstacleSize,
            -nextObstacleSize  // Rośnie w górę
        );
        this.ctx.restore();
    }

    private updateObstacles() {
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleTime > this.obstacleInterval) {
            const currentSize = 30 + Obstacle.getCurrentSizeIncrease();
            const obstacleY = this.canvas.height - currentSize;

            if (this.gameMode !== 'select') {
                const obstacle = new Obstacle(
                    this.canvas.width,
                    obstacleY,
                    this.minHeight,
                    this.maxHeight,
                    this.obstaclesCanMove,
                    this.gameMode
                );
                
                const speedMultiplier = this.gameMode === 'score' ? (1 + Obstacle.getCurrentSizeIncrease() / 25) : 1;
                obstacle.setSpeed(this.obstacleSpeed * speedMultiplier);
                
                this.obstacles.push(obstacle);
            }
            this.lastObstacleTime = currentTime;
            // Stały minimalny interwał dla danej prędkości
            const minInterval = 1500 - (this.obstacleSpeed * 100);
            this.obstacleInterval = Math.max(this.obstacleInterval - 10, minInterval);
            this.updateNextObstaclePosition();
        }

        this.obstacles.forEach(obstacle => obstacle.isPlayerStandingOn = false);

        // Sprawdzamy kolizje z platformami tylko jeśli można na nie wskakiwać
        if (this.canJumpOnPlatforms) {
            this.obstacles.forEach(obstacle => {
                if (this.player.isOnTopOf(obstacle)) {
                    obstacle.isPlayerStandingOn = true;
                    this.player.setPositionY(obstacle.y - this.player.playerHeight);
                    this.player.setVelocityY(0);
                    this.player.isJumping = false;
                }
            });
        }

        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.update();
            return obstacle.x > -obstacle.width;
        });
    }

    private checkCollisions() {
        for (const obstacle of this.obstacles) {
            if (this.player.collidesWith(obstacle)) {
                // W trybie bez wskakiwania, każda kolizja kończy grę
                if (!this.canJumpOnPlatforms) {
                    this.gameOver = true;
                    break;
                }
                // W trybie ze wskakiwaniem, tylko kolizja boczna kończy grę
                else if (!this.player.isOnTopOf(obstacle)) {
                    this.gameOver = true;
                    break;
                }
            }
        }
    }

    private checkWinCondition() {
        if (this.player.positionX >= 750) { // Gracz dotarł do końca planszy
            this.gameWon = true;
        }
    }

    private drawFinishLine() {
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(780, 0, 20, this.canvas.height);
    }

    private drawScore() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Czas: ${Math.floor(this.score / 10)} sekund`, 10, 30);
    }

    private drawGameOver() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('GAME OVER!', this.canvas.width / 2 - 80, this.canvas.height / 2);
        if (this.gameMode === 'score') {
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Twój wynik: ${Math.floor(this.score / 10)} sekund`, this.canvas.width / 2 - 80, this.canvas.height / 2 + 40);
        }
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Naciśnij spację aby zacząć od nowa', this.canvas.width / 2 - 150, this.canvas.height / 2 + 80);
    }

    private drawGameWon() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('GRATULACJE! DOTARŁEŚ DO METY!', this.canvas.width / 2 - 220, this.canvas.height / 2);
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Naciśnij spację aby zacząć od nowa', this.canvas.width / 2 - 150, this.canvas.height / 2 + 40);
    }

    private initGameWithMode(mode: 'score' | 'finish', speed: number, canJump: boolean, canMove: boolean) {
        this.gameMode = mode;
        this.obstacleSpeed = speed;
        // Dla szybszej prędkości (np. 10) będzie krótszy interwał (więcej przeszkód)
        // Dla wolniejszej prędkości (np. 2.5) będzie dłuższy interwał (mniej przeszkód)
        this.obstacleInterval = 2000 * (2.5 / speed);
        this.canJumpOnPlatforms = canJump;
        this.obstaclesCanMove = canMove;
        this.initGame();
        this.gameLoop();
    }

    private getSpeedForLevel(level: number): number {
        switch (level) {
            case 1: // Super wolno
                return 2.5;
            case 2: // Bardzo wolno
                return 3.5;
            case 3: // Wolno
                return 4;
            case 4: // Normalnie
                return 5;
            case 5: // Szybko
                return 6;
            case 6: // Bardzo szybko
                return 7.5;
            case 7: // Super szybko
                return 10;
            default:
                return 5;
        }
    }
}

class Player {
    private x: number;
    private y: number;
    private width: number = 30;
    private height: number = 30;
    private velocityY: number = 0;
    private velocityX: number = 0;
    private gravity: number = 0.8;
    private jumpForce: number = -15;
    private moveSpeed: number = 3;
    public isJumping: boolean = false;
    private currentPlatform: Obstacle | null = null;

    constructor(x: number, y: number, private gameMode: 'score' | 'finish') {
        this.x = x;
        this.y = y;
    }

    get positionX(): number {
        return this.x;
    }

    get positionY(): number {
        return this.y;
    }

    get playerHeight(): number {
        return this.height;
    }

    setPositionY(y: number) {
        this.y = y;
    }

    setVelocityY(vy: number) {
        this.velocityY = vy;
    }

    jump() {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
    }

    moveLeft() {
        if (this.gameMode === 'finish') {
            this.velocityX = -this.moveSpeed;
        }
    }

    moveRight() {
        if (this.gameMode === 'finish') {
            this.velocityX = this.moveSpeed;
        }
    }

    stopMoving() {
        this.velocityX = 0;
    }

    update() {
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Ruch poziomy tylko w trybie finish
        if (this.gameMode === 'finish') {
            this.x += this.velocityX;
        }

        // Jeśli stoimy na platformie, poruszamy się wraz z nią tylko w trybie finish
        if (this.currentPlatform && !this.isJumping && this.gameMode === 'finish') {
            this.x -= this.currentPlatform.speed;
        }

        // Ograniczenie ruchu do granic ekranu
        if (this.x < 0) this.x = 0;
        if (this.x > 770) this.x = 770;

        // Ograniczenie pozycji gracza do podłoża
        if (this.y > 370) {
            this.y = 370;
            this.velocityY = 0;
            this.isJumping = false;
            this.currentPlatform = null;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWith(obstacle: Obstacle): boolean {
        return (
            this.x < obstacle.x + obstacle.width &&
            this.x + this.width > obstacle.x &&
            this.y < obstacle.y + obstacle.height &&
            this.y + this.height > obstacle.y
        );
    }

    isOnTopOf(obstacle: Obstacle): boolean {
        // Sprawdzamy czy gracz jest w odpowiedniej pozycji względem przeszkody
        const horizontalOverlap = this.x < obstacle.x + obstacle.width && this.x + this.width > obstacle.x;
        const verticalPosition = Math.abs(this.y + this.height - obstacle.y) < 10;
        const fallingDown = this.velocityY > 0;
        
        if (horizontalOverlap && verticalPosition && fallingDown) {
            this.currentPlatform = obstacle;
            this.isJumping = false;
            return true;
        }
        return false;
    }

    jumpDown() {
        if (this.currentPlatform && !this.isJumping) {
            this.y += 10; // Przesuwamy gracza lekko w dół
            this.velocityY = 5; // Nadajemy mu lekką prędkość w dół
            this.isJumping = true;
            this.currentPlatform = null;
        }
    }
}

class Obstacle {
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private _speed: number = 5;
    private static sizeIncrease: number = 0;
    private initialY: number;
    private verticalSpeed: number;
    private maxHeight: number;
    private minHeight: number;
    public isPlayerStandingOn: boolean = false;
    private canMove: boolean;
    public gameMode: 'score' | 'finish';

    constructor(x: number, y: number, minHeight: number, maxHeight: number, canMove: boolean = true, gameMode: 'score' | 'finish') {
        this.x = x;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
        this.initialY = y;
        this.canMove = canMove;
        this.gameMode = gameMode;
        this.verticalSpeed = this.canMove ? (Math.random() * 2 - 1) * 3 : 0;
        
        // Zwiększamy rozmiar przeszkód w czasie
        const currentSize = 30 + Obstacle.sizeIncrease;
        this.width = currentSize;
        this.height = currentSize;
        
        this.y = y;
        if (this.gameMode === 'score') {
            Obstacle.sizeIncrease += 1; // Zwiększamy tempo wzrostu
        }
    }

    static resetSizeIncrease() {
        Obstacle.sizeIncrease = 0;
    }

    static getCurrentSizeIncrease(): number {
        return Obstacle.sizeIncrease;
    }

    get speed(): number {
        return this.isPlayerStandingOn ? 0 : this._speed;
    }

    setSpeed(speed: number) {
        this._speed = speed;
    }

    update() {
        if (!this.isPlayerStandingOn) {
            // Przeszkody poruszają się szybciej z czasem tylko w trybie score
            const speedMultiplier = this.gameMode === 'score' ? (1 + Obstacle.sizeIncrease / 25) : 1;
            const finalSpeed = this.gameMode === 'score' ? this._speed * speedMultiplier : this._speed;
            this.x -= finalSpeed;
            
            // Aktualizujemy rozmiar przeszkody
            if (this.gameMode === 'score') {
                const currentSize = 30 + Obstacle.sizeIncrease;
                const oldHeight = this.height;
                this.width = currentSize;
                this.height = currentSize;
                // Przesuwamy przeszkodę w górę o różnicę wysokości
                this.y -= (this.height - oldHeight);
            }
            
            if (this.canMove) {
                this.y += this.verticalSpeed;
                
                if (this.y < this.minHeight) {
                    this.y = this.minHeight;
                    this.verticalSpeed = Math.abs(this.verticalSpeed);
                } else if (this.y > this.maxHeight) {
                    this.y = this.maxHeight;
                    this.verticalSpeed = -Math.abs(this.verticalSpeed);
                }
                
                if (Math.random() < 0.03) {
                    this.verticalSpeed = (Math.random() * 2 - 1) * 3;
                }
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);  // Rysujemy od dołu w górę
    }
} 