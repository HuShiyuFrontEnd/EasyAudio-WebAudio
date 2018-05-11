//webaudio mode only
const ANALYSER_INDEX=0,
FILTER_INDEX=1,
PROGRESS_INDEX=2,
GAIN_INDEX=3;

let extend={
    _analyserActive:false,
    _lastTime:0,
    init(){
        this.raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback, element) {
            var start,
                finish;
            window.setTimeout(function(){
                start =+ new Date();
                callback(start);
                finish =+ new Date();
                self.timeout = 1000 / 60 - (finish - start);
            },self.timeout);
        };
    },
    //激活不常用的节点
    //filter:
    //  type:highpass/value 高于value的值保留
    //  type:lowpass/value 低于value的值保留
    //  type:bandpass/value 用value和filter.Q的值界定一个范围，用于过滤波
    activateNode(nodeType){
        // if(this._engine != 'webaudio'){
        //     console.error('not in webaudio mode')
        //     return false;
        // }
        function unable(node,index){
            return function(){
                this._source.disconnect(this._chainHead);
                this.recreateLink(true);
                node = null;
                this._linklist[index] = null;
                this.recreateLink();
                this._source.connect(this._chainHead);
            }
        }
        let returnnode;
        if(this._chainHead){
            this._source.disconnect(this._chainHead);
            this.recreateLink(true);
        }
        switch(nodeType){
            case 'filter':{
                this._filter=this._ctx.createBiquadFilter();
                this._linklist[FILTER_INDEX]=this._filter;
                this._filter.unable=unable(this._filter,FILTER_INDEX).bind(this);
                this._filter.setFrequency = ((type, value) => {
                    this._filter.type = type;
                    this._filter.frequency.value = value;
                });
                this._filter.set
                returnnode = this._filter;
            };break;
            case 'analyser':{
                this._analyser = this._ctx.createAnalyser();
                this._linklist[ANALYSER_INDEX] = this._analyser;
                this._analyser.unable = unable(this._analyser, ANALYSER_INDEX).bind(this);
                returnnode = this._analyser;
            };break;
            case 'progress':{
                this._progressScript = this._ctx.createScriptProcessor(4096, 1, 1);
                this._linklist[PROGRESS_INDEX] = this._progressScript;
                this._progressScript.unable = unable(this._progressScript,PROGRESS_INDEX).bind(this);
                returnnode = this._progressScript;
            };break;
        }
        if(this._chainHead){
            this.recreateLink();
            this._source.connect(this._chainHead);
        }
        return returnnode;
    },
    //可以传入一个width，height，也可以传入一个canvas
    initCanvas(width, height){
        if(typeof width == 'object'){
            this._canvas = width;
        }else{
            this._canvas = document.createElement('canvas');
            this._canvas.width = width;
            this._canvas.height = height;
        }
        this._canvasCtx=this._canvas.getContext('2d');
        return this._canvas;
    },
    userBehavior(){},
    update(){
        //时间信息
        let timestamp = Date.now();
        let delt = timestamp - this._lastTime;
        this._lastTime = timestamp;
        //频谱信息
        let frequencySize = this._analyser.frequencyBinCount;//频域信息
        let timeDomainSize = this._analyser.fftSize;//波形信息
        let frequencyData = new Uint8Array(frequencySize);
        let timeDomainData = new Uint8Array(timeDomainSize);
        this._analyser.getByteFrequencyData(frequencyData);
        this._analyser.getByteTimeDomainData(timeDomainData);

        this.userBehavior.call(this, delt, frequencyData, timeDomainData);
        if(this._analyserActive){
            this.raf.call(window,this.update.bind(this));
        }else{
            this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
    },
    activateAnalyser(func){
        this.activateNode('analyser');
        this._analyserActive = true;
        this._lastTime = Date.now();
        this.userBehavior = func;
        this.update();
    },
    
}
export { extend as AnalyserExtension }