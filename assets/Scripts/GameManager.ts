import { _decorator, Component, Label, Node, CCInteger, AudioSource } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen'; 
import { AudioContent } from './AudioContent'; // Import your AudioContent component
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    
    @property(Label) movesLabel: Label = null!; 
    @property(Label) blockersLabel: Label = null!; 

    @property(Label) movesTextLabel: Label = null!; 
    @property(Label) bricksTextLabel: Label = null!; 
    
    @property(Node) victoryScreen: Node = null!;

    @property(Label) tntCountLabel: Label = null!; 
    @property({ type: CCInteger }) totalTntAllowed: number = 30;

    @property(Label) orbCountLabel: Label = null!; 
    @property({ type: CCInteger }) totalOrbAllowed: number = 30;

    // --- AUDIO LIST REFERENCE ---
    @property([AudioContent])
    public audioList: AudioContent[] = [];

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

        // 1. Initialize AudioSources for all nodes in the list
        this.audioList.forEach(content => {
            if (content && content.AudioClip) {
                // Ensure the node has an AudioSource and map it
                let source = content.getComponent(AudioSource);
                if (!source) {
                    source = content.addComponent(AudioSource);
                }
                
                source.clip = content.AudioClip;
                source.loop = content.Loop;
                source.volume = content.Volume;
                source.playOnAwake = false; // We control this manually
                
                content.AudioSource = source;

                if (content.PlayOnLoad) {
                    source.play();
                }
            }
        });
    }

    start() {
        this.updateUI();
        if (this.gridController) {
            this.gridController.initGrid();
        }

        // 2. Play BGM explicitly on start
        this.playAudio("BGM");
    }

    /**
     * Plays audio by searching for the AudioName string in the audioList array
     */
    public playAudio(name: string) {
        const content = this.audioList.find(a => a.AudioName === name);
        if (content && content.AudioSource) {
            content.AudioSource.play();
            
            if (content.OnPlayingStart) {
                content.OnPlayingStart.emit([content]);
            }
        } else {
            console.warn(`[GameManager] Audio name "${name}" not found in audioList.`);
        }
    }

    public stopAudio(name: string) {
        const content = this.audioList.find(a => a.AudioName === name);
        if (content && content.AudioSource) {
            content.AudioSource.stop();
        }
    }

    // ... (rest of your logic for moves and blockers remains the same)

    public decrementMoves() {
        if (this._isGameOver) return;
        this._currentMoves--;
        this.updateUI();

        if (this._currentMoves <= 0 && this._remainingBlockers > 0) {
            this.showGameOver(false); 
        }
    }

    public registerBlockerDestroyed() {
        if (this._isGameOver) return;
        if (this._remainingBlockers > 0) {
            this._remainingBlockers--;
            this.updateUI();
        }

        if (this._remainingBlockers === 0) {
            this.showGameOver(true);
        }
    }

    private showGameOver(isWin: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;

        if (this.victoryScreen) {
            this.victoryScreen.active = true;
            if (this.node.parent) {
                this.victoryScreen.setSiblingIndex(this.victoryScreen.parent.children.length - 1);
            }

            const vsComp = this.victoryScreen.getComponent(VictoryScreen);
            if (vsComp) {
                vsComp.show(isWin); 
            }
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