import { Node, v3, Vec3, tween, Animation, UIOpacity, isValid, UITransform } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';

export class SpecialItemEffects {
    public static executeOrb(
        r: number, 
        c: number, 
        grid: (Node | null)[][], 
        rows: number, 
        cols: number, 
        playEffect: (pos: Vec3, colorId: string) => void, 
        onComplete: () => void,
        lightning: LightningEffect
    ) {
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
        if (!targetColorId) { orbNode.destroy(); onComplete(); return; }

        const colorMap: { [key: string]: string } = {
            "blue": "#00FFFF", "red": "#FF3131", "green": "#39FF14", "yellow": "#FFF01F"
        };
        const hex = colorMap[targetColorId] || "#FFFFFF";

        // --- ORB IMPACT FEEDBACK ---
        // Physical shake of the board
        if (orbNode.parent) {
            const originalPos = orbNode.parent.position.clone();
            tween(orbNode.parent)
                .to(0.05, { position: v3(originalPos.x + 8, originalPos.y + 8) })
                .to(0.05, { position: v3(originalPos.x - 8, originalPos.y - 8) })
                .to(0.05, { position: originalPos })
                .start();
        }

        const orbUIT = orbNode.getComponent(UITransform);
        const orbWorldPos = orbUIT ? orbUIT.convertToWorldSpaceAR(v3(0,0,0)) : v3(orbNode.worldPosition);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const node = grid[row][col];
                if (!node) continue;
                
                const piece = node.getComponent(GridPiece);
                if (piece && piece.colorId === targetColorId) {
                    const pos = v3(node.position);
                    const nodeUIT = node.getComponent(UITransform);
                    const targetWorldPos = nodeUIT ? nodeUIT.convertToWorldSpaceAR(v3(0,0,0)) : v3(node.worldPosition);
                    
                    grid[row][col] = null;

                    if (lightning) {
                        const lightningUIT = lightning.getComponent(UITransform);
                        if (lightningUIT) {
                            const localStart = lightningUIT.convertToNodeSpaceAR(orbWorldPos);
                            const localEnd = lightningUIT.convertToNodeSpaceAR(targetWorldPos);
                            lightning.drawLightning(localStart, localEnd, hex);
                        }
                    }

                    // Staggered "pop" animation
                    tween(node)
                        .delay(Math.random() * 0.12)
                        .to(0.1, { scale: v3(1.3, 1.3, 1.3) }) // Swell before popping
                        .to(0.1, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                        .call(() => {
                            playEffect(pos, targetColorId);
                            node.destroy();
                        })
                        .start();
                }
            }
        }

        let uiOpacity = orbNode.getComponent(UIOpacity) || orbNode.addComponent(UIOpacity);
        tween(orbNode).to(0.25, { scale: v3(1.8, 1.8, 1.8) }).call(() => { orbNode.destroy(); onComplete(); }).start();
        tween(uiOpacity).to(0.25, { opacity: 0 }).start();
    }

    public static executeTNT(
        r: number, 
        c: number, 
        grid: (Node | null)[][], 
        rows: number, 
        cols: number, 
        playEffect: (pos: Vec3, colorId: string) => void, 
        onComplete: () => void,
        lightning: LightningEffect 
    ) {
        const tntNode = grid[r][c];
        if (!tntNode) return;
        
        // Use the internal animation assigned to the TNT prefab
        const anim = tntNode.getComponent(Animation);
        if (anim) anim.play();
        
        grid[r][c] = null;

        // Standard delay matching your existing TNT explosion timing
        setTimeout(() => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        const target = grid[nr][nc];
                        if (target) {
                            const pos = v3(target.position);
                            const piece = target.getComponent(GridPiece);
                            const colorId = piece ? piece.colorId : "blocker";

                            if (!piece && GameManager.instance) {
                                GameManager.instance.registerBlockerDestroyed();
                            }

                            grid[nr][nc] = null;
                            tween(target).to(0.1, { scale: v3(0, 0, 0) }).call(() => { 
                                if (isValid(target)) {
                                    playEffect(pos, colorId);
                                    target.destroy(); 
                                }
                            }).start();
                        }
                    }
                }
            }
        }, 350);

        setTimeout(() => { if (isValid(tntNode)) { tntNode.destroy(); onComplete(); } }, 1100);
    }
}