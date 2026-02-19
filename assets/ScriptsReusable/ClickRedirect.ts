import { _decorator, Component, Button,AudioSource, CCString } from 'cc';
import { AdManager } from './AdManager';
const { ccclass, property } = _decorator;



@ccclass('ClickRedirect')
export class ClickRedirect extends Component {
    @property({ type: Button })
    button: Button = null!;

    @property(CCString)
    IosLink : string = "";

    @property(CCString)
    PlayStoreLink : string = "";

    start() {
        this.button.node.on(Button.EventType.CLICK, this.onClick, this);
    }

    onClick() {

        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.userAgent.includes("Macintosh");
        const isAndroid = /Android/i.test(navigator.userAgent);

        const appStoreURL = this.IosLink;
        const playStoreURL = this.PlayStoreLink;

        const targetURL = isIOS ? appStoreURL : playStoreURL;

        
        AdManager.openStore(targetURL);
    }
}
