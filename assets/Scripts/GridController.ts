import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, CCInteger, EventTouch, input, Input, v3, Animation } from 'cc';
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
    private actualCellSize: number = 83;
    private isProcessing: boolean = false;

    private initialSpawnQueue: number[] = [];

    onLoad() {
        input.on(Input.EventType.TOUCH_END, this.onGridTouch, this);
        this.prepareSpawnQueue();
    }

    private prepareSpawnQueue() {
        const pattern = [
            ...Array(3).fill(0), 
            ...Array(3).fill(1), 
            ...Array(2).fill(2), 
            ...Array(4).fill(0), 
            ...Array(3).fill(1)  
        ];
        this.initialSpawnQueue = pattern;
    }

    public initGrid() {
        this.generateBlockerGrid();
        this.scheduleOnce(() => { this.refillGrid(true); }, 0.8);
    }

    public getProcessingStatus(): boolean {
        return this.isProcessing;
    }

    private generateBlockerGrid() {
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

    private onGridTouch(event: EventTouch) {
        if (this.isProcessing) return;
        const uiTransform = this.node.getComponent(UITransform);
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        
        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        
        const c = Math.round((localPos.x + (totalW / 2)) / this.actualCellSize);
        const r = Math.round(((totalH / 2) - localPos.y) / this.actualCellSize);
        
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.handleCellTap(r, c);
        }
    }

    private handleCellTap(r: number, c: number) {
        const targetNode = this.grid[r][c];
        if (!targetNode) return;

        const piece = targetNode.getComponent(GridPiece);
        if (!piece) return;

        if (piece.prefabName === "TNT") {
            this.isProcessing = true;
            this.triggerTNT(r, c);
            return;
        }

        this.popConnectedBalls(r, c);
    }

    private popConnectedBalls(r: number, c: number) {
        const targetNode = this.grid[r][c]!;
        const targetPiece = targetNode.getComponent(GridPiece)!;
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
            matches.forEach((node, index) => {
                const p = node.getComponent(GridPiece)!;
                this.checkAndDestroyAdjacentBlockers(p.row, p.col);
                this.grid[p.row][p.col] = null;

                tween(node)
                    .to(0.1, { scale: v3(0, 0, 0) })
                    .call(() => {
                        node.destroy();
                        if (index === matches.length - 1) {
                            if (matches.length >= 3) {
                                this.spawnTNTItem(r, c);
                            } else {
                                this.applyGravity();
                            }
                        }
                    })
                    .start();
            });
        }
    }

    private triggerTNT(r: number, c: number) {
        const tntNode = this.grid[r][c];
        if (!tntNode) return;

        const anim = tntNode.getComponent(Animation);
        if (anim) {
            anim.play();
        }
        
        // Execute the explosion logic immediately so visuals sync up
        this.executeExplosion(r, c, tntNode);
    }

    private executeExplosion(r: number, c: number, tntNode: Node) {
        // 1. Immediately remove TNT from grid logic so gravity knows the space is reserved
        this.grid[r][c] = null;

        // 2. Delay the "Blast" logic by 0.35 seconds
        this.scheduleOnce(() => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    
                    // Skip the TNT node itself so the animation remains visible
                    if (nr === r && nc === c) continue;

                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        const target = this.grid[nr][nc];
                        if (target) {
                            this.grid[nr][nc] = null;
                            // Pop the surrounding pieces
                            tween(target)
                                .to(0.1, { scale: v3(0, 0, 0) }, { easing: 'sineIn' })
                                .call(() => { if(target.isValid) target.destroy(); })
                                .start();
                        }
                    }
                }
            }
        }, 0.45); // The 0.35s delay to match the explosion animation timing

        // 3. Destroy the TNT node after its full 1.35s animation finishes
        this.scheduleOnce(() => {
            if (tntNode && tntNode.isValid) {
                tween(tntNode)
                    .to(0.1, { scale: v3(0, 0, 0) })
                    .call(() => tntNode.destroy())
                    .start();
            }
        }, 1.35);

        // 4. Trigger gravity after the full animation is done
        this.scheduleOnce(() => {
            this.applyGravity();
        }, 1.4); 
    }

    private applyGravity() {
        let longestMove = 0;
        for (let c = 0; c < this.cols; c++) {
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    for (let k = r - 1; k >= 0; k--) {
                        const upperNode = this.grid[k][c];
                        if (upperNode) {
                            const p = upperNode.getComponent(GridPiece);
                            if (!p) break; 
                            
                            this.grid[r][c] = upperNode;
                            this.grid[k][c] = null;
                            p.row = r;
                            const targetY = (this.rows - 1) * this.actualCellSize / 2 - (r * this.actualCellSize);
                            const duration = 0.3;
                            tween(upperNode).to(duration, { position: v3(upperNode.position.x, targetY, 0) }, { easing: 'sineIn' }).start();
                            longestMove = Math.max(longestMove, duration);
                            break; 
                        }
                    }
                }
            }
        }
        this.scheduleOnce(() => {
            this.refillGrid(false);
        }, longestMove + 0.05);
    }

    private refillGrid(isInitial: boolean = false) {
        let spawnCount = 0;
        const interval = 0.08;
        let maxSpawnDelay = 0;

        for (let c = 0; c < this.cols; c++) {
            if (this.grid[0][c] !== null && !this.grid[0][c].getComponent(GridPiece)) continue;

            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    let blockedFromAbove = false;
                    for (let k = r - 1; k >= 0; k--) {
                        if (this.grid[k][c] !== null && !this.grid[k][c].getComponent(GridPiece)) {
                            blockedFromAbove = true;
                            break;
                        }
                    }

                    if (!blockedFromAbove) {
                        const delay = spawnCount * interval;
                        this.spawnBallAtTop(c, r, delay, isInitial);
                        maxSpawnDelay = Math.max(maxSpawnDelay, delay);
                        spawnCount++;
                    }
                }
            }
        }
        this.scheduleOnce(() => { this.isProcessing = false; }, maxSpawnDelay + 0.6);
    }

    private spawnBallAtTop(c: number, targetRow: number, delay: number, isInitial: boolean) {
        this.scheduleOnce(() => {
            let prefabIdx: number;

            if (isInitial && this.initialSpawnQueue.length > 0) {
                prefabIdx = this.initialSpawnQueue.shift()!;
                if (prefabIdx >= this.ballPrefabs.length) prefabIdx = 0;
            } else {
                prefabIdx = Math.floor(Math.random() * this.ballPrefabs.length);
            }

            const ball = instantiate(this.ballPrefabs[prefabIdx]);
            ball.parent = this.node;
            const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
            piece.row = targetRow; 
            piece.col = c;
            piece.prefabName = this.ballPrefabs[prefabIdx].name;

            const totalW = (this.cols - 1) * this.actualCellSize;
            const totalH = (this.rows - 1) * this.actualCellSize;
            const startX = (c * this.actualCellSize) - (totalW / 2);
            const startY = (totalH / 2) + 200;
            const targetY = (totalH / 2) - (targetRow * this.actualCellSize);

            ball.setPosition(v3(startX, startY, 0));
            this.grid[targetRow][c] = ball;
            
            tween(ball).to(0.5, { position: v3(startX, targetY, 0) }, { easing: 'bounceOut' }).start();
        }, delay);
    }

    private spawnTNTItem(r: number, c: number) {
        if (!this.tntPrefab) { this.applyGravity(); return; }
        const tnt = instantiate(this.tntPrefab);
        tnt.parent = this.node;
        const piece = tnt.getComponent(GridPiece) || tnt.addComponent(GridPiece);
        piece.row = r; piece.col = c; piece.prefabName = "TNT";
        const offsetX = (this.cols - 1) * this.actualCellSize / 2;
        const offsetY = (this.rows - 1) * this.actualCellSize / 2;
        tnt.setPosition(v3((c * this.actualCellSize) - offsetX, offsetY - (r * this.actualCellSize), 0));
        tnt.setScale(v3(0, 0, 0));
        this.grid[r][c] = tnt;
        tween(tnt).to(0.2, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).call(() => this.applyGravity()).start();
    }

    private checkAndDestroyAdjacentBlockers(r: number, c: number) {
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
}