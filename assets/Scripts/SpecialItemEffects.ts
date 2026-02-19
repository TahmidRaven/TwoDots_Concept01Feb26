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

        // Fallback: if orb has no color, find the first available color on the grid
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

        const orbUIT = orbNode.getComponent(UITransform);
        const orbWorldPos = orbUIT ? orbUIT.convertToWorldSpaceAR(v3(0,0,0)) : v3(orbNode.worldPosition);

        let boltCount = 0;
        const staggerTime = 0.08; // Time between each lightning strike

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const node = grid[row][col];
                if (!node) continue;
                
                const piece = node.getComponent(GridPiece);
                if (piece && piece.colorId === targetColorId) {
                    const pos = v3(node.position);
                    const nodeUIT = node.getComponent(UITransform);
                    const targetWorldPos = nodeUIT ? nodeUIT.convertToWorldSpaceAR(v3(0,0,0)) : v3(node.worldPosition);
                    
                    grid[row][col] = null; // Logical removal
                    const delay = boltCount * staggerTime;
                    boltCount++;

                    tween(node)
                        // 1. IMMEDIATE REACTION: Shrink slightly so they don't look "afloat"
                        .to(0.1, { scale: v3(0.8, 0.8, 0.8) }, { easing: 'quadIn' })
                        .delay(delay)
                        .call(() => {
                            // 2. FIRE LIGHTNING
                            if (lightning) {
                                const lUIT = lightning.getComponent(UITransform);
                                if (lUIT) {
                                    const lStart = lUIT.convertToNodeSpaceAR(orbWorldPos);
                                    const lEnd = lUIT.convertToNodeSpaceAR(targetWorldPos);
                                    lightning.drawLightning(lStart, lEnd, hex);
                                }
                            }
                        })
                        // 3. IMPACT: Quick swell and destroy
                        .to(0.05, { scale: v3(1.2, 1.2, 1.2) }) 
                        .to(0.1, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                        .call(() => {
                            playEffect(pos, targetColorId);
                            node.destroy();
                        })
                        .start();
                }
            }
        }

        // Calculate how long to wait before allowing pieces to fall (Gravity)
        const totalWaitTime = (boltCount * staggerTime) + 0.4;

        let uiOpacity = orbNode.getComponent(UIOpacity) || orbNode.addComponent(UIOpacity);
        tween(orbNode)
            .to(0.2, { scale: v3(1.6, 1.6, 1.6) }) // Grow the orb while it fires
            .delay(totalWaitTime)
            .to(0.15, { scale: v3(0, 0, 0) })
            .call(() => {
                orbNode.destroy();
                onComplete(); // Trigger applyGravity() in GridController
            })
            .start();
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
        
        const anim = tntNode.getComponent(Animation);
        if (anim) anim.play();
        
        grid[r][c] = null;

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