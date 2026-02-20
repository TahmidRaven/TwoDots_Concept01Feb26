import { _decorator, Component, Node, Vec3, v3, tween, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialHand')
export class TutorialHand extends Component {
    private _baseScale: Vec3 = v3(1, 1, 1);
    private _isShowing: boolean = false;

    onLoad() {
        // Capture the scale you set in the Editor to use as the maximum "tap" size
        this._baseScale.set(this.node.scale);
        this.node.setScale(v3(0, 0, 0));
        this.node.active = false;
    }

    /**
     * Shows the hand at a specific local position and starts the tap loop
     */
    public showAt(pos: Vec3) {
        this.node.active = true;
        this._isShowing = true;
        this.node.setPosition(pos);
        
        // Kill any existing tweens to prevent overlapping
        tween(this.node).stop();

        // 1.25s total loop: Scale up and down to simulate a tap
        tween(this.node)
            .to(0, { scale: v3(0, 0, 0) })
            .to(0.4, { scale: this._baseScale }, { easing: 'backOut' })
            .delay(0.45)
            .to(0.4, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
            .union()
            .repeatForever()
            .start();
    }

    public hide() {
        this._isShowing = false;
        tween(this.node).stop();
        this.node.setScale(v3(0, 0, 0));
        this.node.active = false;
    }

    public get isShowing() : boolean {
        return this._isShowing;
    }
}