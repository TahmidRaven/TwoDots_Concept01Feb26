import { _decorator, Component, Sprite, Color, v3, Vec3, tween, Tween, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('BlockerAnimation')
export class BlockerAnimation extends Component {
    private _baseScale: Vec3 = v3(0.9, 0.9, 1);
    private _idleTween: Tween<Node> | null = null;
    private _isShaking: boolean = false;

    /**
     * Entry point called by GridController.
     */
    public playIntroEffect(duration: number = 1.25, delay: number = 0) {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        // Capture the scale set by the GridController as the absolute maximum (100%)
        const currentScale = this.node.scale.x; 
        this._baseScale = v3(currentScale, currentScale, 1); 
        const popScale = v3(currentScale * 1.05, currentScale * 1.05, 1);

        const originalColor = sprite.color.clone();
        const blueGlow = new Color(130, 202, 255, 255);

        this.node.setScale(v3(0, 0, 0));

        tween(sprite)
            .delay(delay)
            .to(0.3, { color: originalColor })
            // .to(0.3, { color: blueGlow })
            .delay(duration - 0.6)
            .to(0.3, { color: blueGlow })
            // .to(0.3, { color: originalColor })
            .start();

        tween(this.node as Node)
            .delay(delay)
            .to(0.2, { scale: popScale }, { easing: 'backOut' })
            .to(0.1, { scale: this._baseScale }, { easing: 'sineIn' })
            .call(() => this.startIdlePulse())
            .start();
    }

    private startIdlePulse() {
        if (this._idleTween) this._idleTween.stop();

        // Target scale is 3% smaller than original to avoid any overlap
        const shrinkScale = v3(this._baseScale.x * 0.97, this._baseScale.y * 0.97, 1);

        this._idleTween = tween(this.node as Node)
            .to(1.8, { scale: shrinkScale }, { easing: 'sineInOut' })
            .to(1.8, { scale: this._baseScale }, { easing: 'sineInOut' })
            .delay(Math.random() * 0.5) 
            .union()
            .repeatForever()
            .start();
    }

    /**
     * Warning: A subtle, internal shiver that does not exceed base scale.
     */
    public playWarningShake(duration: number = 0.5) {
        if (this._isShaking) return;
        this._isShaking = true;
        
        if (this._idleTween) this._idleTween.stop();

        // Shiver involves very slight scale jittering strictly smaller than base
        const shiver1 = v3(this._baseScale.x * 0.96, this._baseScale.y * 1.0, 1);
        const shiver2 = v3(this._baseScale.x * 1.0, this._baseScale.y * 0.96, 1);

        tween(this.node as Node)
            .to(0.05, { scale: shiver1 })
            .to(0.05, { scale: shiver2 })
            .union()
            .repeat(5) 
            .to(0.1, { scale: this._baseScale }, { easing: 'sineIn' })
            .call(() => {
                this._isShaking = false;
                this.startIdlePulse();
            })
            .start();
    }

    protected onDestroy(): void {
        if (this._idleTween) this._idleTween.stop();
    }
}