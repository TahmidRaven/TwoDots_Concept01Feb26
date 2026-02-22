import { _decorator, Component, Sprite, Color, v3, tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('BlockerAnimation')
export class BlockerAnimation extends Component {
    // Setting target scale to 0.9 creates visible padding between blocks
    private readonly TARGET_SCALE = v3(0.9, 0.9, 1);

    /**
     * Plays the pop-in effect with a blue glow and subtle shake.
     * @param duration Total duration of the glow/stay effect.
     * @param delay Staggered delay for the wave effect.
     */
    public playIntroEffect(duration: number = 1.25, delay: number = 0) {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        const originalColor = sprite.color.clone();
        const blueGlow = new Color(130, 202, 255, 255); // Subtle Sky Blue
        const originalPos = this.node.position.clone();

        // Start at zero scale for the pop-in
        this.node.setScale(v3(0, 0, 0));

        // 1. Blue Glow Tween
        tween(sprite)
            .delay(delay)
            .to(0.3, { color: blueGlow })
            .delay(duration - 0.6)
            .to(0.3, { color: originalColor })
            .start();

        // 2. Scale Pop and Shake Tween
        tween(this.node)
            .delay(delay)
            // Pop slightly larger than 1.0 then settle at 0.9 for padding
            .to(0.2, { scale: v3(1.05, 1.05, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: this.TARGET_SCALE }, { easing: 'sineIn' })
            // Subtle horizontal shake
            .repeat(3, 
                tween()
                    .to(0.05, { position: v3(originalPos.x + 2, originalPos.y, 0) })
                    .to(0.05, { position: v3(originalPos.x - 2, originalPos.y, 0) })
                    .to(0.05, { position: originalPos })
            )
            .start();
    }
}