import { _decorator, Component, Label, Node, CCInteger, AudioSource } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen'; 
import { AudioContent } from './AudioContent'; 
import { AdManager } from '../ScriptsReusable/AdManager';
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

    // --- NEW CAP TOGGLE ---
    @property({ tooltip: "If unchecked, TNT and ORBs can be spawned infinitely." })
    public useSpecialItemCap: boolean = false;

    @property(Label) tntCountLabel: Label = null!; 
    @property({ 
        type: CCInteger,
        // Only shows this field in the Inspector if useSpecialItemCap is true
        visible() { return (this as any).useSpecialItemCap; } 
    }) 
    public totalTntAllowed: number = 30;

    @property(Label) orbCountLabel: Label = null!; 
    @property({ 
        type: CCInteger,
        // Only shows this field in the Inspector if useSpecialItemCap is true
        visible() { return (this as any).useSpecialItemCap; } 
    }) 
    public totalOrbAllowed: number = 30;

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

        this.audioList.forEach(content => {
            if (content && content.AudioClip) {
                let source = content.getComponent(AudioSource);
                if (!source) {
                    source = content.addComponent(AudioSource);
                }
                
                source.clip = content.AudioClip;
                source.loop = content.Loop;
                source.volume = content.Volume;
                source.playOnAwake = false; 
                
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

        this.playAudio("BGM");
        AdManager.gameReady();
    }

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

        AdManager.gameEnd();

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

    /**
     * Updated logic: returns true if cap is disabled OR if we are under the limit.
     */
    public get canSpawnTNT(): boolean {
        if (!this.useSpecialItemCap) return true;
        return this._currentTntUsed < this.totalTntAllowed;
    }

    /**
     * Updated logic: returns true if cap is disabled OR if we are under the limit.
     */
    public get canSpawnOrb(): boolean {
        if (!this.useSpecialItemCap) return true;
        return this._currentOrbUsed < this.totalOrbAllowed;
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `${this._currentMoves}`;
        if (this.movesTextLabel) this.movesTextLabel.string = this._currentMoves === 1 ? "MOVE" : "MOVES";
        if (this.blockersLabel) this.blockersLabel.string = `${this._remainingBlockers}`;
        if (this.bricksTextLabel) this.bricksTextLabel.string = this._remainingBlockers === 1 ? "BRICK" : "BRICKS";
        
        // Show "Current/Max" if capped, otherwise just show "Current"
        if (this.tntCountLabel) {
            this.tntCountLabel.string = this.useSpecialItemCap 
                ? `${this._currentTntUsed}/${this.totalTntAllowed}` 
                : `${this._currentTntUsed}`;
        }
        
        if (this.orbCountLabel) {
            this.orbCountLabel.string = this.useSpecialItemCap 
                ? `${this._currentOrbUsed}/${this.totalOrbAllowed}` 
                : `${this._currentOrbUsed}`;
        }
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }
}