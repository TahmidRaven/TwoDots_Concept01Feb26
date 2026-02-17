import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, Size, CCInteger, EventTouch, input, Input } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    
    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;
    @property({ type: CCInteger }) initialSpawnCount: number = 15; 

    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 0;
    private isProcessing: boolean = false; // Prevent tapping during animations

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
        this.scheduleOnce(() => {
            this.spawnInitialBalls(this.initialSpawnCount); 
        }, 1.0);
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
                const brick = instantiate(this.blockerPrefab);
                brick.parent = this.node;
                const posX = (c * this.actualCellSize) - offsetX;
                const posY = offsetY - (r * this.actualCellSize); 
                brick.setPosition(new Vec3(posX, posY, 0));
                this.grid[r][c] = brick;
            }
        }
    }

    spawnInitialBalls(count: number) {
        let spawned = 0;
        const maxColsToFill = 3; 
        const maxRowsToFill = 5; 

        for (let c = 0; c < maxColsToFill; c++) {
            for (let r = 0; r < maxRowsToFill; r++) {
                if (spawned >= count) return;
                const currentBrick = this.grid[r][c];
                if (!currentBrick || r >= this.rows || c >= this.cols) continue;

                const targetPos = currentBrick.position.clone();
                this.spawnBallAt(r, c, targetPos, spawned * 0.05);
                spawned++;
            }
        }
    }

    spawnBallAt(r: number, c: number, targetPos: Vec3, delay: number) {
        this.scheduleOnce(() => {
            const randomIdx = Math.floor(Math.random() * this.ballPrefabs.length);
            const ballPrefab = this.ballPrefabs[randomIdx];
            const ball = instantiate(ballPrefab);
            ball.parent = this.node;

            const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
            piece.row = r;
            piece.col = c;
            piece.prefabName = ballPrefab.name; 

            const ballTransform = ball.getComponent(UITransform);
            if (ballTransform) ballTransform.setContentSize(new Size(this.actualCellSize, this.actualCellSize));

            ball.setPosition(new Vec3(targetPos.x, targetPos.y + 800, 0));
            tween(ball).to(0.4, { position: targetPos }, { easing: 'bounceOut' }).start();
            this.grid[r][c] = ball;
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
            const clickedNode = this.grid[r][c];
            if (clickedNode && clickedNode.getComponent(GridPiece)) {
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
            matches.forEach((node, index) => {
                const p = node.getComponent(GridPiece);
                this.grid[p.row][p.col] = null; 
                tween(node)
                    .to(0.1, { scale: new Vec3(0, 0, 0) })
                    .call(() => {
                        node.destroy();
                        if (index === matches.length - 1) this.applyGravity();
                    })
                    .start();
            });
        }
    }

    applyGravity() {
        let maxDelay = 0;

        for (let c = 0; c < this.cols; c++) {
            let emptySpaces = 0;
            // Scan from bottom to top
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Ball found above an empty space, move it down
                    const ball = this.grid[r][c];
                    const newRow = r + emptySpaces;
                    
                    this.grid[newRow][c] = ball;
                    this.grid[r][c] = null;

                    const piece = ball.getComponent(GridPiece);
                    piece.row = newRow;

                    const targetY = (this.rows - 1) * this.actualCellSize / 2 - (newRow * this.actualCellSize);
                    const delay = 0.05 * emptySpaces;
                    maxDelay = Math.max(maxDelay, delay + 0.3);

                    tween(ball).to(0.3, { position: new Vec3(ball.position.x, targetY, 0) }, { easing: 'sineIn' }).start();
                }
            }
        }

        this.scheduleOnce(() => this.refillGrid(), maxDelay + 0.1);
    }

    refillGrid() {
        let spawnedCount = 0;
        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        const offsetX = totalW / 2;
        const offsetY = totalH / 2;

        for (let c = 0; c < this.cols; c++) {
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    const posX = (c * this.actualCellSize) - offsetX;
                    const posY = offsetY - (r * this.actualCellSize);
                    this.spawnBallAt(r, c, new Vec3(posX, posY, 0), spawnedCount * 0.05);
                    spawnedCount++;
                }
            }
        }

        this.scheduleOnce(() => { this.isProcessing = false; }, spawnedCount * 0.05 + 0.5);
    }
}