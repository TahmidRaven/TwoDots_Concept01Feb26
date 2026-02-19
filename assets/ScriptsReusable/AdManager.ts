// -------------------------
// Global Window Types
// -------------------------
declare global {
    interface Window 
    {
        mraid?: 
        {
            addEventListener: (event: string, callback: (data?: any, data2?: any, data3?: any[]) => void) => void;
            removeEventListener?: (event: string, callback: (data?: any) => void) => void;
            getState?: () => string;
            open?: (url?: string) => void;

            isMock? : boolean;
        };

        FbPlayableAd?: 
        {
            onCTAClick: () => void;
            onFinish?: (callback: () => void) => void;
            onError?: (callback: (err: any) => void) => void;
            click?: () => void;

            isMock? : boolean;
        };

        // -------------------------
        // Global Methods/Functions
        // ------------------------
        adManOpenStore?: (url? : string) => void;
        adManGameReady?: () => void;
        adManGameEnd?: () => void;
        adManGameRetry?: () => void;


        // Mintegral methods
        install?: (url? : string) => void;
        gameReady?: () => void;
        gameStart?: () => void;
        gameEnd?: () => void;
        gameClose?: () => void;
        gameRetry?: () => void;
        
        // Mintegral tracking API
        HttpAPI?: {
            sendPoint: (data: string) => void;
        };
    }
}

// -------------------------
// Common Event Enum
// -------------------------
export enum AdEvent {
    READY = "READY",
    START = "START",
    AUDIO_CHANGE = "AUDIO_CHANGE",
    STATE_CHANGE = "STATE_CHANGE",
    VIEWABLE_CHANGE = "VIEWABLE_CHANGE",
    CLICK = "CLICK",
    EXPAND = "EXPAND",
    CLOSE = "CLOSE",
    RETRY = "RETRY",
    ERROR = "ERROR",
    IMPRESSION = "IMPRESSION",
    COMPLETED = "COMPLETED",
    VIDEO_START = "VIDEO_START",
    VIDEO_COMPLETE = "VIDEO_COMPLETE",
    REWARD = "REWARD"
}

export type AdEventHandler = (data?: any, data2?: any, data3?: any[]) => void;

export enum AdState
{
    LOADING     =   "LOADING",
    DEFAULT     =   "DEFAULT",
    EXPANDED    =   "EXPANDED",
    RESIZED     =   "RESIZED",
    HIDDEN      =   "HIDDEN"
}

export enum AdapterType
{
    GENERIC,
    MRAID,
    META,
    MINTEGRAL
}

export interface AdAdapter 
{
    SetUpGlobalMethods() : void;

    HookEvents(): void;

    OpenStore(url? : string);

    GameReady() : void;
    GameEnd() : void;
    GameRetry() : void;

    GetCurrentState() : AdState;

    GetAdapterType() : AdapterType;
}

// -----------------------------------------
// Generic Adapter
// -----------------------------------------
export class GenericAdAdapter implements AdAdapter
{
    private m_state : AdState = AdState.LOADING;

    private m_adapterType : AdapterType = AdapterType.GENERIC;

    GetAdapterType() : AdapterType
    {
        return this.m_adapterType;
    }

    SetUpGlobalMethods(): void 
    {
        if(!window.adManOpenStore)
        {
            window.adManOpenStore = (url? : string) =>
            {
                console.log("[GenericAdapter] window.adManOpenStore() called! Delegating to window.open()");

                window.open(url);
            };
        }

        if(!window.adManGameReady)
        {
            window.adManGameReady = () =>
            {
                console.log("[GenericAdapter] window.adManGameReady() called!");                
            };
        }

        if(!window.adManGameEnd)
        {
            window.adManGameEnd = () =>
            {
                console.log("[GenericAdapter] window.adManGameEnd() called!");
            };
        }

        if(!window.adManGameRetry)
        {
            window.adManGameRetry = () =>
            {
                console.log("[GenericAdapter] window.adManGameRetry() called!");
            };
        }
    }
    
    HookEvents(): void 
    {
        console.log("[GenericAdapter] No events to hook into!");
    }

    OpenStore(url?: string)
    {
        AdManager.emit(AdEvent.CLICK);

        if(window.adManOpenStore)
        {
            console.log("[GenericAdapter] OpenStore() called! Delegating to window.adManOpenStore()");

            window.adManOpenStore(url);
        }
    }

    GameReady(): void 
    {
        if(window.adManGameReady)
        {
            console.log("[GenericAdapter] GameReady() called! Delegating to window.adManGameReady()");

            this.m_state = AdState.DEFAULT;

            window.adManGameReady();
        }
    }

    GameEnd(): void 
    {
        if(window.adManGameEnd)
        {
            console.log("[GenericAdapter] GameEnd() called! Delegating to window.adManGameEnd()");
            
            this.m_state = AdState.HIDDEN;

            window.adManGameEnd();
        }
    }

    GameRetry(): void 
    {
        if(window.adManGameRetry)
        {
            console.log("[GenericAdapter] GameRetry() called! Delegating to window.adManGameRetry()");

            window.adManGameRetry();
        }
    }

    GetCurrentState(): AdState 
    {
        return this.m_state;    
    }
}

// -------------------------
// MRAID Adapter
// -------------------------
export class MRAIDAdAdapter implements AdAdapter 
{
    private m_state : AdState = AdState.LOADING;

    private m_adapterType : AdapterType = AdapterType.MRAID;

    GetAdapterType() : AdapterType
    {
        return this.m_adapterType;
    }

    SetUpGlobalMethods(): void 
    {

        if(!window.adManOpenStore)
        {
            window.adManOpenStore = (url? : string) =>
            {
                console.log("[MRAIDAdapter] window.adManOpenStore() called! Delegating to window.mraid.open()");

                window.mraid.open(url);
            };
        }

        if(!window.adManGameReady)
        {
            window.adManGameReady = () =>
            {
                console.log("[MRAIDAdapter] window.adManGameReady() called!");
            };
        }

        if(!window.adManGameEnd)
        {
            window.adManGameEnd = () =>
            {
                console.log("[MRAIDAdapter] window.adManGameEnd() called!");
            };
        }

        if(!window.adManGameRetry)
        {
            window.adManGameRetry = () =>
            {
                console.log("[MRAIDAdapter] window.adManGameRetry() called!");
            };
        }
    }

    HookEvents(): void 
    {
        if (!window.mraid) return;

        console.log("[MRAIDAdapter] MRAID Found! Hooking MRAID Events");

        window.mraid.addEventListener('ready', this.onReadyEvent.bind(this));

        window.mraid.addEventListener('error', (msg: string) => AdManager.emit(AdEvent.ERROR, msg));

        window.mraid.addEventListener('stateChange', this.onStateChange.bind(this));

        window.mraid.addEventListener('exposureChange', (percentage : number, visibleRect : any, occlusionRectangles : any[]) =>
        {
             AdManager.emit(AdEvent.VIEWABLE_CHANGE, percentage, visibleRect, occlusionRectangles)
        });

        window.mraid.addEventListener('audioVolumeChange', (vol_percentage: number) => AdManager.emit(AdEvent.AUDIO_CHANGE, vol_percentage));
    }

    OpenStore(url?: string)
    {
        AdManager.emit(AdEvent.CLICK);

        if(window.adManOpenStore)
        {
            console.log("[MRAIDAdapter] OpenStore() called! Delegating to window.adManOpenStore()");

            window.adManOpenStore(url);
        }
    }

    GameReady(): void 
    {
        if(window.adManGameReady)
        {
            console.log("[MRAIDAdapter] GameReady() called! Delegating to window.adManGameReady()");

            this.m_state = AdState.DEFAULT;

            window.adManGameReady();
        }
    }

    GameEnd(): void 
    {
        if(window.adManGameEnd)
        {
            console.log("[MRAIDAdapter] GameEnd() called! Delegating to window.adManGameEnd()");
            
            this.m_state = AdState.HIDDEN;

            window.adManGameEnd();
        }
    }

    GameRetry(): void 
    {
        if(window.adManGameRetry)
        {
            console.log("[MRAIDAdapter] GameRetry() called! Delegating to window.adManGameRetry()");

            window.adManGameRetry();
        }
    }

    GetCurrentState(): AdState 
    {
        return this.m_state;    
    }

    private onReadyEvent() : void
    {
        AdManager.emit(AdEvent.READY);
        AdManager.emit(AdEvent.START);
    }

    private onStateChange(state : string) : void
    {
        switch(state)
        {
            case 'loading'  :   this.m_state = AdState.LOADING; break;
            case 'default'  :   this.m_state = AdState.DEFAULT; break;
            case 'expanded' :   this.m_state = AdState.EXPANDED; break;
            case 'resized'  :   this.m_state = AdState.RESIZED; break;
            case 'hidden'   :   this.m_state = AdState.HIDDEN; break;   
        };

        AdManager.emit(AdEvent.STATE_CHANGE, this.m_state);
    }
}


// -------------------------
// Meta Adapter
// -------------------------
export class MetaAdAdapter implements AdAdapter 
{
    private m_state : AdState = AdState.LOADING;

    private m_adapterType : AdapterType = AdapterType.META;

    GetAdapterType() : AdapterType
    {
        return this.m_adapterType;
    }

    SetUpGlobalMethods(): void 
    {
        if(!window.adManOpenStore)
        {
            window.adManOpenStore = (url? : string) =>
            {
                console.log("[MetaAdapter] window.adManOpenStore() called! Delegating to window.FbPlayableAd.onCTAClick()");

                window.FbPlayableAd.onCTAClick();
            };
        }

        if(!window.adManGameReady)
        {
            window.adManGameReady = () =>
            {
                console.log("[MetaAdapter] window.adManGameReady() called!");
            };
        }

        if(!window.adManGameEnd)
        {
            window.adManGameEnd = () =>
            {
                console.log("[MetaAdapter] window.adManGameEnd() called!");
            };
        }

        if(!window.adManGameRetry)
        {
            window.adManGameRetry = () =>
            {
                console.log("[MetaAdapter] window.adManGameRetry() called!");
            };
        }   
    }

    HookEvents(): void 
    {
        if (!window.FbPlayableAd) return;

        console.log("Meta / Moloco Playable API found! Hooking Events");

        window.FbPlayableAd.onFinish?.(this.GameEnd.bind(this));
        window.FbPlayableAd.onError?.((e : string) => AdManager.emit(AdEvent.ERROR, e));
    }

    OpenStore(url?: string)
    {
        AdManager.emit(AdEvent.CLICK);

        if(window.adManOpenStore)
        {
            console.log("[MetaAdapter] OpenStore() called! Delegating to window.adManOpenStore()");

            window.adManOpenStore(url);
        }
    }

    GameReady(): void 
    {
        if(window.adManGameReady)
        {
            console.log("[MetaAdapter] GameReady() called! Delegating to window.adManGameReady()");

            this.m_state = AdState.DEFAULT;

            window.adManGameReady();
        }
    }

    GameEnd(): void 
    {
        if(window.adManGameEnd)
        {
            console.log("[MetaAdapter] GameEnd() called! Delegating to window.adManGameEnd()");
            
            this.m_state = AdState.HIDDEN;

            window.adManGameEnd();
        }
    }

    GameRetry(): void 
    {
        if(window.adManGameRetry)
        {
            console.log("[MetaAdapter] GameRetry() called! Delegating to window.adManGameRetry()");

            window.adManGameRetry();
        }
    }

    GetCurrentState(): AdState 
    {
        return this.m_state;    
    }
}


// ---------------------------------
// Mintegral Adapter
// ---------------------------------
export class MintegralAdAdapter implements AdAdapter
{
    private m_state : AdState = AdState.LOADING;

    private m_adapterType : AdapterType = AdapterType.MINTEGRAL;

    GetAdapterType() : AdapterType
    {
        return this.m_adapterType;
    }

    SetUpGlobalMethods(): void 
    {
        if(!window.adManOpenStore)
        {
            window.adManOpenStore = (url? : string) =>
            {
                console.log("[MintegralAdapter] window.adManOpenStore() called! Delegating to window.install()");

                window.install();
            };
        }

        if(!window.adManGameReady)
        {
            window.adManGameReady = () =>
            {
                console.log("[MintegralAdapter] window.adManGameReady() called! Delegating to window.gameReady()");
                
                window.gameReady();
            };
        }

        if(!window.adManGameEnd)
        {
            window.adManGameEnd = () =>
            {
                console.log("[MintegralAdapter] window.adManGameEnd() called! Delegating to window.gameEnd()");

                window.gameEnd();
            };
        }

        if(!window.adManGameRetry)
        {
            window.adManGameRetry = () =>
            {
                console.log("[MintegralAdapter] window.adManGameRetry() called! Delegating to window.gameRetry()");

                window.gameRetry();
            };
        }

        if(!window.gameStart)
        {
            window.gameStart = () =>
            {
                AdManager.emit(AdEvent.START);
            };
        }

        if(!window.gameClose)
        {
            window.gameClose = () =>
            {
                AdManager.emit(AdEvent.CLOSE);
            };
        }
    }
    
    HookEvents(): void 
    {
        console.log("[MintegralAdapter] No events to hook into!");
    }

    OpenStore(url?: string)
    {
        AdManager.emit(AdEvent.CLICK);

        if(window.adManOpenStore)
        {
            console.log("[MintegralAdapter] OpenStore() called! Delegating to window.adManOpenStore()");

            window.adManOpenStore(url);
        }
    }

    GameReady(): void 
    {
        if(window.adManGameReady)
        {
            console.log("[MintegralAdapter] GameReady() called! Delegating to window.adManGameReady()");

            this.m_state = AdState.DEFAULT;

            window.adManGameReady();
        }
    }

    GameEnd(): void 
    {
        if(window.adManGameEnd)
        {
            console.log("[MintegralAdapter] GameEnd() called! Delegating to window.adManGameEnd()");
            
            this.m_state = AdState.HIDDEN;

            window.adManGameEnd();
        }
    }

    GameRetry(): void 
    {
        if(window.adManGameRetry)
        {
            console.log("[MintegralAdapter] GameRetry() called! Delegating to window.adManGameRetry()");

            window.adManGameRetry();
        }
    }

    GetCurrentState(): AdState 
    {
        return this.m_state;    
    }
}



// -------------------------
// AdManager
// -------------------------
export class AdManager {

    private static s_handlers: Map<AdEvent, AdEventHandler[]> = new Map();
    private static s_adAdapter: AdAdapter | null = null;

    constructor() 
    {
        if (window.mraid) AdManager.s_adAdapter = new MRAIDAdAdapter();
        else if(window.FbPlayableAd) AdManager.s_adAdapter = new MetaAdAdapter();
        else if(window.gameReady && window.gameEnd && window.gameRetry && window.install) AdManager.s_adAdapter = new MintegralAdAdapter();
        else AdManager.s_adAdapter = new GenericAdAdapter();
        

        if(AdManager.s_adAdapter)
        {
            AdManager.s_adAdapter.SetUpGlobalMethods();
            AdManager.s_adAdapter.HookEvents();
        }
    }

    public static on(event: AdEvent, callback: AdEventHandler): void 
    {
        if (!this.s_handlers.has(event)) this.s_handlers.set(event, []);

        this.s_handlers.get(event)!.push(callback);
    }

    public static off(event: AdEvent, callback: AdEventHandler): void 
    {
        const callbacks = this.s_handlers.get(event);

        if (!callbacks) return;

        const index = callbacks.indexOf(callback);

        if (index !== -1) callbacks.splice(index, 1);
    }

    public static emit(event: AdEvent, data?: any, data2?: any, data3?: any[]): void 
    {
        const callbacks = this.s_handlers.get(event);
    
        if (!callbacks) return;
    
        callbacks.forEach(fn => fn(data));
    }

    public static openStore(url?: string): void 
    {
        this.s_adAdapter.OpenStore(url);
    }

    public static gameReady() : void
    {
        this.s_adAdapter.GameReady();
    }

    public static gameEnd() : void
    {
        this.s_adAdapter.GameEnd();
    }

    public static gameRetry() : void
    {
        this.s_adAdapter.GameRetry();
    }

    public static getAdAdapter() : AdAdapter
    {
        return this.s_adAdapter;
    }
}

new AdManager();
