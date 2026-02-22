import { _decorator, Component, Sprite, Color, v3, Vec3, tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('BlockerAnimation')
export class BlockerAnimation extends Component {
    private _targetScale: Vec3 = v3(0.9, 0.9, 1);

    public playIntroEffect(duration: number = 1.25, delay: number = 0) {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        // Use the current scale (set by GridController) as the basis for padding
        const currentScale = this.node.scale.x; 
        this._targetScale = v3(currentScale * 0.9, currentScale * 0.9, 1); 
        const popScale = v3(currentScale * 1.1, currentScale * 1.1, 1);

        const originalColor = sprite.color.clone();
        const blueGlow = new Color(130, 202, 255, 255);
        const originalPos = this.node.position.clone();

        this.node.setScale(v3(0, 0, 0));

        tween(sprite)
            .delay(delay)
            .to(0.3, { color: blueGlow })
            .delay(duration - 0.6)
            .to(0.3, { color: originalColor })
            .start();

        tween(this.node)
            .delay(delay)
            .to(0.2, { scale: popScale }, { easing: 'backOut' })
            .to(0.1, { scale: this._targetScale }, { easing: 'sineIn' })
            .repeat(3, 
                tween()
                    .to(0.05, { position: v3(originalPos.x + 2, originalPos.y, 0) })
                    .to(0.05, { position: v3(originalPos.x - 2, originalPos.y, 0) })
                    .to(0.05, { position: originalPos })
            )
            .start();
    }
}