import { _decorator, Component, Label, Node } from 'cc';
import { GridController } from './GridController';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null;

    @property(GridController) gridController: GridController = null;
    @property(Label) movesLabel: Label = null;
    @property(Label) blockersLabel: Label = null;
    
    // Drag your Victory Node here in the Inspector
    @property(Node) victoryScreen: Node = null;

    private _isGameOver: boolean = false;
    private _currentMoves: number = 200;
    private _remainingBlockers: number = 66; 

    onLoad() {
        GameManager.instance = this;
        if (this.victoryScreen) {
            this.victoryScreen.active = false; //hidden
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
        
        if (this._currentMoves <= 0) {
            // Victory regardless of blocker count
            this.showVictory();
        }
    }

    public registerBlockerDestroyed() {
        if (this._isGameOver) return;

        if (this._remainingBlockers > 0) {
            this._remainingBlockers--;
            this.updateUI();
        }

        if (this._remainingBlockers === 0) {
            this.showVictory();
        }
    }

    private showVictory() {
        if (this._isGameOver) return;
        
        this._isGameOver = true;
        console.log("Game Ended - Showing Victory Screen");

        if (this.victoryScreen) {
            this.victoryScreen.active = true;
            // You can add a scale-in tween here for a better transition
        }
    }

    private updateUI() {
        if (this.movesLabel) {
            this.movesLabel.string = `${this._currentMoves}`;
        }
        if (this.blockersLabel) {
            this.blockersLabel.string = `${this._remainingBlockers}`;
        }
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }
}