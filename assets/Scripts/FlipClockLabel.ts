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
        if (this._label.string === newValue) return;

        // Reset if already animating to handle rapid-fire updates
        if (this._isAnimating) {
            tween(this.node).stop();
            this.node.setScale(v3(1, 1, 1));
            this._isAnimating = false;
        }

        this._isAnimating = true;

        tween(this.node)
            .to(0.1, { scale: v3(1, 0, 1) }, { easing: 'quadIn' })
            .call(() => {
                this._label.string = newValue;
            })
            .to(0.1, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .call(() => {
                this._isAnimating = false;
            })
            .start();
    }
}