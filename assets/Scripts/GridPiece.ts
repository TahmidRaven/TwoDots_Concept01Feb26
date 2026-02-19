import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GridPiece')
export class GridPiece extends Component {
    @property public colorId: string = "blue";
    public row: number = 0;
    public col: number = 0;
    public prefabName: string = "";
}