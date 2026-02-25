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
        // If the value is already set, don't do anything
        if (this._label.string === newValue) return;

        // If currently animating, update the string immediately to keep data accurate
        if (this._isAnimating) {
            this._label.string = newValue;
            return;
        }

        this._isAnimating = true;

        tween(this.node)
            .to(0.12, { scale: v3(1, 0, 1) }, { easing: 'quadIn' })
            .call(() => {
                this._label.string = newValue;
            })
            .to(0.12, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .call(() => {
                this._isAnimating = false;
            })
            .start();
    }
}