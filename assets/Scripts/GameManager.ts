import { _decorator, Component, Label, Node, CCInteger } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen'; 
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null;

    @property(GridController) gridController: GridController = null;
    
    @property(Label) movesLabel: Label = null; 
    @property(Label) blockersLabel: Label = null; 

    @property(Label) movesTextLabel: Label = null; 
    @property(Label) bricksTextLabel: Label = null; 
    
    @property(Node) victoryScreen: Node = null;

    @property(Label) tntCountLabel: Label = null; 
    @property({ type: CCInteger }) totalTntAllowed: number = 15;

    @property(Label) orbCountLabel: Label = null; 
    @property({ type: CCInteger }) totalOrbAllowed: number = 15;

    private _isGameOver: boolean = false;
    private _currentMoves: number = 200; 
    private _remainingBlockers: number = 66; 

    private _currentTntUsed: number = 0;
    private _currentOrbUsed: number = 0;

    onLoad() {
        GameManager.instance = this;
        // Ensure the victory screen is hidden at start
        if (this.victoryScreen) {
            this.victoryScreen.active = false;
        }
    }

    start() {
        this.updateUI();
        if (this.gridController) {
            this.gridController.initGrid();
        }
    }

    public decrementMoves() {
        if (this._isGameOver) return;
        this._currentMoves--;
        this.updateUI();

        // FAIL CONDITION: Out of moves while blockers remain
        if (this._currentMoves <= 0 && this._remainingBlockers > 0) {
            console.log("[GameManager] Triggering Fail Screen");
            this.showGameOver(false); 
        }
    }

    public registerBlockerDestroyed() {
        if (this._isGameOver) return;
        if (this._remainingBlockers > 0) {
            this._remainingBlockers--;
            this.updateUI();
        }

        // WIN CONDITION: All blockers cleared
        if (this._remainingBlockers === 0) {
            console.log("[GameManager] Triggering Win Screen");
            this.showGameOver(true);
        }
    }

private showGameOver(isWin: boolean) {
    if (this._isGameOver) return;
    this._isGameOver = true;

    if (this.victoryScreen) {
        // 1. Force the node active immediately
        this.victoryScreen.active = true;

        // 2. Ensure it is at the very front of the Canvas
        if (this.node.parent) {
            this.victoryScreen.setSiblingIndex(this.victoryScreen.parent.children.length - 1);
        }

        const vsComp = this.victoryScreen.getComponent(VictoryScreen);
        if (vsComp) {
            console.log("[GameManager] Executing VictoryScreen.show()");
            vsComp.show(isWin); 
        } else {
            // Fallback: If component is missing, at least center and scale it
            this.victoryScreen.setPosition(0, 0, 0);
            this.victoryScreen.setScale(1, 1, 1);
        }
    } else {
        console.error("[GameManager] victoryScreen property is not assigned in the Inspector!");
    }
}

    public registerPowerupUsed(type: "TNT" | "ORB") {
        if (type === "TNT") this._currentTntUsed++;
        else this._currentOrbUsed++;
        this.updateUI();
    }

    public get canSpawnTNT(): boolean {
        return this._currentTntUsed < this.totalTntAllowed;
    }

    public get canSpawnOrb(): boolean {
        return this._currentOrbUsed < this.totalOrbAllowed;
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `${this._currentMoves}`;
        if (this.movesTextLabel) this.movesTextLabel.string = this._currentMoves === 1 ? "MOVE" : "MOVES";
        if (this.blockersLabel) this.blockersLabel.string = `${this._remainingBlockers}`;
        if (this.bricksTextLabel) this.bricksTextLabel.string = this._remainingBlockers === 1 ? "BRICK" : "BRICKS";
        if (this.tntCountLabel) this.tntCountLabel.string = `${this._currentTntUsed}/${this.totalTntAllowed}`;
        if (this.orbCountLabel) this.orbCountLabel.string = `${this._currentOrbUsed}/${this.totalOrbAllowed}`;
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }
}