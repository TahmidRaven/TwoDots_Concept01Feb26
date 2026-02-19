import { _decorator, Component, Label } from 'cc';
import { GridController } from './GridController';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null;

    @property(GridController) gridController: GridController = null;
    @property(Label) movesLabel: Label = null;
    @property(Label) blockersLabel: Label = null;

    private _isGameOver: boolean = false;
    private _currentMoves: number = 200;
    
    // Initialized to 66 as requested (81 cells - 15 balls)
    private _remainingBlockers: number = 66; 

    onLoad() {
        GameManager.instance = this;
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
        
        if (this._currentMoves <= 0) {
            this._isGameOver = true;
            console.log("Game Over - No moves left!");
        }
    }

    /**
     * Counts down from 66 to 0 as blockers are destroyed
     */
    public registerBlockerDestroyed() {
        if (this._remainingBlockers > 0) {
            this._remainingBlockers--;
            this.updateUI();
        }

        if (this._remainingBlockers === 0) {
            console.log("Level Clear! All blockers destroyed.");
        }
    }

    private updateUI() {
        if (this.movesLabel) {
            this.movesLabel.string = `Moves: ${this._currentMoves}`;
        }
        if (this.blockersLabel) {
            this.blockersLabel.string = `Bricks: ${this._remainingBlockers}`;
        }
    }

    public get isProcessing(): boolean {
        return this.gridController ? this.gridController.getProcessingStatus() : false;
    }
}