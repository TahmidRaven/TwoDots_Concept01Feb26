import { Node, Vec3, v3, tween, Animation, UIOpacity, isValid } from 'cc';
import { GridPiece } from './GridPiece';

export class SpecialItemEffects {
    public static executeOrb(r: number, c: number, grid: (Node | null)[][], rows: number, cols: number, onComplete: () => void) {
        const orbNode = grid[r][c];
        if (!orbNode) return;

        const orbPiece = orbNode.getComponent(GridPiece);
        let targetColorId = orbPiece?.colorId || "";

        if (!targetColorId) {
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const piece = grid[row][col]?.getComponent(GridPiece);
                    if (piece && piece.prefabName !== "TNT" && piece.prefabName !== "ORB") {
                        targetColorId = piece.colorId;
                        break;
                    }
                }
                if (targetColorId) break;
            }
        }

        grid[r][c] = null;

        if (!targetColorId) {
            orbNode.destroy();
            onComplete();
            return;
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const node = grid[row][col];
                const piece = node?.getComponent(GridPiece);
                if (piece && piece.colorId === targetColorId) {
                    grid[row][col] = null;
                    tween(node!)
                        .to(0.2, { scale: v3(0, 0, 0) }, { easing: 'sineIn' })
                        .call(() => node!.destroy())
                        .start();
                }
            }
        }

        let uiOpacity = orbNode.getComponent(UIOpacity) || orbNode.addComponent(UIOpacity);
        tween(orbNode)
            .to(0.3, { scale: v3(1.4, 1.4, 1.4) })
            .call(() => {
                orbNode.destroy();
                onComplete();
            })
            .start();

        tween(uiOpacity).to(0.3, { opacity: 0 }).start();
    }

    public static executeTNT(r: number, c: number, grid: (Node | null)[][], rows: number, cols: number, onComplete: () => void) {
        const tntNode = grid[r][c];
        if (!tntNode) return;

        const anim = tntNode.getComponent(Animation);
        if (anim) anim.play();

        grid[r][c] = null;

        // Explosion math happens mid-animation
        setTimeout(() => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr === r && nc === c) continue;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        const target = grid[nr][nc];
                        if (target) {
                            grid[nr][nc] = null;
                            tween(target)
                                .to(0.1, { scale: v3(0, 0, 0) })
                                .call(() => { if (isValid(target)) target.destroy(); })
                                .start();
                        }
                    }
                }
            }
        }, 350);

        // Transition to gravity faster (reduced from 1350ms to 1100ms)
        setTimeout(() => {
            if (isValid(tntNode)) {
                tntNode.destroy();
                onComplete();
            }
        }, 1100);
    }
}