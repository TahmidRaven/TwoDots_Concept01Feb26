import { _decorator, Component, Node, Prefab, instantiate, UITransform, CCInteger, EventTouch, input, Input, v3, Vec3, tween, Color, Animation, isValid, Sprite } from 'cc';
import { GridPiece } from './GridPiece';
import { SpecialItemEffects } from './SpecialItemEffects';
import { GameManager } from './GameManager';
import { GridShuffler } from './GridShuffler';
import { LightningEffect } from './LightningEffect';
import { TutorialHand } from './TutorialHand';
import { TypewriterEffect } from './TypewriterEffect'; 
import { BlockerAnimation } from './BlockerAnimation'; 

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property(Prefab) blockerPrefab: Prefab = null; 
    @property([Prefab]) ballPrefabs: Prefab[] = []; 
    @property(Prefab) tntPrefab: Prefab = null;
    @property(Prefab) orbPrefab: Prefab = null; 
    @property(Prefab) blockDestroyPrefab: Prefab = null;

    @property({ type: CCInteger }) rows: number = 9;
    @property({ type: CCInteger }) cols: number = 9;

    @property(LightningEffect) lightning: LightningEffect = null;
    
    @property(Node) tutorialHandNode: Node = null!; 
    private _tutorialHand: TutorialHand = null!;

    // --- INSTRUCTION BOARD ---
    @property(Node) instructionBoard: Node = null!;
    @property(TypewriterEffect) typewriter: TypewriterEffect = null!;

    private activeRows: number = 5;
    private activeCols: number = 3;
    private grid: (Node | null)[][] = [];
    private actualCellSize: number = 83;
    private isProcessing: boolean = false;
    private initialSpawnQueue: number[] = [];

    private _hasInteracted: boolean = false;
    private _firstTNTShown: boolean = false;
    private _firstOrbShown: boolean = false;
    
    onLoad() {
        input.on(Input.EventType.TOUCH_END, this.onGridTouch, this);
        this.prepareSpawnQueue();

        if (this.tutorialHandNode) {
            this._tutorialHand = this.tutorialHandNode.getComponent(TutorialHand)!;
        }

        if (this.instructionBoard) this.instructionBoard.active = false;
    }

    private prepareSpawnQueue() {
        this.initialSpawnQueue = [...Array(3).fill(0), ...Array(3).fill(1), ...Array(2).fill(2), ...Array(4).fill(0), ...Array(3).fill(1)];
    }

    public initGrid() {
        this.generateBlockerGrid();
        
        if (this.instructionBoard && this.typewriter) {
            const introText = "Destroy 66 Bricks to Win";
            this.instructionBoard.active = true;
            this.typewriter.play(introText); 

            // Timer removed: The board now stays until onGridTouch is triggered.
        }

        this.scheduleOnce(() => { this.refillGrid(true); }, 0.5);
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
                if (r < this.activeRows && c < this.activeCols) {
                    this.grid[r][c] = null;
                } else {
                    const brick = instantiate(this.blockerPrefab);
                    brick.parent = this.node;
                    brick.setPosition(v3((c * this.actualCellSize) - offsetX, offsetY - (r * this.actualCellSize), 0));
                    this.grid[r][c] = brick;

                    let animComp = brick.getComponent(BlockerAnimation) || brick.addComponent(BlockerAnimation);
                    const staggerDelay = (r + c) * 0.04; 
                    animComp.playIntroEffect(1.25, staggerDelay);
                }
            }
        }
    }

    private onGridTouch(event: EventTouch) {
        if (this.isProcessing || (GameManager.instance && GameManager.instance.isGameOver)) return;

        // Hide instruction board on first tap
        if (this.instructionBoard && this.instructionBoard.active) {
            this.instructionBoard.active = false;
        }

        if (this._tutorialHand && this._tutorialHand.node.active) {
            this._hasInteracted = true;
            this._tutorialHand.hide();
        }

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
        if (!targetNode || this.isProcessing) return;

        const piece = targetNode.getComponent(GridPiece);
        if (!piece) return;

        if (piece.prefabName === "TNT") {
            this.isProcessing = true;
            if (GameManager.instance) {
                GameManager.instance.decrementMoves();
                GameManager.instance.registerPowerupUsed("TNT");
            }
            SpecialItemEffects.executeTNT(r, c, this.grid, this.rows, this.cols, this.playEffect.bind(this), () => this.applyGravity(), this.lightning);
            return;
        }

        if (piece.prefabName === "ORB") {
            this.isProcessing = true;
            if (GameManager.instance) {
                GameManager.instance.decrementMoves();
                GameManager.instance.registerPowerupUsed("ORB");
            }
            SpecialItemEffects.executeOrb(r, c, this.grid, this.rows, this.cols, this.playEffect.bind(this), () => this.applyGravity(), this.lightning);
            return;
        }

        this.popConnectedBalls(r, c);
    }

    private popConnectedBalls(r: number, c: number) {
        const targetNode = this.grid[r][c]!;
        const targetPiece = targetNode.getComponent(GridPiece)!;
        const typeToMatch = targetPiece.prefabName;
        const colorToMatch = targetPiece.colorId;
        const matches: Node[] = [];

        const findMatches = (row: number, col: number) => {
            if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
            const node = this.grid[row][col];
            if (!node || matches.indexOf(node) !== -1) return;
            const piece = node.getComponent(GridPiece);
            if (piece && piece.prefabName === typeToMatch && piece.colorId === colorToMatch) {
                matches.push(node);
                findMatches(row + 1, col); findMatches(row - 1, col);
                findMatches(row, col + 1); findMatches(row, col - 1);
            }
        };

        findMatches(r, c);

        if (matches.length >= 2) {
            this.isProcessing = true;
            if (GameManager.instance) {
                GameManager.instance.decrementMoves();
            }

            matches.forEach((node, index) => {
                const p = node.getComponent(GridPiece)!;
                const pos = v3(node.position);
                const colorId = p.colorId;

                this.checkAndDestroyAdjacentBlockers(p.row, p.col);
                this.grid[p.row][p.col] = null;

                tween(node)
                    .to(0.08, { scale: v3(0, 0, 0) })
                    .call(() => {
                        this.playEffect(pos, colorId);
                        node.destroy();
                        if (index === matches.length - 1) {
                            if (matches.length === 3 && GameManager.instance && GameManager.instance.canSpawnTNT) {
                                this.spawnTNTItem(r, c);
                            } else if (matches.length >= 4 && GameManager.instance && GameManager.instance.canSpawnOrb) {
                                this.spawnOrbItem(r, c, colorToMatch);
                            } else {
                                this.applyGravity();
                            }
                        }
                    })
                    .start();
            });
        }
    }

    public playEffect(pos: Vec3, colorId: string) {
        if (!this.blockDestroyPrefab) return;
        const effect = instantiate(this.blockDestroyPrefab);
        effect.parent = this.node;
        effect.setPosition(pos);
    
        if (GameManager.instance) {
            if (colorId === "blocker") {
                GameManager.instance.playAudio("BlockDestroy");
            } else {
                GameManager.instance.playAudio("BallDestroy");
            }
        }

        const colorMap: { [key: string]: string } = {
            "blue": "#3498db", "red": "#e74c3c", "green": "#2ecc71", "yellow": "#f1c40f", "blocker": "#95a5a6"
        };

        const hex = colorMap[colorId] || "#ffffff";
        const sprite = effect.getComponent(Sprite) || effect.getComponentInChildren(Sprite);
        if (sprite) sprite.color = new Color().fromHEX(hex);

        const anim = effect.getComponent(Animation);
        if (anim) {
            anim.play('blockDestoryAnimation2');
            anim.on(Animation.EventType.FINISHED, () => { if (isValid(effect)) effect.destroy(); });
        } else {
            this.scheduleOnce(() => { if (isValid(effect)) effect.destroy(); }, 0.5);
        }
    }

    private checkAndDestroyAdjacentBlockers(r: number, c: number) {
        const directions = [{dr:1,dc:0}, {dr:-1,dc:0}, {dr:0,dc:1}, {dr:0,dc:-1}];
        directions.forEach(dir => {
            const nr = r + dir.dr, nc = c + dir.dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                const neighbor = this.grid[nr][nc];
                if (neighbor && !neighbor.getComponent(GridPiece)) {
                    const pos = v3(neighbor.position);
                    this.grid[nr][nc] = null;
                    if (GameManager.instance) GameManager.instance.registerBlockerDestroyed();
                    
                    tween(neighbor)
                        .to(0.2, { scale: v3(0, 0, 0) })
                        .call(() => {
                            this.playEffect(pos, "blocker");
                            neighbor.destroy();
                        })
                        .start();
                }
            }
        });
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
                            tween(upperNode).to(0.25, { position: v3(upperNode.position.x, targetY, 0) }, { easing: 'quadOut' }).start();
                            longestMove = Math.max(longestMove, 0.25);
                            break; 
                        }
                    }
                }
            }
        }
        this.scheduleOnce(() => { this.refillGrid(false); }, longestMove);
    }

    private refillGrid(isInitial: boolean = false) {
        let spawnCount = 0;
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
                        const delay = spawnCount * 0.05;
                        this.spawnBallAtTop(c, r, delay, isInitial);
                        maxSpawnDelay = Math.max(maxSpawnDelay, delay);
                        spawnCount++;
                    }
                }
            }
        }

        this.scheduleOnce(() => {
            if (!GridShuffler.hasValidMoves(this.grid, this.rows, this.cols)) {
                GridShuffler.shuffle(this.grid, this.rows, this.cols, this.actualCellSize, () => {
                    this.refillGrid(false);
                });
            } else {
                this.isProcessing = false;
                this.checkTutorialTriggers();
            }
        }, maxSpawnDelay + 0.4);
    }

    private checkTutorialTriggers() {
        if (!this._tutorialHand) return;

        const tntWorldPos = this.findItemWorldPos("TNT");
        if (tntWorldPos && !this._firstTNTShown) {
            this._firstTNTShown = true;
            this._tutorialHand.showAtWorld(tntWorldPos);
            return;
        }

        const orbWorldPos = this.findItemWorldPos("ORB");
        if (orbWorldPos && !this._firstOrbShown) {
            this._firstOrbShown = true;
            this._tutorialHand.showAtWorld(orbWorldPos);
            return;
        }

        if (!this._hasInteracted && !this._tutorialHand.isShowing) {
            const hintWorldPos = this.findHintMoveWorldPos();
            if (hintWorldPos) {
                this._tutorialHand.showAtWorld(hintWorldPos);
            }
        }
    }

    private findItemWorldPos(name: string): Vec3 | null {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const node = this.grid[r][c];
                const p = node?.getComponent(GridPiece);
                if (p && p.prefabName === name) {
                    return node!.getComponent(UITransform)!.convertToWorldSpaceAR(v3(0,0,0));
                }
            }
        }
        return null;
    }

    private findHintMoveWorldPos(): Vec3 | null {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const node = this.grid[r][c];
                const p = node?.getComponent(GridPiece);
                if (!p || p.prefabName === "TNT" || p.prefabName === "ORB") continue;

                const directions = [{dr:1, dc:0}, {dr:-1, dc:0}, {dr:0, dc:1}, {dr:0, dc:-1}];
                let hasMatch = false;
                let touchesBlocker = false;

                for (const d of directions) {
                    const nr = r + d.dr, nc = c + d.dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        const neighbor = this.grid[nr][nc];
                        if (!neighbor) continue;
                        const np = neighbor.getComponent(GridPiece);
                        if (np && np.colorId === p.colorId) hasMatch = true;
                        if (!np) touchesBlocker = true; 
                    }
                }
                if (hasMatch && touchesBlocker) {
                    return node!.getComponent(UITransform)!.convertToWorldSpaceAR(v3(0,0,0));
                }
            }
        }
        return null;
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
            piece.row = targetRow; piece.col = c;
            piece.prefabName = this.ballPrefabs[prefabIdx].name;

            const totalW = (this.cols - 1) * this.actualCellSize;
            const totalH = (this.rows - 1) * this.actualCellSize;
            const startX = (c * this.actualCellSize) - (totalW / 2);
            const startY = (totalH / 2) + 150;
            const targetY = (totalH / 2) - (targetRow * this.actualCellSize);

            ball.setPosition(v3(startX, startY, 0));
            this.grid[targetRow][c] = ball;
            tween(ball).to(0.4, { position: v3(startX, targetY, 0) }, { easing: 'bounceOut' }).start();
        }, delay);
    }

    private spawnTNTItem(r: number, c: number) {
        if (!this.tntPrefab) { this.applyGravity(); return; }
        this.createSpecialItem(this.tntPrefab, r, c, "TNT");
    }

    private spawnOrbItem(r: number, c: number, colorId: string = "") {
        if (!this.orbPrefab) { this.applyGravity(); return; }
        this.createSpecialItem(this.orbPrefab, r, c, "ORB", colorId);
    }

    private createSpecialItem(prefab: Prefab, r: number, c: number, name: string, colorId: string = "") {
        const item = instantiate(prefab);
        item.parent = this.node;
        const piece = item.getComponent(GridPiece) || item.addComponent(GridPiece);
        piece.row = r; piece.col = c; piece.prefabName = name; piece.colorId = colorId;
        
        const offsetX = (this.cols - 1) * this.actualCellSize / 2;
        const offsetY = (this.rows - 1) * this.actualCellSize / 2;
        item.setPosition(v3((c * this.actualCellSize) - offsetX, offsetY - (r * this.actualCellSize), 0));
        item.setScale(v3(0, 0, 0));
        this.grid[r][c] = item;
        tween(item).to(0.2, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).call(() => this.applyGravity()).start();
    }
}