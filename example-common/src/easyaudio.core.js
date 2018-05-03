//常量
    const DEFAULT_TRANSITION={
        type:'default',
        time:0,
    },
    ANALYSER_INDEX=0,
    FILTER_INDEX=1,
    PROGRESS_INDEX=2,
    GAIN_INDEX=3;
//工具函数
    //函数异步处理
    function Thenfail(func){
        let thenfunc=function(){};
        let catchfunc=function(){};
        function resolve(data){
            thenfunc(data);
        }
        function reject(err){
            catchfunc(err);
        }
        func(resolve,reject);
        return {
            then:function(func1){
                if(func1)
                    thenfunc=func1;
                return this;
            },
            catch:function(func2){
                if(func2)
                    catchfunc=func2;
                return this;
            }
        }
    }
    //float to time string
    function floatToString(time){
        let int = Math.floor(time);
        return `${(Math.floor(int/60)+'').padStart(2,'0')}:${(int%60+'').padStart(2,'0')}`;
    }
    //用min和max来设定一个range来限定val
    function valueInRange(val,min,max){
        if(min&&val<min)
            return min;
        if(max&&val>max)
            return max;
        return val;
    }
    //订阅发布数据模型
    let Subscriber = (function(){
        let list = {},
            history = {},
            count = 0,
            index = {};
        
        //用于取出arguments的从第start开始的参数
        function toArray (list, start) {
            start = start || 0;
            var i = list.length - start;
            var ret = new Array(i);
            while (i--) {
                ret[i] = list[i + start];
            }
            return ret
        }
        return {
            //用于调试时查看订阅情况
            check(){
                console.log(list,history)
            },
            //初始化name的list和history
            create(name){
                if(!list[name]){
                    list[name]=[];
                    history[name]=[];
                }
            },
            //注册一个name的订阅，func为回调，func的参数和publish给出的参数一致，readHistory缺省时为false，设置为true时，可以读取...
            //...注册之前的历史记录
            register(name,func,readHistory){
                this.create(name);
                list[name].push(func);
                if(readHistory){
                    let current = history[name];
                    for(let item of current){
                        try{
                            func.apply(this,item);
                        }catch(e){
                            console.log(e)
                        }
                    }
                }
                count++;
                index[count]={
                    name:name,
                    index:list[name].length-1
                }
                return count;
            },
            //name,auguments
            //发布一条消息，所有订阅了这个name的订阅者都会接受到这条信息
            publish(name){
                this.create(name);
                let current = list[arguments[0]];
                if(!current){
                    console.log(`名为“${name}”的订阅不存在`);
                }
                let params = toArray(arguments, 1);
                for(let item of current){
                    try{
                        item.apply(this,params);
                    }catch(e){
                        console.log(e);
                    }
                }
                history[name].push(params);
            },
            //name,auguments
            //和publish类似，但是新发布的值会覆盖前一个，也就是说，永远只会有一条历史记录
            cover(name){
                this.publish.apply(this,arguments);
                if(history[name].length>1)
                    history[name].unshift();
            },
            //register--register时留下的一个index，指向了其所在的name和index
            //可能还有remove整个name的情况
            remove(register){
                let current = (index[register]);
                list[current.name].splice(current.index,1);
            },
            //清空name下所有记录，
            clearHistory(name){
                history[name]=[];
            }
        }
    })();
//主要
//音频播放、节点组织、内容解析
    function Player(options){
        //对象下一级命名规则，变量、对象加_做区分，函数则直接原名
        let that=this;
        window.AudioContext=window.AudioContext||window.webkitAudioContext;
        if(!window.AudioContext){
            alert('你的浏览器没有对WebAudio API的支持!');
            //有空做下降级
            //兼容性记录，IOS中，似乎缺少对detune的支持，所以后面都直接使用的playbackrate
            return false;
        }
        this._status='stop';
        //基础设施初始化
        this._ctx=new AudioContext();
        this._bufferList={};
        this._source=null;//音源
        this._analyser=null;//分析节点，音频可视化
        this._filter=null;//滤波器，变调
        this._progressScript=null;
        // this._filter=this._ctx.createBiquadFilter();
        this._gain=this._ctx.createGain();//音量调节
        this._destination=this._ctx.destination;//输出，扬声器
        //linklist中没有source，因为sourceNode会经常更换，每次建立连接后，头节点会赋给_chainHead,当你的sourceNode频繁变动时，你并不需要
        //每次都重建连接，将旧的sourceNode解除连接，用新的souceNode连接即可
        this._linklist=[this._analyser,this._filter,this._progressScript,this._gain,this._destination];
        this._chainHead=null;
        //播放list管理
        this._list={
            current:null,
        }
        //一些重要参数的配置
        this._audioParamConfig={
            'volume':{
                transition:DEFAULT_TRANSITION,
                min:0
            },
            'speed':{
                transition:DEFAULT_TRANSITION,
                min:0
            }
        }
        //打开历史，即使先publish，后注册，也可以被接收到
        Subscriber.register('setting',this.setAudioParamValue.bind(this),true);
        //快速使用通道
        this._total=0;
        this._volume=1;
        this._speed=1;
        this._strategy='ONE_PLAY';
        Object.defineProperties(this,{
            'current':{
                get:() => {
                    return this._ctx.currentTime; 
                }
            },
            'volume':{
                get:() => {
                    return this._volume;
                },
                set:(val) => {
                    this._volume=val;
                    Subscriber.cover('setting','volume',valueInRange(val,this._audioParamConfig.volume.min,this._audioParamConfig.volume.max));
                }
            },
            'speed':{
                get:() => {
                    return this._speed;
                },
                set:(val) => {
                    this._speed=val;
                    Subscriber.cover('setting','speed',valueInRange(val,this._audioParamConfig.speed.min,this._audioParamConfig.speed.max));
                }
            },
            'total':{
                get:() => {
                    return this._total;
                },
                set:(val) => {
                    Subscriber.cover('duration',this._source.buffer.duration);
                    this._total=val;
                }
            },
            //progress set val是一个百分比值
            'progress':{
                get:() => {
                    return this._showProgress;
                },
                set:(val) => {
                    if(!this._source)
                        return false;
                    this._showProgress=this.total*val;
                    this._status='progress';
                    this._source.stop();
                }
            }
        });
        //canvas,界面相关
        this._canvas=document.createElement('canvas');//document.getElementById('canvas');
        this._canvasCtx=this._canvas.getContext('2d');
        this.raf==window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||function(callback, element) {
            var start,
                finish;
            window.setTimeout(function(){
                start=+new Date();
                callback(start);
                finish=+new Date();
                self.timeout=1000/60-(finish-start);
            },self.timeout);
        };
        //播放进度计算
        this._progress=0;
        this._showProgress=0;
        this._countstart=0;
        Subscriber.register('countchange',() => {
            
        });
        setInterval(() => {
            if(this._status=='play'){
                this._showProgress+=0.5*this.speed;
                Subscriber.cover('progress',this._showProgress,this.total);
            }
        },500);
        //参数设置
        if(typeof options === 'object'){
            //第三种，注入array,注入一个音乐list
            if(options.slice&&options.length){
                
            }
            //第四种，注入object,注入诸多参数
            else{
                this._audiourl=options.url;
                this.load(options.url,options.index).then(([data,index]) => {
                    if(!this._list.current)
                        this._list.current=index;
                    this._bufferList[index]=data;
                    this.recreateLink();
                    this.createSource(data);
                    this.play();
                    Subscriber.cover('prepared');
                }).catch(err => {
                    console.log(err);
                });
                if(options.onstarted)
                    Subscriber.register('started',options.onstarted);
                if(options.onended)
                    Subscriber.register('ended',options.onended);
            }
        }
        //第一种初始化方法，参数空或者其他，这种更依赖prototype里的方法来处理音频
        else{

        }

    }
//扩展
    //播放
    //delay，多少秒后开始播放，offset，开始播放位置位于音乐多少秒以后，total，一共要播放多长时间
    Player.prototype.play=function(delay,offset){
        if(this._status!='progress')
            Subscriber.cover('started');
        this._source.onended=() => {
                console.log('ended',this._status)
            if(this._status=='progress'){
                this.stop();
                this.createSource(this._bufferList[this._list.current]);
                this.play(0,this._showProgress);
            }else{
                Subscriber.cover('ended');
                this.stop();
                switch(this._strategy){
                    case 'ONE_CIRCLE':
                        this.createSource(this._bufferList[this._list.current]);
                        this.play(0);
                        break;
                    case 'ONE_PLAY':
                        break;
                    case 'LIST_PLAY':
                        break;
                    case 'LIST_CIRCLE':
                        break;
                    case 'LIST_RANDOM':
                        break;
                    case 'LIST_NEW_MORE':
                        break;
                }
            }
        }
        if(this._status=='play')
            return false;
        this._status='play';
        this._countstart=Date.now();
        this._progress=offset||0;
        this._showProgress=offset||0;
        this._source.start(delay||this.currentTime,offset||0);
        this.total=this._source.buffer.duration;
    }
    //停止播放后的逻辑
    Player.prototype.stop=function(replay){
        this._source.disconnect(this._chainHead);
        this._source.stop();
        this._status='stop';
    }
    //详见https://developer.mozilla.org/zh-CN/docs/Web/API/AudioBufferSourceNode，相比<audio>标签，webaudio的source node更像是一次性物品，所以
    //常见测pause和replay应该稍微变换一下思路，重要的应该是缓存buffer，而不是死盯着一个sourcenode不放。
    // Player.prototype.pause=function(){}
    // Player.prototype.replay=function(){}
    //设置一个参数的设定
    Player.prototype.configAudioParam=function(options){
        if(options.length&&options.length>-1){
            for(let item of options){
                this.configAudioParam(item);
            }
        }else{
            this._audioParamConfig[options.name].transition=options.transition!=undefined?options.transition:DEFAULT_TRANSITION;
            this._audioParamConfig[options.name].default=options.default!=undefined?options.default:null;
            this._audioParamConfig[options.name].min=options.min!=undefined?options.min:null;
            this._audioParamConfig[options.name].max=options.max!=undefined?options.max:null;
        }
        //gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    }
    //改变播放参数
    Player.prototype.setAudioParamValue=function(name,value){
        let setting=this._audioParamConfig[name].transition;
        let audioparam=this.getAudioParam(name);
        if(name=='speed'){
            //不推荐对speed做任何transition，会出现奇怪的声音，并且会影响计时的精度
            let now=Date.now();
            this._progress+=(now-this._countstart)*this.speed/1000;
            this._countstart=now;
        }
        switch(setting.type){
            case 'default':
                audioparam.value=value;
            case 'linear':
                audioparam.linearRampToValueAtTime(value,this.current-(-setting.time));
            case 'exponential':
                audioparam.exponentialRampToValueAtTime(value||0.00001,this.current-(-setting.time));
        }
    }
    //根据名字获取audioParam
    Player.prototype.getAudioParam=function(name){
        switch(name){
            case 'speed':{
                return this._source.playbackRate;
            };break;
            case 'pitch':{

            };break;
            case 'volume':{
                //setValueAtTime
                return this._gain.gain;
            };break;
        }
    }
    //recreate=re + create 重建连接,当然也可用于建立
    //这个link可以理解为一个路由，source（你的音源）/oscillator（振荡器，你自己产生的声音）是开始，destination(扬声器等输出设备)是结束,中间的链接
    //有GainNode（振幅变化，表现为音量控制），AnalyserNode（分析节点，输出声音信息，一般用于音频可视化），DelayNode(用于产生延迟)
    //BiquadFilterNode(滤波器，可以对声音做许多有趣的操作，例如变调)，PannerNode（用于设置音源的位置，比如让声音听起来像是从左边发出的）
    //还有一些用于合并声道、改变波形（可以影响音色）的一些Node，总之，，中间链接的额外Node，是用于对音源做一些有趣的变化的。
    //默认的Link中，只有最简单的Node支持，这些也是绝大多数应用中足够的，即source--gain--destination，
    //其他的一些节点，可以通过扩展的方法来使用，这些拥有扩展的节点，你可以在 _linklist 中看到，用对应的use方法来使用它们
    //而一些没有扩展到的节点，你可以自行定义，并且通过放入 _linklist 后recreateLink来链接节点
    //目前该方法仅支持单线链接，而使用了声道分离合并的应用中，你应该自行做出扩展
    Player.prototype.recreateLink=function(disconnect){
        let first=null;
        let show=[];
        const reducer=(total,current) => {
            if(!total)
                return current;
            else if(current){
                if(!first)
                    first=total;
                if(!disconnect){
                    total.connect(current);
                    show.push(total);
                    show.push(current);
                }
                else{
                    total.disconnect(current);
                    show.push(total);
                    show.push(current);
                }
                return current;
            }else return total;
        }
        this._linklist.reduce(reducer);
        console.log('linklist:',this._linklist);
        this._chainHead=first;
        console.log(disconnect?'disconnect':'connect',show.join('---'));
    }
    //根据输入值的情况可能异步
    Player.prototype.createSource=function(buffer){
        this._source=this._ctx.createBufferSource();
        this._source.buffer=buffer;
        this.speed=this.speed||1;//播放速度
        // this._source.detune.value=detune||0;//解谐，整体提调或者降调
        // this.analysisAudioInfo(buffer);
        if(this._chainHead)
            this._source.connect(this._chainHead);
    }
    //激活不常用的节点
    //filter:
    //  type:highpass/value 高于value的值保留
    //  type:lowpass/value 低于value的值保留
    //  type:bandpass/value 用value和filter.Q的值界定一个范围，用于过滤波
    Player.prototype.activateNode=function(nodeType){
        function unable(node,index){
            return function(){
                this._source.disconnect(this._chainHead);
                this.recreateLink(true);
                node=null;
                this._linklist[index]=null;
                this.recreateLink();
                this._source.connect(this._chainHead);
            }
        }
        let returnnode;
        this._source.disconnect(this._chainHead);
        this.recreateLink(true);
        switch(nodeType){
            case 'filter':{
                this._filter=this._ctx.createBiquadFilter();
                this._linklist[FILTER_INDEX]=this._filter;
                this._filter.unable=unable(this._filter,FILTER_INDEX).bind(this);
                this._filter.setFrequency=((type, value)=>{
                    this._filter.type=type;
                    this._filter.frequency.value=value;
                });
                this._filter.set
                returnnode=this._filter;
            };break;
            case 'analyser':{
                this._analyser=this._ctx.createAnalyser();
                this._linklist[ANALYSER_INDEX]=this._analyser;
                this._analyser.unable=unable(this._analyser,ANALYSER_INDEX).bind(this);
                returnnode=this._analyser;
            };break;
            case 'progress':{
                this._progressScript=this._ctx.createScriptProcessor(4096, 1, 1);
                this._linklist[PROGRESS_INDEX]=this._progressScript;
                this._progressScript.unable=unable(this._progressScript,PROGRESS_INDEX).bind(this);
                returnnode=this._progressScript;
            };break;
        }
        this.recreateLink();
        this._source.connect(this._chainHead);
        return returnnode;
    }
    //加载
    Player.prototype.load=function(url,index){
        let request = new XMLHttpRequest();
        request.open('GET',url,true);
        request.responseType='arraybuffer';
        request.send();

        return new Thenfail((resolve,reject) => {
            request.onload=(() => {
                if(request.readyState==4&&request.status==200){
                    if(request.response.numberOfChannels){
                        resolve([request.response,index]);
                    }else audioBuffer=this._ctx.decodeAudioData(request.response,(decodebuffer => {
                        resolve([decodebuffer,index]);
                    }));
                }
                else reject('error:'+request.status+','+request.statusText);
            });
        })
    }

    export {Player as Player , Subscriber as Subscriber}