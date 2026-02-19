import { _decorator, BoxCollider2D, Canvas, Collider2D, Component, ECollider2DType, find, Node, Size, UITransform, Vec2, view, Widget } from 'cc';
const { ccclass, property } = _decorator;



@ccclass('LayoutResponsive')
export class LayoutResponsive extends Component 
{
    
    private m_widget: Widget;

    private m_originalLeft = 0;
    private m_originalRight = 0;
    private m_originalTop = 0;
    private m_originalBottom = 0;

    private m_isResized = true;

    @property
    public ApplyAlways = false;

    start() 
    {
        this.m_widget = this.node.getComponent(Widget);


        this.m_originalLeft = this.m_widget.left;
        this.m_originalRight = this.m_widget.right;
        this.m_originalTop = this.m_widget.top;
        this.m_originalBottom = this.m_widget.bottom;

        window.addEventListener("resize", () =>
        {
            this.m_isResized = true;
        });

        this.setResponsivePosition();
    }

    setResponsivePosition() 
    {
        const canvasSize = new Size(window.innerWidth, window.innerHeight);//view.getCanvasSize();
        const designSize = view.getDesignResolutionSize();

        const canvasAspect = canvasSize.width / canvasSize.height;
        const designAspect = designSize.width / designSize.height;

        const ratioDiff = Math.abs(canvasAspect - designAspect);
        const isSameRatio = ratioDiff < 0.01;

        if (isSameRatio) 
        {
            // Reset to original margins if same aspect
            this.m_widget.left = this.m_originalLeft;
            this.m_widget.right = this.m_originalRight;
            this.m_widget.top = this.m_originalTop;
            this.m_widget.bottom = this.m_originalBottom;
        } 
        else 
        {
            if (canvasAspect > designAspect) 
            {
                // Wider screen → add horizontal padding
                const scaleFactor = canvasSize.height / designSize.height;
                const adjustedDesignWidth = designSize.width * scaleFactor;
                const padding = (canvasSize.width - adjustedDesignWidth) / 2;
                const marginOffset = padding / scaleFactor;

                if (this.m_widget.isAlignLeft)
                    this.m_widget.left = this.m_originalLeft - marginOffset;
                if (this.m_widget.isAlignRight)
                    this.m_widget.right = this.m_originalRight - marginOffset;

                // Reset vertical margins
                this.m_widget.top = this.m_originalTop;
                this.m_widget.bottom = this.m_originalBottom;

            } 
            else 
            {
                // Taller screen → add vertical padding
                const scaleFactor = canvasSize.width / designSize.width;
                const adjustedDesignHeight = designSize.height * scaleFactor;
                const padding = (canvasSize.height - adjustedDesignHeight) / 2;
                const marginOffset = padding / scaleFactor;

                if (this.m_widget.isAlignTop)
                    this.m_widget.top = this.m_originalTop - marginOffset;
                if (this.m_widget.isAlignBottom)
                    this.m_widget.bottom = this.m_originalBottom - marginOffset;

                // Reset horizontal margins
                this.m_widget.left = this.m_originalLeft;
                this.m_widget.right = this.m_originalRight;
            }
        }

        this.m_widget.updateAlignment();
    }

    update(deltaTime: number) 
    {
        if(this.ApplyAlways)
        {
            this.setResponsivePosition();
        }

        if(this.m_isResized)
        {
            this.setResponsivePosition();
            this.m_isResized = false;
        }    
    }
}


