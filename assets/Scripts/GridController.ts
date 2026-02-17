import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, Size, CCInteger, EventTouch, input, Input, v3, Animation } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    @property(Prefab) tntPrefab: Prefab = null;
    
    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;

    private activeRows: number = 5;
    private activeCols: number = 3;
    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 0;
    private isProcessing: boolean = false;

    onLoad() {
        input.on(Input.EventType.TOUCH_END, this.onGridTouch, this);
    }

    start() {
        this.generateBlockerGrid();
        this.scheduleOnce(() => { this.refillGrid(true); }, 0.8);
    }

    generateBlockerGrid() {
        if (!this.blockerPrefab) return;
        const temp = instantiate(this.blockerPrefab);
        this.actualCellSize = temp.getComponent(UITransform)?.contentSize.width || 83;
        temp.destroy(); 

        const offsetX = (this.cols - 1) * this.actualCellSize / 2;
        const offsetY = (this.rows - 1) * this.actualCellSize / 2;

        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const posX = (c * this.actualCellSize) - offsetX;
                const posY = offsetY - (r * this.actualCellSize); 
                if (r < this.activeRows && c < this.activeCols) {
                    this.grid[r][c] = null;
                } else {
                    const brick = instantiate(this.blockerPrefab);
                    brick.parent = this.node;
                    brick.setPosition(v3(posX, posY, 0));
                    this.grid[r][c] = brick;
                }
            }
        }
    }

    // --- STEP 1: POP MATCH ---
    popConnectedBalls(r: number, c: number) {
        const targetNode = this.grid[r][c];
        const targetPiece = targetNode?.getComponent(GridPiece);
        if (!targetPiece || this.isProcessing) return;

        const typeToMatch = targetPiece.prefabName; 
        const matches: Node[] = [];

        const findMatches = (row: number, col: number) => {
            if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
            const node = this.grid[row][col];
            if (!node || matches.indexOf(node) !== -1) return;
            const piece = node.getComponent(GridPiece);
            if (piece && piece.prefabName === typeToMatch) {
                matches.push(node);
                findMatches(row + 1, col); findMatches(row - 1, col);
                findMatches(row, col + 1); findMatches(row, col - 1);
            }
        };

        findMatches(r, c);

        if (matches.length >= 2) {
            this.isProcessing = true;

            // Calculate center for TNT before destroying balls
            let avgR = 0, avgC = 0;
            matches.forEach(n => { const p = n.getComponent(GridPiece); avgR += p.row; avgC += p.col; });
            const midR = Math.round(avgR / matches.length);
            const midC = Math.round(avgC / matches.length);

            matches.forEach((node, index) => {
                const p = node.getComponent(GridPiece);
                this.checkAndDestroyAdjacentBlockers(p.row, p.col);
                this.grid[p.row][p.col] = null;

                tween(node)
                    .to(0.1, { scale: v3(0.8, 0.8, 1) }) // Anticipation
                    .to(0.15, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                    .call(() => {
                        node.destroy();
                        // Proceed to next step only after last ball pops
                        if (index === matches.length - 1) {
                            if (matches.length >= 3) {
                                this.scheduleOnce(() => this.triggerTNT(midR, midC), 0.1);
                            } else {
                                this.scheduleOnce(() => this.applyGravity(), 0.1);
                            }
                        }
                    })
                    .start();
            });
        }
    }

    // --- STEP 2: TNT (IF APPLICABLE) ---
    triggerTNT(r: number, c: number) {
        if (!this.tntPrefab) { this.applyGravity(); return; }

        const tnt = instantiate(this.tntPrefab);
        tnt.parent = this.node;
        const offsetX = (this.cols - 1) * this.actualCellSize / 2;
        const offsetY = (this.rows - 1) * this.actualCellSize / 2;
        tnt.setPosition(v3((c * this.actualCellSize) - offsetX, offsetY - (r * this.actualCellSize), 0));

        const anim = tnt.getComponent(Animation);
        if (anim) anim.play();

        // Wait for sizzle animation, then explode
        this.scheduleOnce(() => {
            for (let dr = -2; dr <= 1; dr++) {
                for (let dc = -2; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        const target = this.grid[nr][nr] ? this.grid[nr][nc] : null; 
                        if (target) {
                            this.grid[nr][nc] = null;
                            tween(target).to(0.1, { scale: v3(0, 0, 0) }).call(() => target.destroy()).start();
                        }
                    }
                }
            }
            // Briefly show explosion effect, then move to gravity
            this.scheduleOnce(() => {
                tnt.destroy();
                this.applyGravity();
            }, 0.3);
        }, 0.5); 
    }

    // --- STEP 3: GRAVITY (BALLS FALL) ---
    applyGravity() {
        let longestMove = 0;
        for (let c = 0; c < this.cols; c++) {
            let emptySpaces = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                const node = this.grid[r][c];
                if (node === null) emptySpaces++;
                else if (node.getComponent(GridPiece)) {
                    if (emptySpaces > 0) {
                        const newRow = r + emptySpaces;
                        this.grid[newRow][c] = node;
                        this.grid[r][c] = null;
                        const p = node.getComponent(GridPiece);
                        p.row = newRow;
                        const targetY = (this.rows - 1) * this.actualCellSize / 2 - (newRow * this.actualCellSize);
                        const duration = 0.35;
                        tween(node).to(duration, { position: v3(node.position.x, targetY, 0) }, { easing: 'sineIn' }).start();
                        longestMove = Math.max(longestMove, duration);
                    }
                } else emptySpaces = 0;
            }
        }
        // Wait for all balls to finish falling before refilling
        this.scheduleOnce(() => this.refillGrid(false), longestMove + 0.1);
    }

    // --- STEP 4: REFILL (NEW BALLS DROP) ---
    refillGrid(isInitial: boolean = false) {
        let count = 0;
        const interval = isInitial ? 0.12 : 0.08;
        let maxSpawnDelay = 0;

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] && !this.grid[r][c].getComponent(GridPiece)) break; 
                if (this.grid[r][c] === null) {
                    const delay = count * interval;
                    this.spawnBallAtTop(c, r, delay, isInitial);
                    maxSpawnDelay = Math.max(maxSpawnDelay, delay);
                    count++;
                }
            }
        }
        // Finally unlock the grid once the last ball has landed
        this.scheduleOnce(() => { this.isProcessing = false; }, maxSpawnDelay + 0.8);
    }

    spawnBallAtTop(c: number, targetRow: number, delay: number, isInitial: boolean) {
        this.scheduleOnce(() => {
            const randomIdx = Math.floor(Math.random() * this.ballPrefabs.length);
            const ball = instantiate(this.ballPrefabs[randomIdx]);
            ball.parent = this.node;
            const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
            piece.row = targetRow; piece.col = c;
            piece.prefabName = this.ballPrefabs[randomIdx].name; 

            const totalW = (this.cols - 1) * this.actualCellSize;
            const totalH = (this.rows - 1) * this.actualCellSize;
            const startX = (c * this.actualCellSize) - (totalW / 2);
            const startY = (totalH / 2) + (isInitial ? 600 : 300); 
            const targetY = (totalH / 2) - (targetRow * this.actualCellSize);

            ball.setPosition(v3(startX, startY, 0));
            this.grid[targetRow][c] = ball;
            tween(ball).to(isInitial ? 0.7 : 0.5, { position: v3(startX, targetY, 0) }, { easing: 'bounceOut' }).start();
        }, delay);
    }

    // Helpers
    checkAndDestroyAdjacentBlockers(r: number, c: number) {
        const directions = [{dr:1,dc:0}, {dr:-1,dc:0}, {dr:0,dc:1}, {dr:0,dc:-1}];
        directions.forEach(dir => {
            const nr = r + dir.dr, nc = c + dir.dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                const neighbor = this.grid[nr][nc];
                if (neighbor && !neighbor.getComponent(GridPiece)) {
                    this.grid[nr][nc] = null;
                    tween(neighbor).to(0.2, { scale: v3(0, 0, 0) }).call(() => neighbor.destroy()).start();
                }
            }
        });
    }

    onGridTouch(event: EventTouch) {
        if (this.isProcessing) return;
        const uiTransform = this.node.getComponent(UITransform);
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        const totalW = (this.cols - 1) * this.actualCellSize, totalH = (this.rows - 1) * this.actualCellSize;
        const c = Math.round((localPos.x + (totalW / 2)) / this.actualCellSize);
        const r = Math.round(((totalH / 2) - localPos.y) / this.actualCellSize);
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) this.popConnectedBalls(r, c);
    }
}