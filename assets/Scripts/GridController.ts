import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, Size, CCInteger, EventTouch } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    
    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;
    @property({ type: CCInteger }) initialSpawnCount: number = 15; // Set to 10-15 in Inspector

    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 0;

    start() {
        this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this);
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
        
        // Define the bounds for your 3x5 starting area
        const maxColsToFill = 3; // Columns 0, 1, 2
        const maxRowsToFill = 5; // Rows 0, 1, 2, 3, 4

        // Iterate through the specific sub-grid defined above
        for (let c = 0; c < maxColsToFill; c++) {
            for (let r = 0; r < maxRowsToFill; r++) {
                if (spawned >= count) return;

                const currentBrick = this.grid[r][c];
                // Safety check: ensure we aren't trying to access outside the actual grid array
                if (!currentBrick || r >= this.rows || c >= this.cols) continue;

                const targetPos = currentBrick.position.clone();
                const delay = spawned * 0.08;

                this.scheduleOnce(() => {
                    if (currentBrick && currentBrick.isValid) currentBrick.destroy();

                    const randomIdx = Math.floor(Math.random() * this.ballPrefabs.length);
                    const ballPrefab = this.ballPrefabs[randomIdx];
                    const ball = instantiate(ballPrefab);
                    ball.parent = this.node;

                    const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
                    piece.row = r;
                    piece.col = c;
                    piece.prefabName = ballPrefab.name; 

                    const ballTransform = ball.getComponent(UITransform);
                    if (ballTransform) {
                        ballTransform.setContentSize(new Size(this.actualCellSize, this.actualCellSize));
                    }

                    // Drop effect from above
                    ball.setPosition(new Vec3(targetPos.x, targetPos.y + 600, 0));
                    tween(ball)
                        .to(0.4, { position: targetPos }, { easing: 'bounceOut' })
                        .start();

                    this.grid[r][c] = ball;
                }, delay);

                spawned++;
            }
        }
    }

    onGridTouch(event: EventTouch) {
        const touchPos = event.getUILocation();
        const uiTransform = this.node.getComponent(UITransform);
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        
        const c = Math.round((localPos.x + (totalW / 2)) / this.actualCellSize);
        const r = Math.round(((totalH / 2) - localPos.y) / this.actualCellSize);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const clickedNode = this.grid[r][c];
            // Check if it's a ball (has GridPiece) and not a blocker
            if (clickedNode && clickedNode.getComponent(GridPiece)) {
                this.popConnectedBalls(r, c);
            }
        }
    }

    popConnectedBalls(r: number, c: number) {
        const targetNode = this.grid[r][c];
        if (!targetNode) return;
        
        const targetPiece = targetNode.getComponent(GridPiece);
        const typeToMatch = targetPiece.prefabName; // Matching by Prefab Type
        const matches: Node[] = [];
        
        const findMatches = (row: number, col: number) => {
            if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
            const node = this.grid[row][col];
            
            if (!node || matches.indexOf(node) !== -1) return;
            
            const piece = node.getComponent(GridPiece);
            // Verify it's the same prefab type
            if (piece && piece.prefabName === typeToMatch) {
                matches.push(node);
                findMatches(row + 1, col);
                findMatches(row - 1, col);
                findMatches(row, col + 1);
                findMatches(row, col - 1);
            }
        };

        findMatches(r, c);

        if (matches.length >= 2) {
            matches.forEach(node => {
                const p = node.getComponent(GridPiece);
                this.grid[p.row][p.col] = null; 
                
                tween(node)
                    .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
                    .to(0.1, { scale: new Vec3(0, 0, 0) })
                    .call(() => node.destroy())
                    .start();
            });
        }
    }
}