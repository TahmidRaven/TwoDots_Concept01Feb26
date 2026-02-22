import { _decorator, Component, Label, v3, tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('FlipClockLabel')
export class FlipClockLabel extends Component {
    private _label: Label = null!;
    private _isAnimating: boolean = false;

    onLoad() {
        this._label = this.getComponent(Label)!;
    }

    /**
     * Animates the label like a flip clock tile.
     */
    public flipTo(newValue: string) {
        // Don't animate if the value is the same or already animating
        if (this._isAnimating || this._label.string === newValue) {
            this._label.string = newValue;
            return;
        }

        this._isAnimating = true;

        // Phase 1: Fold the current number (Scale Y to 0)
        tween(this.node)
            .to(0.12, { scale: v3(1, 0, 1) }, { easing: 'quadIn' })
            .call(() => {
                this._label.string = newValue;
            })
            // Phase 2: Unfold the new number (Scale Y back to 1)
            .to(0.12, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .call(() => {
                this._isAnimating = false;
            })
            .start();
    }
}