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


    public showAtWorld(worldPos: Vec3) {
        if (!this.node.parent) return;
        
        const parentUIT = this.node.parent.getComponent(UITransform);
        if (parentUIT) {
            const localPos = parentUIT.convertToNodeSpaceAR(worldPos);
            this.showAt(localPos);
        }
    }

public showAt(pos: Vec3) {
    // If we are already showing this exact position, don't restart the animation
    if (this._isShowing && this.node.position.equals(pos, 0.1)) return;

    this.node.active = true;
    this._isShowing = true;
    this.node.setPosition(pos);
    
    tween(this.node).stop();
    this.node.setScale(v3(0, 0, 0)); // Start from zero only once

    tween(this.node)
        .to(0.3, { scale: this._baseScale }, { easing: 'backOut' })
        // Smooth, non-jittery pulse
        .repeatForever(
            tween(this.node)
                .to(0.5, { scale: v3(this._baseScale.x * 1.2, this._baseScale.y * 1.2, 1) }, { easing: 'quadInOut' })
                .to(0.5, { scale: this._baseScale }, { easing: 'quadInOut' })
        )
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