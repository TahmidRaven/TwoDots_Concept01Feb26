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

        // 1. Outer Glow - Wide bloom
        let glowColor = new Color().fromHEX(colorHex);
        glowColor.a = 100; 
        this.graphics.strokeColor = glowColor;
        this.graphics.lineWidth = 20;
        this.renderPath(start, end, segments, offset);

        // 2. Main Bolt - Primary color
        this.graphics.strokeColor = new Color().fromHEX(colorHex);
        this.graphics.lineWidth = 8; 
        this.renderPath(start, end, segments, offset);

        // 3. Inner Core - High intensity white
        this.graphics.strokeColor = Color.WHITE;
        this.graphics.lineWidth = 3; 
        this.renderPath(start, end, segments, offset);

        // Slightly longer duration (0.15s) so the eye can track the web
        this.scheduleOnce(() => {
            if (isValid(this.graphics)) {
                this.graphics.clear();
            }
        }, 0.15); 
    }

    private renderPath(start: Vec3, end: Vec3, segments: number, offset: number, isBranch: boolean = false) {
        this.graphics.moveTo(start.x, start.y);

        for (let i = 1; i <= segments; i++) {
            let targetPos = new Vec3();
            Vec3.lerp(targetPos, start, end, i / segments);

            if (i < segments) {
                targetPos.x += (Math.random() - 0.5) * offset * 2;
                targetPos.y += (Math.random() - 0.5) * offset * 2;
            }

            this.graphics.lineTo(targetPos.x, targetPos.y);

            // Recursively draw branches
            if (!isBranch && Math.random() > 0.7 && i < segments) {
                const branchEnd = v3(
                    targetPos.x + (Math.random() - 0.5) * 90,
                    targetPos.y + (Math.random() - 0.5) * 90,
                    0
                );
                
                const currentWidth = this.graphics.lineWidth;
                // THICKER BRANCHES: Branches are now 70% of the parent bolt's thickness
                this.graphics.lineWidth = currentWidth * 0.7; 
                
                this.renderPath(targetPos, branchEnd, 3, offset * 0.5, true);
                
                this.graphics.lineWidth = currentWidth; 
                this.graphics.moveTo(targetPos.x, targetPos.y);
            }
        }
        this.graphics.stroke();
    }
}