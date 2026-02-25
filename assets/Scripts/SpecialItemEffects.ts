import { Node, v3, Vec3, tween, Animation, isValid, UITransform, Sprite, Color } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';

export class SpecialItemEffects {

    private static readonly colorMap: { [key: string]: string } = {
        "blue": "#00FFFF", 
        "red": "#FF3131", 
        "green": "#39FF14", 
        "yellow": "#FFF01F",
        "purple": "#B183E5", 
        "gray": "#C1CADE"     
    };

    private static activeExplosions = 0;

    /**
     * Executes the Orb effect: Clears all items of a specific color across the grid.
     */
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
        
        const currentScale = orbNode.scale.x;
        const orbPiece = orbNode.getComponent(GridPiece);
        let targetColorId = orbPiece?.colorId || "";

        // If no color is assigned, pick the first valid color found on the grid
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

        if (GameManager.instance) GameManager.instance.playAudio("ORBlightning");

        const hex = this.colorMap[targetColorId] || "#FFFFFF";
        const orbUIT = orbNode.getComponent(UITransform);
        const orbWorldPos = orbUIT ? orbUIT.convertToWorldSpaceAR(v3(0,0,0)) : v3(orbNode.worldPosition);

        const targets: {node: Node, pos: Vec3}[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const node = grid[row][col];
                if (!node) continue;
                const piece = node.getComponent(GridPiece);
                if (piece && piece.colorId === targetColorId) {
                    targets.push({ node, pos: v3(node.position) });
                    grid[row][col] = null; 
                }
            }
        }

        const drawWindow = 0.3; 
        const holdTime = 0.1;   
        const popDuration = 0.15;
        const stagger = targets.length > 1 ? drawWindow / (targets.length - 1) : 0;

        targets.forEach((targetData, index) => {
            const startDrawDelay = index * stagger;
            const syncPopDelay = (drawWindow - startDrawDelay) + holdTime;

            tween(targetData.node)
                .delay(startDrawDelay)
                .call(() => {
                    if (lightning) {
                        const lUIT = lightning.getComponent(UITransform);
                        const nodeUIT = targetData.node.getComponent(UITransform);
                        if (lUIT && nodeUIT) {
                            const targetWorldPos = nodeUIT.convertToWorldSpaceAR(v3(0,0,0));
                            const lStart = lUIT.convertToNodeSpaceAR(orbWorldPos);
                            const lEnd = lUIT.convertToNodeSpaceAR(targetWorldPos);
                            lightning.drawLightning(lStart, lEnd, hex);
                        }
                    }
                })
                .delay(syncPopDelay)
                .to(0.05, { scale: v3(currentScale * 1.2, currentScale * 1.2, 1) }) 
                .to(popDuration, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                .call(() => {
                    playEffect(targetData.pos, targetColorId);
                    targetData.node.destroy();
                })
                .start();
        });

        tween(orbNode)
            .to(0.15, { scale: v3(currentScale * 1.25, currentScale * 1.25, 1) }) 
            .delay(drawWindow + holdTime)
            .call(() => { if (lightning) lightning.clearWeb(); })
            .to(0.1, { scale: v3(0, 0, 0) })
            .call(() => { 
                orbNode.destroy(); 
                onComplete(); 
            })
            .start();
    }

    /**
     * Executes the TNT effect: Explodes in a 3x3 area.
     */
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

        this.activeExplosions++;
        
        const anim = tntNode.getComponent(Animation);
        if (anim) anim.play();
        
        grid[r][c] = null;

        // Brief delay to allow the TNT fuse animation to show
        setTimeout(() => {
            if (GameManager.instance) GameManager.instance.playAudio("TNTexplosion");

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

                    const target = grid[nr][nc];
                    if (!target) continue;

                    const piece = target.getComponent(GridPiece);
                    
                    // Chain reaction for other TNTs
                    if (piece && piece.prefabName === "TNT") {
                        this.executeTNT(nr, nc, grid, rows, cols, playEffect, onComplete, lightning);
                        continue;
                    }

                    // Direct destruction for blockers (bricks)
                    if (!piece) {
                        this.destroyBlockerAt(nr, nc, grid, playEffect);
                        continue;
                    }

                    // Destruction for regular balls
                    const pos = v3(target.position);
                    const colorId = piece.colorId;
                    
                    // Check if destroying this ball clears any neighboring blockers
                    this.checkOutlierBlockers(nr, nc, grid, rows, cols, playEffect);

                    grid[nr][nc] = null;
                    tween(target)
                        .to(0.1, { scale: v3(0, 0, 0) })
                        .call(() => { 
                            if (isValid(target)) {
                                playEffect(pos, colorId);
                                target.destroy(); 
                            }
                        }).start();
                }
            }
        }, 350);

        setTimeout(() => { 
            if (isValid(tntNode)) tntNode.destroy(); 
            
            this.activeExplosions--;

            if (this.activeExplosions <= 0) {
                this.activeExplosions = 0; 
                onComplete(); 
            }
        }, 1100);
    }

    /**
     * Checks neighboring cells for blockers to destroy when an adjacent ball is popped.
     */
    private static checkOutlierBlockers(r: number, c: number, grid: (Node | null)[][], rows: number, cols: number, playEffect: any) {
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        neighbors.forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const neighbor = grid[nr][nc];
                // If it has no GridPiece, it is considered a blocker
                if (neighbor && !neighbor.getComponent(GridPiece)) {
                    this.destroyBlockerAt(nr, nc, grid, playEffect);
                }
            }
        });
    }

    /**
     * Handles the actual destruction of a blocker and notifies the GameManager.
     */
    private static destroyBlockerAt(r: number, c: number, grid: (Node | null)[][], playEffect: any) {
        const blocker = grid[r][c];
        if (!blocker) return;

        const pos = v3(blocker.position);
        grid[r][c] = null;
        
        if (GameManager.instance) {
            // Updated call: this ensures the UI refresh logic is triggered immediately
            GameManager.instance.registerBlockerDestroyed(); 
        }

        tween(blocker)
            .to(0.15, { scale: v3(0, 0, 0) })
            .call(() => {
                playEffect(pos, "blocker");
                blocker.destroy();
            })
            .start();
    }
}