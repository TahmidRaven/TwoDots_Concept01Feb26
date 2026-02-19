import { _decorator, Component, Graphics, Vec3, Color, isValid, v3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('LightningEffect')
export class LightningEffect extends Component {
    private graphics: Graphics = null;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    public drawLightning(start: Vec3, end: Vec3, colorHex: string = "#82CAFF") {
        if (!this.graphics) return;

        const segments = 8;
        const offset = 18;

        // 1. Outer Glow - Wide, transparent stroke for bloom effect
        let glowColor = new Color().fromHEX(colorHex);
        glowColor.a = 100; 
        this.graphics.strokeColor = glowColor;
        this.graphics.lineWidth = 20;
        this.renderPath(start, end, segments, offset);

        // 2. Main Bolt - The primary colored core
        this.graphics.strokeColor = new Color().fromHEX(colorHex);
        this.graphics.lineWidth = 6;
        this.renderPath(start, end, segments, offset);

        // 3. Inner Core - Bright white center for intensity
        this.graphics.strokeColor = Color.WHITE;
        this.graphics.lineWidth = 2;
        this.renderPath(start, end, segments, offset);

        // Short duration for a "snappy" feel
        this.scheduleOnce(() => {
            if (isValid(this.graphics)) {
                this.graphics.clear();
            }
        }, 0.12); 
    }

    private renderPath(start: Vec3, end: Vec3, segments: number, offset: number, isBranch: boolean = false) {
        this.graphics.moveTo(start.x, start.y);
        let lastPos = start.clone();

        for (let i = 1; i <= segments; i++) {
            let targetPos = new Vec3();
            Vec3.lerp(targetPos, start, end, i / segments);

            if (i < segments) {
                // Add jagged randomness
                targetPos.x += (Math.random() - 0.5) * offset * 2;
                targetPos.y += (Math.random() - 0.5) * offset * 2;
            }

            this.graphics.lineTo(targetPos.x, targetPos.y);

            // Recursively draw a small branch 20% of the time
            if (!isBranch && Math.random() > 0.8 && i < segments) {
                const branchEnd = v3(
                    targetPos.x + (Math.random() - 0.5) * 60,
                    targetPos.y + (Math.random() - 0.5) * 60,
                    0
                );
                this.renderPath(targetPos, branchEnd, 3, offset * 0.5, true);
                this.graphics.moveTo(targetPos.x, targetPos.y); // Reset pen to main line
            }
            lastPos = targetPos.clone();
        }
        this.graphics.stroke();
    }
}