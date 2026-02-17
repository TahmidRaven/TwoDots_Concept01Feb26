import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, Size, CCInteger, EventTouch, input, Input } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    
    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;

    private activeRows: number = 5;
    private activeCols: number = 3;

    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 0;
    private isProcessing: boolean = false;

    onLoad() {
        input.on(Input.EventType.TOUCH_END, this.onGridTouch, this);
        const transform = this.getComponent(UITransform);
        if (transform && (transform.contentSize.width === 0 || transform.contentSize.height === 0)) {
            transform.setContentSize(new Size(800, 800));
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_END, this.onGridTouch, this);
    }

    start() {
        this.generateBlockerGrid();
        // Delay slightly to ensure grid is ready
        this.scheduleOnce(() => {
            this.refillGrid(); 
        }, 0.5);
    }

    generateBlockerGrid() {
        if (!this.blockerPrefab) return;

        const tempBrick = instantiate(this.blockerPrefab);
        const transform = tempBrick.getComponent(UITransform);
        this.actualCellSize = transform ? transform.contentSize.width : 83;
        tempBrick.destroy(); 

        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        const offsetX = totalW / 2;
        const offsetY = totalH / 2;

        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const posX = (c * this.actualCellSize) - offsetX;
                const posY = offsetY - (r * this.actualCellSize); 

                // Top-side 5x3 is playable (null), others are blockers
                if (r < this.activeRows && c < this.activeCols) {
                    this.grid[r][c] = null;
                } else {
                    const brick = instantiate(this.blockerPrefab);
                    brick.parent = this.node;
                    brick.setPosition(new Vec3(posX, posY, 0));
                    this.grid[r][c] = brick;
                }
            }
        }
    }

    // Logic: Balls spawn at the top and fall down until they hit something
    spawnBallAtTop(c: number, targetRow: number, delay: number) {
        this.scheduleOnce(() => {
            const randomIdx = Math.floor(Math.random() * this.ballPrefabs.length);
            const ball = instantiate(this.ballPrefabs[randomIdx]);
            ball.parent = this.node;

            const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
            piece.row = targetRow;
            piece.col = c;
            piece.prefabName = this.ballPrefabs[randomIdx].name; 

            const ballTransform = ball.getComponent(UITransform);
            if (ballTransform) ballTransform.setContentSize(new Size(this.actualCellSize, this.actualCellSize));

            // Position at the top of the grid column
            const totalW = (this.cols - 1) * this.actualCellSize;
            const totalH = (this.rows - 1) * this.actualCellSize;
            const startX = (c * this.actualCellSize) - (totalW / 2);
            const startY = (totalH / 2) + 200; // Spawn above the visible grid
            const targetY = (totalH / 2) - (targetRow * this.actualCellSize);

            ball.setPosition(new Vec3(startX, startY, 0));
            this.grid[targetRow][c] = ball;

            // Falling animation
            tween(ball)
                .to(0.5, { position: new Vec3(startX, targetY, 0) }, { easing: 'bounceOut' })
                .start();
        }, delay);
    }

    onGridTouch(event: EventTouch) {
        if (this.isProcessing) return;

        const touchPos = event.getUILocation();
        const uiTransform = this.node.getComponent(UITransform);
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        const c = Math.round((localPos.x + (totalW / 2)) / this.actualCellSize);
        const r = Math.round(((totalH / 2) - localPos.y) / this.actualCellSize);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const node = this.grid[r][c];
            if (node && node.getComponent(GridPiece)) {
                this.popConnectedBalls(r, c);
            }
        }
    }

    popConnectedBalls(r: number, c: number) {
        const targetNode = this.grid[r][c];
        const targetPiece = targetNode?.getComponent(GridPiece);
        if (!targetPiece) return;

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
            
            // Destroy adjacent blockers
            matches.forEach(node => {
                const p = node.getComponent(GridPiece);
                this.checkAndDestroyAdjacentBlockers(p.row, p.col);
            });

            matches.forEach((node, index) => {
                const p = node.getComponent(GridPiece);
                this.grid[p.row][p.col] = null; 
                tween(node)
                    .to(0.1, { scale: new Vec3(0, 0, 0) })
                    .call(() => {
                        node.destroy();
                        if (index === matches.length - 1) {
                            this.scheduleOnce(() => this.applyGravity(), 0.2);
                        }
                    })
                    .start();
            });
        }
    }

    checkAndDestroyAdjacentBlockers(r: number, c: number) {
        const directions = [{dr:1,dc:0}, {dr:-1,dc:0}, {dr:0,dc:1}, {dr:0,dc:-1}];
        directions.forEach(dir => {
            const nr = r + dir.dr, nc = c + dir.dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                const neighbor = this.grid[nr][nc];
                // Only destroy if it is a blocker (no GridPiece)
                if (neighbor && !neighbor.getComponent(GridPiece)) {
                    this.grid[nr][nc] = null; 
                    tween(neighbor).to(0.1, { scale: new Vec3(0, 0, 0) }).call(() => neighbor.destroy()).start();
                }
            }
        });
    }

    applyGravity() {
        let maxDelay = 0;
        for (let c = 0; c < this.cols; c++) {
            let emptySpaces = 0;
            // Scan from bottom to top of column
            for (let r = this.rows - 1; r >= 0; r--) {
                const node = this.grid[r][c];
                if (node === null) {
                    emptySpaces++;
                } else if (node.getComponent(GridPiece)) {
                    // It's a ball
                    if (emptySpaces > 0) {
                        const newRow = r + emptySpaces;
                        this.grid[newRow][c] = node;
                        this.grid[r][c] = null;
                        const p = node.getComponent(GridPiece);
                        p.row = newRow;
                        const targetY = (this.rows - 1) * this.actualCellSize / 2 - (newRow * this.actualCellSize);
                        maxDelay = Math.max(maxDelay, 0.3);
                        tween(node).to(0.3, { position: new Vec3(node.position.x, targetY, 0) }, { easing: 'sineIn' }).start();
                    }
                } else {
                    // It's a blocker! Reset empty spaces; balls above this blocker can only fall UNTIL they hit it
                    emptySpaces = 0;
                }
            }
        }
        this.scheduleOnce(() => this.refillGrid(), maxDelay + 0.1);
    }

    refillGrid() {
        let totalSpawnDelay = 0;
        for (let c = 0; c < this.cols; c++) {
            // Check each column from top to bottom
            for (let r = 0; r < this.rows; r++) {
                // If we hit a blocker, we can't spawn anything below it in this column
                if (this.grid[r][c] && !this.grid[r][c].getComponent(GridPiece)) {
                    break; 
                }
                
                // If it's a null space, spawn a ball to fall into it
                if (this.grid[r][c] === null) {
                    this.spawnBallAtTop(c, r, totalSpawnDelay * 0.1);
                    totalSpawnDelay++;
                }
            }
        }
        this.scheduleOnce(() => { this.isProcessing = false; }, (totalSpawnDelay * 0.1) + 0.6);
    }
}