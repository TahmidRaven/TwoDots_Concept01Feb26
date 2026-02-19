import { _decorator, AudioClip, AudioSource, CCFloat, Component, EventHandler, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioContent')
export class AudioContent extends Component {

    @property
    public AudioName : string = "";

    @property(AudioClip)
    public AudioClip : AudioClip = null;

    @property
    public Loop = false;

    @property({type : CCFloat, range : [0, 1]})
    public Volume = 1.0;

    @property
    public PlayOnLoad = false;


    @property(EventHandler)
    public OnPlayingStart : EventHandler = new EventHandler();

    @property(EventHandler)
    public OnPlayingEnd : EventHandler = new EventHandler();

    public AudioSource : AudioSource = null;

}


