import { _decorator, Component, Graphics, Vec3, Color, isValid } from 'cc';
const { ccclass } = _decorator;

@ccclass('LightningEffect')
export class LightningEffect extends Component {
    private graphics: Graphics = null;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    public drawLightning(start: Vec3, end: Vec3, colorHex: string = "#82CAFF") {
        if (!this.graphics) return;

        // Draw multiple times with slight randomness to create a "vibrating" bolt
        const segments = 6;
        const offset = 18;

        // Outer Glow
        this.graphics.strokeColor = new Color().fromHEX(colorHex);
        this.graphics.lineWidth = 12; 
        this.renderPath(start, end, segments, offset);

        // Inner Core
        this.graphics.strokeColor = Color.WHITE;
        this.graphics.lineWidth = 3;
        this.renderPath(start, end, segments, offset);

        // Clear after a short delay so the "web" effect is visible
        this.scheduleOnce(() => {
            if (isValid(this.graphics)) {
                this.graphics.clear();
            }
        }, 0.25); 
    }

    private renderPath(start: Vec3, end: Vec3, segments: number, offset: number) {
        this.graphics.moveTo(start.x, start.y);
        for (let i = 1; i <= segments; i++) {
            let targetPos = new Vec3();
            Vec3.lerp(targetPos, start, end, i / segments);
            if (i < segments) {
                targetPos.x += (Math.random() - 0.5) * offset * 2;
                targetPos.y += (Math.random() - 0.5) * offset * 2;
            }
            this.graphics.lineTo(targetPos.x, targetPos.y);
        }
        this.graphics.stroke();
    }
}