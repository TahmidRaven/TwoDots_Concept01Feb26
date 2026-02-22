import { _decorator, Component, Label, v3, tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('FlipClockLabel')
export class FlipClockLabel extends Component {
    private _label: Label = null!;
    private _isAnimating: boolean = false;

    onLoad() {
        this._label = this.getComponent(Label)!;
    }


    public flipTo(newValue: string) {
        if (this._isAnimating || this._label.string === newValue) {
            this._label.string = newValue;
            return;
        }

        this._isAnimating = true;

        // yo letts Fold this bitch (Scale Y to 0)
        tween(this.node)
            .to(0.12, { scale: v3(1, 0, 1) }, { easing: 'quadIn' })
            .call(() => {
                this._label.string = newValue;
            })
            // Unfold the next one number (Scale Y back to 1)
            .to(0.12, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .call(() => {
                this._isAnimating = false;
            })
            .start();
    }
}