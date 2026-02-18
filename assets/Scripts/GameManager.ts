import { _decorator, Component, Node } from 'cc';
import { GridController } from './GridController';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(GridController) gridController: GridController = null;

    private _isGameOver: boolean = false;
    private _currentMoves: number = 20;

    start() {
        if (this.gridController) {
            this.gridController.initGrid();
        }
    }

    public decrementMoves() {
        this._currentMoves--;
        if (this._currentMoves <= 0) {
            this._isGameOver = true;
            console.log("Game Over - No moves left!");
        }
    }

    public get isProcessing(): boolean {
        return this.gridController ? this.gridController.getProcessingStatus() : false;
    }
}