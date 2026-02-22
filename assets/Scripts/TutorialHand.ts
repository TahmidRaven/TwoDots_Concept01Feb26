import { _decorator, Component, Node, Vec3, v3, tween, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialHand')
export class TutorialHand extends Component {
    private _baseScale: Vec3 = v3(1, 1, 1);
    private _isShowing: boolean = false;

    onLoad() {
        this._baseScale = this.node.scale.clone();
        this.node.active = false;
        this.node.setScale(v3(0, 0, 0));
    }

    /**
     * Converts World Position to Local Space before showing
     */
    public showAtWorld(worldPos: Vec3) {
        if (!this.node.parent) return;
        
        // Get the parent's UITransform to convert the world coordinate into local space
        const parentUIT = this.node.parent.getComponent(UITransform);
        if (parentUIT) {
            const localPos = parentUIT.convertToNodeSpaceAR(worldPos);
            this.showAt(localPos);
        }
    }

    public showAt(pos: Vec3) {
        this.node.active = true;
        this._isShowing = true;
        this.node.setPosition(pos);
        
        tween(this.node).stop();

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

    public get isShowing(): boolean {
        return this._isShowing;
    }
}