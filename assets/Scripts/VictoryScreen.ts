import { _decorator, Component, Vec3, tween, UIOpacity, Node, Label } from 'cc';
import { AdManager } from '../ScriptsReusable/AdManager';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('VictoryScreen')
@requireComponent(UIOpacity) 
export class VictoryScreen extends Component {

    @property(Label) titleLabel: Label = null; 

    private opacityComp: UIOpacity = null!;
    
    // Using the scale values from your previous setup
    private readonly TARGET_SCALE = new Vec3(1, 1, 1);
    private readonly POP_SCALE = new Vec3(1.1, 1.1, 1);

    onLoad() {
        // Initialize if active at start
        this.initializeComponents();
        
        // Hide immediately so it doesn't stay on screen during gameplay
        this.node.active = false;
        this.node.setScale(Vec3.ZERO);
    }

    private initializeComponents() {
        if (!this.opacityComp) {
            this.opacityComp = this.getComponent(UIOpacity)!;
        }
    }

    /**
     * @param isWin Sets the header text based on outcome
     */
    public show(isWin: boolean = true) {
        console.log(`[VictoryScreen] show() called. Win status: ${isWin}`);

        // 1. SAFETY: Ensure components are linked (fixes the disabled-node-at-start bug)
        this.initializeComponents();

        // 2. ACTIVATE & MOVE TO FRONT
        this.node.active = true;
        if (this.node.parent) {
            // Move to the very bottom of the hierarchy so it renders on top
            this.node.setSiblingIndex(this.node.parent.children.length - 1);
        }

        // 3. UPDATE UI TEXT
        if (this.titleLabel) {
            this.titleLabel.string = isWin ? "VICTORY!" : "OUT OF MOVES";
        }

        // 4. RESET TRANSFORMS (Fixes the "Z: 3D parameter" issue)
        this.node.setPosition(0, 0, 0); // Center on screen
        this.node.setScale(new Vec3(0.5, 0.5, 1)); // Start small for the "pop"
        
        if (this.opacityComp) {
            this.opacityComp.opacity = 0; // Start invisible
            
            // FADE IN
            tween(this.opacityComp)
                .to(0.3, { opacity: 255 })
                .start();
        }

        // 5. POP ANIMATION (From your previous working setup)
        tween(this.node as Node)
            .to(0.4, { scale: this.POP_SCALE }, { easing: 'cubicOut' })
            .to(0.2, { scale: this.TARGET_SCALE }, { easing: 'sineOut' })
            .start();
    }
}