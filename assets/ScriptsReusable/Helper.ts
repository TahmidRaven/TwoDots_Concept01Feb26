
import { _decorator, animation, Camera, Component, Game, Node, tween, v3, Vec2, Vec3 } from 'cc';


type PulseData = {
    tween: any;
    baseScale: Vec3;
};

export function pulseNode( node: Node, repeatCount: number = 9999, durationPerPulse: number = 0.4, scaleFactor: number = 1.1 ) {
    const dataKey = '__pulseData__' + node.uuid;

    let pulseData: PulseData = (node as any)[dataKey];

    if (pulseData) {
        pulseData.tween?.stop();
        node.setScale(pulseData.baseScale);
    }

    const baseScale = node.getScale().clone();

    const upScale = v3( baseScale.x * scaleFactor, baseScale.y * scaleFactor, baseScale.z );

    const pulseTween =
        tween(node)
            .to(durationPerPulse, { scale: upScale })
            .to(durationPerPulse, { scale: baseScale })
            .repeat(repeatCount)
            .call(() => {
                node.setScale(baseScale);
                (node as any)[dataKey] = null;
            });

    (node as any)[dataKey] = {
        tween: pulseTween,
        baseScale
    };

    pulseTween.start();
}

export function stopPulse(node: Node) {
    const dataKey = '__pulseData__';
    const pulseData = (node as any)[dataKey];

    if (!pulseData) return;

    pulseData.tween?.stop();
    node.setScale(pulseData.baseScale);
    (node as any)[dataKey] = null;
}



export function shakeNode(
    node: Node,
    duration: number = 0.3,
    strength: number = 10,
    vibrateCount: number = 8,
    onComplete?: () => void
) {
    const originalPos = node.getPosition();

    const shakes: any[] = [];

    for (let i = 0; i < vibrateCount; i++) {
        const dx = (Math.random() * 2 - 1) * strength;
        const dy = (Math.random() * 2 - 1) * strength;

        shakes.push(
            tween()
                .to(duration / vibrateCount, { position: new Vec3(originalPos.x + dx, originalPos.y + dy, originalPos.z) })
        );
    }

    shakes.push(
        tween().to(0.05, { position: originalPos })
    );

    const seq = tween(node);
    shakes.forEach(s => seq.then(s));

    seq.call(() => {
        if (onComplete) onComplete();
    }).start();
}