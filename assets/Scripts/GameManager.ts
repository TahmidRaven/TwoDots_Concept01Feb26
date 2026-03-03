import { _decorator, Component, Label, Node, CCInteger, AudioSource, Color } from 'cc'; 
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen'; 
import { AudioContent } from './AudioContent'; 
import { AdManager } from '../ScriptsReusable/AdManager';
import { FlipClockLabel } from './FlipClockLabel'; 

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

    // --- RECURRING REDIRECT SETTINGS ---
    @property({ group: { name: 'Auto Redirect', id: '1' } })
    public enableAutoRedirect: boolean = false;

    @property({ 
        type: CCInteger, 
        visible() { return (this as any).enableAutoRedirect; },
        group: { name: 'Auto Redirect', id: '1' },
        tooltip: "Redirect will trigger every time this many moves are spent (e.g., every 6 moves)"
    }) 
    public movesInterval: number = 6;

    @property({ 
        visible() { return (this as any).enableAutoRedirect; },
        group: { name: 'Auto Redirect', id: '1' }
    })
    public iosLink: string = "https://apps.apple.com/us/app/two-dots-connect-the-colors/id880178264";

    @property({ 
        visible() { return (this as any).enableAutoRedirect; },
        group: { name: 'Auto Redirect', id: '1' }
    })
    public androidLink: string = "https://play.google.com/store/apps/details?id=com.weplaydots.twodotsandroid";
    // ----------------------------------

    @property({ tooltip: "If unchecked, TNT and ORBs can be spawned infinitely." })
    public useSpecialItemCap: boolean = false;

    @property(Label) tntCountLabel: Label = null!; 
    @property({ type: CCInteger, visible() { return (this as any).useSpecialItemCap; } }) 
    public totalTntAllowed: number = 30;

    @property(Label) orbCountLabel: Label = null!; 
    @property({ type: CCInteger, visible() { return (this as any).useSpecialItemCap; } }) 
    public totalOrbAllowed: number = 30;

    @property([AudioContent]) public audioList: AudioContent[] = [];

    private _isGameOver: boolean = false;
    private _totalInitialMoves: number = 77; 
    private _currentMoves: number = 77; 
    private _remainingBlockers: number = 66; 
    private _currentTntUsed: number = 0;
    private _currentOrbUsed: number = 0;
    
    private _movesSpentSinceLastRedirect: number = 0;
    private _redirectCooldown: boolean = false;

    public get remainingBlockers(): number {
        return this._remainingBlockers;
    }

    public set remainingBlockers(value: number) {
        this._remainingBlockers = value;
        this.updateUI(); 
    }

    onLoad() {
        GameManager.instance = this;
        this._totalInitialMoves = this._currentMoves; 
        
        if (this.victoryScreen) this.victoryScreen.active = false;

        this.scheduleOnce(() => { AdManager.gameReady(); }, 0.1);

        this.audioList.forEach(content => {
            if (content && content.AudioClip) {
                let source = content.getComponent(AudioSource) || content.addComponent(AudioSource);
                source.clip = content.AudioClip; source.loop = content.Loop; source.volume = content.Volume;
                source.playOnAwake = false; content.AudioSource = source;
                if (content.PlayOnLoad) source.play();
            }
        });
    }

    start() {
        this.updateUI(true); 
        if (this.gridController) this.gridController.initGrid();
        this.playAudio("BGM");
    }

    public playAudio(name: string) {
        const content = this.audioList.find(a => a.AudioName === name);
        if (content && content.AudioSource) content.AudioSource.play();
    }

    public decrementMoves() {
        if (this._isGameOver) return;
        
        this._currentMoves--;

        // LOGIC: Increment spent counter and check against interval
        if (this.enableAutoRedirect && !this._redirectCooldown) {
            this._movesSpentSinceLastRedirect++;

            console.log(`Moves spent since last redirect: ${this._movesSpentSinceLastRedirect} / ${this.movesInterval}`);

            if (this._movesSpentSinceLastRedirect >= this.movesInterval) {
                this._movesSpentSinceLastRedirect = 0; // Reset counter
                this.executeRedirect();
            }
        }

        if (this.movesLabel && this._currentMoves <= 5) this.movesLabel.color = Color.RED;
        this.updateUI();

        if (this._currentMoves <= 0 && this._remainingBlockers > 0) this.showGameOver(false); 
    }

    private executeRedirect() {
        // Prevent multiple redirects firing at the exact same time
        this._redirectCooldown = true;
        this.scheduleOnce(() => { this._redirectCooldown = false; }, 2.0);

        console.log("EXECUTING RECURRING REDIRECT");
        
        AdManager.gameEnd();

        const url = (navigator.userAgent.match(/iPhone|iPad|iPod/i)) ? this.iosLink : this.androidLink;
        window.open(url, "_blank");
    }

    public registerBlockerDestroyed() {
        if (this._isGameOver) return;
        if (this.remainingBlockers > 0) this.remainingBlockers--;
        if (this.remainingBlockers === 0) {
            this.scheduleOnce(() => { this.showGameOver(true); }, 0.1);
        }
    }

    private showGameOver(isWin: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;
        AdManager.gameEnd();
        if (this.victoryScreen) {
            this.victoryScreen.active = true;
            const vsComp = this.victoryScreen.getComponent(VictoryScreen);
            if (vsComp) vsComp.show(isWin);
        }
    }

    public registerPowerupUsed(type: "TNT" | "ORB") {
        if (type === "TNT") this._currentTntUsed++;
        else this._currentOrbUsed++;
        this.updateUI();
    }

    public get canSpawnTNT(): boolean {
        return !this.useSpecialItemCap || this._currentTntUsed < this.totalTntAllowed;
    }

    public get canSpawnOrb(): boolean {
        return !this.useSpecialItemCap || this._currentOrbUsed < this.totalOrbAllowed;
    }

    public updateUI(skipAnimation: boolean = false) {
        if (this.movesLabel) {
            const val = `${this._currentMoves}`;
            if (skipAnimation) this.movesLabel.string = val;
            else (this.movesLabel.getComponent(FlipClockLabel) || this.movesLabel.addComponent(FlipClockLabel)).flipTo(val);
        }

        if (this.blockersLabel) {
            const displayVal = `${Math.max(0, this._remainingBlockers)}`;
            if (skipAnimation) this.blockersLabel.string = displayVal;
            else (this.blockersLabel.getComponent(FlipClockLabel) || this.blockersLabel.addComponent(FlipClockLabel)).flipTo(displayVal);
        }

        if (this.movesTextLabel) this.movesTextLabel.string = this._currentMoves === 1 ? "MOVE" : "MOVES";
        if (this.bricksTextLabel) this.bricksTextLabel.string = this._remainingBlockers === 1 ? "BRICK" : "BRICKS";
        
        if (this.tntCountLabel) this.tntCountLabel.string = this.useSpecialItemCap ? `${this._currentTntUsed}/${this.totalTntAllowed}` : `${this._currentTntUsed}`;
        if (this.orbCountLabel) this.orbCountLabel.string = this.useSpecialItemCap ? `${this._currentOrbUsed}/${this.totalOrbAllowed}` : `${this._currentOrbUsed}`;
    }

    public get isGameOver(): boolean { return this._isGameOver; }
}