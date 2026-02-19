import { _decorator, Component, Node, Camera, RenderTexture, Texture2D, Sprite, SpriteFrame, Size } from 'cc';
import { pulseNode } from './Helper';
import { AdEvent, AdManager } from './AdManager';
const { ccclass, property } = _decorator;

@ccclass('PlayableUiCanvasFix')
export class PlayableUiCanvasFix extends Component 
{

    // @property(Camera)
    // public sceneCamera: Camera = null;

    // @property(Camera)
    // public uiCamera: Camera = null;


    onLoad() 
    {
       // this.setupRenderTexture();

        AdManager.on(AdEvent.VIEWABLE_CHANGE, this.onViewableChange.bind(this));
    }

    // protected start(): void {        
    // }

    // private setupRenderTexture() {
    //     if (!this.sceneCamera || !this.uiCamera) {
    //         console.error('Scene camera and UI camera must be assigned!');
    //         return;
    //     }
    //     this.sceneCamera.targetTexture = this.uiCamera.targetTexture;

    //     this.uiCamera.clearFlags = Camera.ClearFlag.DONT_CLEAR;

    //     this.uiCamera.priority = this.sceneCamera.priority + 1;
    // }

    private onViewableChange(percentage: number, visibleRect: any, occlusionRectangles: any[]) 
    {
        console.log(`Ad viewable percentage: ${percentage}`);
        pulseNode(this.node, 1, 0.2, 1.01);
    }
}
