import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TypewriterEffect')
export class TypewriterEffect extends Component {
    @property({ type: Label })
    public targetLabel: Label = null!;

    @property
    public typingSpeed: number = 0.05; // Seconds per character

    private _fullText: string = "";
    private _currentIndex: number = 0;

    public play(text: string) {
        if (!this.targetLabel) return;
        
        this._fullText = text;
        this._currentIndex = 0;
        this.targetLabel.string = "";
        
        this.unschedule(this.typeCharacter);
        this.schedule(this.typeCharacter, this.typingSpeed);
    }

    private typeCharacter() {
        this._currentIndex++;
        this.targetLabel.string = this._fullText.substring(0, this._currentIndex);

        if (this._currentIndex >= this._fullText.length) {
            this.unschedule(this.typeCharacter);
        }
    }
}