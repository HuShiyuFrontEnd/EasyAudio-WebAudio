//webaudio mode only
const ANALYSER_INDEX=4,
FILTER_INDEX=2,
PROGRESS_INDEX=1,
GAIN_INDEX=0,
PANNER_INDEX=3;

let extend={
    _analyserActive:false,
    _filterActive:false,
    _pannerActive:false,
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
                this.stop();
                this.recreateLink(true);
                node = null;
                this._linklist[index] = null;
                this.recreateLink();
            }
        }
        let returnnode;
        if(this._chainHead&&this._source){
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
                returnnode = this._filter;
            };break;
            case 'analyser':{
                this._analyser = this._ctx.createAnalyser();
                this._linklist[ANALYSER_INDEX] = this._analyser;
                this._analyser.unable = unable(this._analyser, ANALYSER_INDEX).bind(this);
                returnnode = this._analyser;
            };break;
            //暂时不好写出来
            case 'progress':{
                this._progressScript = this._ctx.createScriptProcessor(4096, 1, 1);
                this._linklist[PROGRESS_INDEX] = this._progressScript;
                this._progressScript.unable = unable(this._progressScript,PROGRESS_INDEX).bind(this);
                returnnode = this._progressScript;
            };break;
            case 'panner':{
                this._panner = this._ctx.createPanner();
                this._panner.panningModel = 'HRTF';
                this._panner.distanceModel = 'inverse';
                this._panner.refDistance = 1;
                this._panner.maxDistance = 10000;
                this._panner.rolloffFactor = 1;
                this._panner.coneInnerAngle = 360;
                this._panner.coneOuterAngle = 0;
                this._panner.coneOuterGain = 0;
                if(this._panner.orientationX) {
                    this._panner.orientationX.setValueAtTime(1, this.current);
                    this._panner.orientationY.setValueAtTime(0, this.current);
                    this._panner.orientationZ.setValueAtTime(0, this.current);
                }else{
                    this._panner.setOrientation(1,0,0);
                }

                let listener = this._ctx.listener;
                if(listener.forwardX) {
                    listener.forwardX.setValueAtTime(0, this.current);
                    listener.forwardY.setValueAtTime(0, this.current);
                    listener.forwardZ.setValueAtTime(-1, this.current);
                    listener.upX.setValueAtTime(0, this.current);
                    listener.upY.setValueAtTime(1, this.current);
                    listener.upZ.setValueAtTime(0, this.current);
                }else{
                    listener.setOrientation(0,0,-1,0,1,0);
                }

                if(listener.positionX) {
                    listener.positionX.setValueAtTime(0, this.current);
                    listener.positionY.setValueAtTime(0, this.current);
                    listener.positionZ.setValueAtTime(0, this.current);
                }else{
                    listener.setPosition(0, 0, 0);
                }

                this._linklist[PANNER_INDEX] = this._panner;
                this._panner.unable = unable(this._panner, PANNER_INDEX).bind(this);
                this._panner.setPosition = ([x, y, z]) => {
                    if(this._panner.positionX) {
                        this._panner.positionX.setValueAtTime(x, this.current);
                        this._panner.positionY.setValueAtTime(y, this.current);
                        this._panner.positionZ.setValueAtTime(z, this.current);
                    } else {
                        this._panner.setPosition(xPos,yPos,zPos);
                    }
                }
                returnnode = this._panner;
            };break;
        }
        if(this._chainHead&&this._source){
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
        let analyser = this.activateNode('analyser');
        this._analyserActive = analyser;
        this._lastTime = Date.now();
        this.userBehavior = func;
        this.update();
        return analyser;
    },
    activateFilter(){
        let filter = this.activateNode('filter');
        this._filterActive = filter;
        return filter;
    },
    activePanner(){
        let panner = this.activateNode('panner');
        this._pannerActive = panner;
        return panner;
    },
    //根据已读取的buffer中的某一个，制作一个长度为partNum的list，里面的每一个值都是0.1到1的值，用于绘制分贝图
    //partNum >= 1, int
    //jumprate >= 1, int
    analyseDecibel(index, partNum, jumprate){
        let returnList = [];
        let view = new DataView(this._bufferList[index].getChannelData(0).buffer);
        return this.divideDataInto(view, partNum, jumprate||3);
    },
    //buffer里的原始数据的长度，可以看到：length = samplerate * duration;原始数据为32位有符号浮点数
    //转化成dataview后，应该用同样的取32位的浮点数来计算。
    //某种意义上，我这里并没有计算出真正合理的分贝数，而是简单的依据分成多少块粗暴的进行轮询，
    //但是就我个人认为，提出这个需求的需求方，恐怕也没有真正考虑图像的合理性。
    //正确的做法应该是按照一个音频文件格式的一帧的字节规则，去计算每一帧的振幅来作图，这里就不做实现了（因为不会）
    //另外，为了提升渣机的计算性能，这里还采取了隔段取样的做法。
    divideDataInto(data, num, jumprate){
        //为了提升性能，我们尝试隔段采样
        let time = Date.now();
        //我们认为只有双声道
        let returnData = [];
        let byteLength = data.byteLength / 4 << 0;
        let length = byteLength / num / jumprate << 0;
        let value = 0.0;
        let min;
        let max;
        for(let i = 0, j = 0;i < byteLength;i++,j++){
            if(j == length){
                if(!min) min = value;
                else if(value < min) min = value;
                if(!max) max = value;
                else if(value > max) max = value;
                returnData.push(value);
                value = 0.0;
                j = 0;
                i -= length * (1 - jumprate);
            }
            let floati = data.getFloat32(i);
            if(!floati && floati !== 0)floati = 0;
            value -= -floati;
        }
        returnData = returnData.map((value) => (value - min)/(max - min));
        // console.log(returnData)
        console.log('计算花销（ms）',Date.now()-time);
        return returnData;
    },
    clearAnalyser(){
        let list = ['_analyserActive', '_filterActive', '_pannerActive'];
        for(let i = 0;i<list.length;i++){
            if(this[list[i]]){
                console.log(list[i])
                this[list[i]].unable();
            }
            this[list[i]] = false;
        }
    }
}
export { extend as AnalyserExtension }