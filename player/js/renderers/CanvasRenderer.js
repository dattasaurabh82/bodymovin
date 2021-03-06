function CanvasRenderer(animationItem, config){
    this.animationItem = animationItem;
    this.renderConfig = config ? config : {
        clearCanvas: true,
        context: null,
        scaleMode: 'fit'
    };
    this.lastFrame = -1;
    this.globalData = {
        frameNum: -1
    };
    this.contextData = {
        saved : new Array(15),
        savedOp: new Array(15),
        cArrPos : 0,
        cTr : new Matrix(),
        cO : 1
    };
    var i, len = 15;
    for(i=0;i<len;i+=1){
        this.contextData.saved[i] = new Array(6);
    }
    this.elements = [];
}

CanvasRenderer.prototype.buildItems = function(layers,elements){
    if(!elements){
        elements = this.elements;
    }
    var count = 0, i, len = layers.length;
    for (i = 0; i < len; i++) {
        if (layers[i].ty == 'StillLayer') {
            count++;
            elements.push(this.createImage(layers[i]));
        } else if (layers[i].ty == 'PreCompLayer') {
            elements.push(this.createComp(layers[i]));
            var elems = [];
            this.buildItems(layers[i].layers,elems);
            elements[elements.length - 1].setElements(elems);
        } else if (layers[i].ty == 'SolidLayer') {
            elements.push(this.createSolid(layers[i]));
        } else if (layers[i].ty == 'ShapeLayer') {
            elements.push(this.createShape(layers[i]));
        } else if (layers[i].ty == 'TextLayer') {
            elements.push(this.createText(layers[i]));
        }else{
            elements.push(this.createBase(layers[i]));
            //console.log('NO TYPE: ',layers[i]);
        }
    }
};

CanvasRenderer.prototype.createBase = function (data) {
    return new CVBaseElement(data, this.globalData);
};

CanvasRenderer.prototype.createShape = function (data) {
    return new CVShapeElement(data, this.globalData);
};

CanvasRenderer.prototype.createText = function (data) {
    return new CVTextElement(data, this.globalData);
};

CanvasRenderer.prototype.createImage = function (data) {
    return new CVImageElement(data, this.globalData);
};

CanvasRenderer.prototype.createComp = function (data) {
    return new CVCompElement(data, this.globalData);
};

CanvasRenderer.prototype.createSolid = function (data) {
    return new CVSolidElement(data, this.globalData);
};

CanvasRenderer.prototype.ctxTransform = function(props){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.transform(props[0],props[1],props[2],props[3],props[4],props[5]);
        return;
    }
    this.contextData.cTr.transform(props[0],props[1],props[2],props[3],props[4],props[5]);
    var trProps = this.contextData.cTr.props;
    this.canvasContext.setTransform(trProps[0],trProps[1],trProps[2],trProps[3],trProps[4],trProps[5]);
    ///this.canvasContext.transform(props[0],props[1],props[2],props[3],props[4],props[5]);
};

CanvasRenderer.prototype.ctxOpacity = function(op){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.globalAlpha *= op < 0 ? 0 : op;
        return;
    }
    this.contextData.cO *= op < 0 ? 0 : op;
     this.canvasContext.globalAlpha = this.contextData.cO;
    ///this.canvasContext.globalAlpha = this.canvasContext.globalAlpha * op;
};

CanvasRenderer.prototype.reset = function(){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.restore();
        return;
    }
    this.contextData.cArrPos = 0;
    this.contextData.cTr.reset();
    this.contextData.cO = 1;
};

CanvasRenderer.prototype.save = function(actionFlag){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.save();
        return;
    }
    if(actionFlag){
        this.canvasContext.save();
    }
    var props = this.contextData.cTr.props;
    if(this.contextData.saved[this.contextData.cArrPos] === null || this.contextData.saved[this.contextData.cArrPos] === undefined){
        this.contextData.saved[this.contextData.cArrPos] = new Array(6);
    }
    var i, len = 6,arr = this.contextData.saved[this.contextData.cArrPos];
    for(i=0;i<len;i+=1){
        arr[i] = props[i];
    }
    this.contextData.savedOp[this.contextData.cArrPos] = this.contextData.cO;
    this.contextData.cArrPos += 1;
};

CanvasRenderer.prototype.restore = function(actionFlag){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.restore();
        return;
    }
    if(actionFlag){
        this.canvasContext.restore();
    }
    this.contextData.cArrPos -= 1;
    var popped = this.contextData.saved[this.contextData.cArrPos];
    var i, len = 6,arr = this.contextData.cTr.props;
    for(i=0;i<len;i+=1){
        arr[i] = popped[i];
    }
    this.canvasContext.setTransform(popped[0],popped[1],popped[2],popped[3],popped[4],popped[5]);
    popped = this.contextData.savedOp[this.contextData.cArrPos];
    this.contextData.cO = popped;
    this.canvasContext.globalAlpha = popped;
};

CanvasRenderer.prototype.configAnimation = function(animData){
    if(this.animationItem.wrapper){
        this.animationItem.container = document.createElement('canvas');
        this.animationItem.container.style.width = '100%';
        this.animationItem.container.style.height = '100%';
        this.animationItem.container.style.transformOrigin = this.animationItem.container.style.mozTransformOrigin = this.animationItem.container.style.webkitTransformOrigin = this.animationItem.container.style['-webkit-transform'] = "0px 0px 0px";
        this.animationItem.wrapper.appendChild(this.animationItem.container);
        this.canvasContext = this.animationItem.container.getContext('2d');
    }else{
        this.canvasContext = this.renderConfig.context;
    }
    this.globalData.canvasContext = this.canvasContext;
    this.globalData.bmCtx = new BM_CanvasRenderingContext2D(this);
    this.globalData.renderer = this;
    this.globalData.totalFrames = Math.floor(animData.animation.totalFrames);
    this.globalData.compWidth = animData.animation.compWidth;
    this.globalData.compHeight = animData.animation.compHeight;
    this.layers = animData.animation.layers;
    this.transformCanvas = {};
    this.transformCanvas.w = animData.animation.compWidth;
    this.transformCanvas.h = animData.animation.compHeight;
    this.updateContainerSize();
};

CanvasRenderer.prototype.updateContainerSize = function () {
    var elementWidth,elementHeight;
    if(this.animationItem.wrapper && this.animationItem.container){
        elementWidth = this.animationItem.wrapper.offsetWidth;
        elementHeight = this.animationItem.wrapper.offsetHeight;
        this.animationItem.container.setAttribute('width',elementWidth);
        this.animationItem.container.setAttribute('height',elementHeight);
    }else{
        elementWidth = this.canvasContext.canvas.width;
        elementHeight = this.canvasContext.canvas.height;
    }
    if(this.renderConfig.scaleMode == 'fit'){
        var elementRel = elementWidth/elementHeight;
        var animationRel = this.transformCanvas.w/this.transformCanvas.h;
        if(animationRel>elementRel){
            this.transformCanvas.sx = elementWidth/this.transformCanvas.w;
            this.transformCanvas.sy = elementWidth/this.transformCanvas.w;
            this.transformCanvas.tx = 0;
            this.transformCanvas.ty = (elementHeight-this.transformCanvas.h*(elementWidth/this.transformCanvas.w))/2;
        }else{
            this.transformCanvas.sx = elementHeight/this.transformCanvas.h;
            this.transformCanvas.sy = elementHeight/this.transformCanvas.h;
            this.transformCanvas.tx = (elementWidth-this.transformCanvas.w*(elementHeight/this.transformCanvas.h))/2;
            this.transformCanvas.ty = 0;
        }
    }else{
        this.transformCanvas.sx = 1;
        this.transformCanvas.sy = 1;
        this.transformCanvas.tx = 0;
        this.transformCanvas.ty = 0;
    }
    this.transformCanvas.props = [this.transformCanvas.sx,0,0,this.transformCanvas.sy,this.transformCanvas.tx,this.transformCanvas.ty];
    this.clipper = new BM_Path2D();
    this.clipper.rect(0,0,this.transformCanvas.w,this.transformCanvas.h);
};

CanvasRenderer.prototype.buildStage = function (container, layers, elements) {
    if(!elements){
        elements = this.elements;
    }
    var i, len = layers.length, layerData;
    for (i = len - 1; i >= 0; i--) {
        layerData = layers[i];
        if (layerData.parent !== undefined) {
            this.buildItemHierarchy(layerData,elements[i], layers, layerData.parent,elements);
        }
        if (layerData.ty == 'PreCompLayer') {
            this.buildStage(null, layerData.layers, elements[i].getElements());
        }
    }
};

CanvasRenderer.prototype.buildItemHierarchy = function (data,element, layers, parentName,elements) {
    var i=0, len = layers.length;
    while(i<len){
        if(layers[i].ind === parentName){
            element.getHierarchy().push(elements[i]);
            if (layers[i].parent !== undefined) {
                this.buildItemHierarchy(data,element, layers, layers[i].parent,elements);
            }
        }
        i += 1;
    }
};

CanvasRenderer.prototype.prepareFrame = function(num){
    if(this.destroyed) {
        return;
    }
    var i, len = this.elements.length;
    for (i = 0; i < len; i++) {
        this.elements[i].prepareFrame(num - this.layers[i].startTime);
    }
};

CanvasRenderer.prototype.draw = function(){
    var i, len = this.layers.length;
    for (i = len - 1; i >= 0; i-=1) {
        this.elements[i].draw();
    }
};

CanvasRenderer.prototype.destroy = function () {
    if(this.renderConfig.clearCanvas) {
        this.animationItem.wrapper.innerHTML = '';
    }
    var i, len = this.layers.length;
    for (i = len - 1; i >= 0; i-=1) {
        this.elements[i].destroy();
    }
    this.elements.length = 0;
    this.globalData.bmCtx = null;
    this.globalData.canvasContext = null;
    this.animationItem.container = null;
    this.destroyed = true;
};

CanvasRenderer.prototype.renderFrame = function(num){
    if((this.lastFrame == num && this.renderConfig.clearCanvas === true) || this.destroyed){
        return;
    }
    this.lastFrame = num;
    this.globalData.frameNum = num - this.animationItem.firstFrame;
    if(this.renderConfig.clearCanvas === true){
        this.reset();
        this.canvasContext.canvas.width = this.canvasContext.canvas.width;
    }else{
        this.save();
    }
    this.ctxTransform(this.transformCanvas.props);
    this.globalData.bmCtx.clip(this.clipper);
    this.prepareFrame(num);
    this.draw();
    if(this.renderConfig.clearCanvas !== true){
        this.restore();
    }
};