import { _decorator, Component, Vec3 } from 'cc';
import { GridController } from './GridController';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('HintController')
export class HintController extends Component {
    @property(GridController) 
    public gridController: GridController = null!;

    @property(TutorialHand) 
    public tutorialHand: TutorialHand = null!;

    @property({ tooltip: "Seconds of inactivity before showing a hint" })
    public idleThreshold: number = 5.0;

    private _idleTimer: number = 0;
    private _hintActive: boolean = false;

    update(dt: number) {
        // Don't count idle time if the grid is moving or a hint is already visible
        if (this.gridController.getIsProcessing() || this._hintActive) {
            return;
        }

        this._idleTimer += dt;

        if (this._idleTimer >= this.idleThreshold) {
            this.showHint();
        }
    }

    /**
     * Resets the timer and hides the current hint.
     * Called by GridController on user interaction.
     */
    public resetIdleTimer() {
        this._idleTimer = 0;
        if (this._hintActive) {
            this.tutorialHand.hide();
            this._hintActive = false;
        }
    }

    private showHint() {
        const hintPos = this.gridController.findBestHintWorldPos();
        if (hintPos) {
            this._hintActive = true;
            this.tutorialHand.showAtWorld(hintPos);
        } else {
            // Reset timer to try again if no moves found (though shuffler usually catches this)
            this._idleTimer = 0;
        }
    }
}