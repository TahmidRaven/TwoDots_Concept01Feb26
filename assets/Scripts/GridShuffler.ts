import { _decorator, Node, v3, tween, Vec3 } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass } = _decorator;

@ccclass('GridShuffler')
export class GridShuffler {
    /**
     * Checks if there are any valid moves (matches or special items)
     */
    public static hasValidMoves(grid: (Node | null)[][], rows: number, cols: number): boolean {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const node = grid[r][c];
        
                if (!node) continue;

                const piece = node.getComponent(GridPiece);
                if (!piece) continue; // It's a blocker

                // TNT and ORB are always "valid moves"
                if (piece.prefabName === "TNT" || piece.prefabName === "ORB") return true;

                // Check neighbors for a color match
                const directions = [[1, 0], [0, 1]]; // Only need to check right and down
                for (const [dr, dc] of directions) {
                    const nr = r + dr;
                    const nc = c + dc;

                    if (nr < rows && nc < cols) {
                        const neighbor = grid[nr][nc];
                        if (neighbor) {
                            const neighborPiece = neighbor.getComponent(GridPiece);
                            if (neighborPiece && neighborPiece.colorId === piece.colorId) {
                                return true; // Found a pair!
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Shuffles the current pieces on the grid
     */
    public static shuffle(grid: (Node | null)[][], rows: number, cols: number, cellSize: number, onComplete: () => void) {
        const pieces: Node[] = [];
        const positions: { r: number, c: number }[] = [];

        // 1. Collect all non-blocker pieces and their slots
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const node = grid[r][c];
                if (node && node.getComponent(GridPiece)) {
                    pieces.push(node);
                    positions.push({ r, c });
                }
            }
        }

        // 2. Fisher-Yates Shuffle the nodes array
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }

        // 3. Re-assign to grid and animate
        const offsetX = (cols - 1) * cellSize / 2;
        const offsetY = (rows - 1) * cellSize / 2;

        pieces.forEach((node, index) => {
            const { r, c } = positions[index];
            grid[r][c] = node;
            
            const piece = node.getComponent(GridPiece)!;
            piece.row = r;
            piece.col = c;

            const targetPos = v3((c * cellSize) - offsetX, offsetY - (r * cellSize), 0);
            
            tween(node)
                .to(0.5, { position: targetPos }, { easing: 'expoOut' })
                .start();
        });

        // Small delay to ensure animations finish
        setTimeout(onComplete, 600);
    }
}