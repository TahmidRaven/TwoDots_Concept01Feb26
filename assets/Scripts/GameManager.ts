import { _decorator, Component, Label, Node, CCInteger } from 'cc';
import { GridController } from './GridController';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null;

    @property(GridController) gridController: GridController = null;
    @property(Label) movesLabel: Label = null;
    @property(Label) blockersLabel: Label = null;
    
    @property(Node) victoryScreen: Node = null;

    // --- Power-up UI Properties ---
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
        if (this._currentMoves <= 0) {
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

    /**
     * Increments the count and updates UI (Spinning removed)
     */
    public registerPowerupUsed(type: "TNT" | "ORB") {
        if (type === "TNT") this._currentTntUsed++;
        else this._currentOrbUsed++;

        this.updateUI();
    }

    // Getters to check if we can still spawn more
    public get canSpawnTNT(): boolean {
        return this._currentTntUsed < this.totalTntAllowed;
    }

    public get canSpawnOrb(): boolean {
        return this._currentOrbUsed < this.totalOrbAllowed;
    }

    private showVictory() {
        if (this._isGameOver) return;
        this._isGameOver = true;
        if (this.victoryScreen) {
            this.victoryScreen.active = true;
        }
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `${this._currentMoves}`;
        if (this.blockersLabel) this.blockersLabel.string = `${this._remainingBlockers}`;
        
        if (this.tntCountLabel) {
            this.tntCountLabel.string = `${this._currentTntUsed}/${this.totalTntAllowed}`;
        }
        if (this.orbCountLabel) {
            this.orbCountLabel.string = `${this._currentOrbUsed}/${this.totalOrbAllowed}`;
        }
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }
}