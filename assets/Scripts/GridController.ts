import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform, Size, CCInteger, EventTouch } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    
    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;

    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 0;

    start() {
        // Listen for clicks on the grid node
        this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this);
        this.generateBlockerGrid();
        
        this.scheduleOnce(() => {
            this.fillSpecificColumns(3); 
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

    fillSpecificColumns(colLimit: number) {
        let spawnIndex = 0;
        for (let c = 0; c < colLimit; c++) {
            for (let r = 0; r < this.rows; r++) {
                const currentBrick = this.grid[r][c];
                if (!currentBrick) continue;

                const targetPos = currentBrick.position.clone();
                const delay = spawnIndex * 0.08;

                this.scheduleOnce(() => {
                    if (currentBrick && currentBrick.isValid) currentBrick.destroy();

                    const randomIdx = Math.floor(Math.random() * this.ballPrefabs.length);
                    const ball = instantiate(this.ballPrefabs[randomIdx]);
                    ball.parent = this.node;

                    const piece = ball.getComponent(GridPiece) || ball.addComponent(GridPiece);
                    piece.row = r;
                    piece.col = c;

                    const ballTransform = ball.getComponent(UITransform);
                    if (ballTransform) ballTransform.setContentSize(new Size(this.actualCellSize, this.actualCellSize));

                    ball.setPosition(new Vec3(targetPos.x, targetPos.y + 600, 0));
                    tween(ball).to(0.4, { position: targetPos }, { easing: 'bounceOut' }).start();

                    this.grid[r][c] = ball;
                }, delay);

                spawnIndex++;
            }
        }
    }

    onGridTouch(event: EventTouch) {
        const touchPos = event.getUILocation();
        const uiTransform = this.node.getComponent(UITransform);
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        const totalW = (this.cols - 1) * this.actualCellSize;
        const totalH = (this.rows - 1) * this.actualCellSize;
        
        // Calculate which row and col was clicked
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
        if (!targetNode) return;
        
        const targetPiece = targetNode.getComponent(GridPiece);
        const colorToMatch = targetPiece.colorId;
        const matches: Node[] = [];
        
        const findMatches = (row: number, col: number) => {
            if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
            const node = this.grid[row][col];
            
            // indexOf check for compatibility instead of .includes()
            if (!node || matches.indexOf(node) !== -1) return;
            
            const piece = node.getComponent(GridPiece);
            if (piece && piece.colorId === colorToMatch) {
                matches.push(node);
                // Recursively check neighbors
                findMatches(row + 1, col);
                findMatches(row - 1, col);
                findMatches(row, col + 1);
                findMatches(row, col - 1);
            }
        };

        findMatches(r, c);

        // Only pop if at least 2 are connected (Match-2 style like Toon Blast)
        if (matches.length >= 2) {
            matches.forEach(node => {
                const p = node.getComponent(GridPiece);
                this.grid[p.row][p.col] = null; // Remove from logical grid
                
                tween(node)
                    .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
                    .to(0.1, { scale: new Vec3(0, 0, 0) })
                    .call(() => node.destroy())
                    .start();
            });
        }
    }
}