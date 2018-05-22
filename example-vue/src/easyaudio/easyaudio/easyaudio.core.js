//常量
const DEFAULT_TRANSITION={
    type:'default',
    time:0,
},
ANALYSER_INDEX=4,
FILTER_INDEX=0,
PROGRESS_INDEX=1,
GAIN_INDEX=2,
PANNER_INDEX=3;
//工具函数
//函数异步处理
function Thenfail(func){
    let thenfunc = function(){};
    let catchfunc = function(){};
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
    if(min!=undefined&&val<min)
        return min;
    if(max!=undefined&&val>max)
        return max;
    return val;
}
//整理工具函数集
let AudioUtil = {
    range:valueInRange,
    parseTime:floatToString,
    thenfail:Thenfail
};
//订阅发布数据模型
window.EasySubscriber = (function(){
    let list = {},
        onceList = {},
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
            console.log('list',list);
            console.log('history',history);
            console.log('onceList',onceList);
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
        //这个实现则需要一个新的清单来单独处理这类情况
        once(name,func,readHistory){
            if(!onceList[name]){
                onceList[name]=[];
            }
            if(readHistory){
                let current = history[name];
                if(current === undefined || current.length==0){
                    onceList[name].push(func);
                }else for(let item of current){
                    try{
                        func.apply(this,item);
                    }catch(e){
                        console.log(e)
                    }
                }
            }
            else onceList[name].push(func);
        },
        //name,auguments
        //发布一条消息，所有订阅了这个name的订阅者都会接受到这条信息
        publish(name){
            this.create(name);
            let current = list[arguments[0]];
            let currentOnce = onceList[arguments[0]];
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
            if(currentOnce){
                for(let item of currentOnce){
                    try{
                        item.apply(this,params);
                    }catch(e){
                        console.log(e);
                    }
                }
                onceList[arguments[0]] = [];
            }
            history[name].push(params);
        },
        //name,auguments
        //和publish类似，但是新发布的值会覆盖前一个，也就是说，永远只会有一条历史记录
        cover(name){
            this.publish.apply(this,arguments);
            if(history[name].length>1){
                history[name].shift();
            }
        },
        //register--register时留下的一个index，指向了其所在的name和index
        //可能还有remove整个name的情况
        remove(register){
            let current = (index[register]);
            list[current.name].splice(current.index,1);
        },
        //清空name下所有记录，
        clear(name){
            history[name]=[];
        },
        refreshAll(){
            list = {},
            onceList = {},
            history = {},
            count = 0,
            index = {};
        }
    }
})();
//主要
//音频播放、节点组织、内容解析
function Player(options){
    //对象下一级命名规则，变量、对象加_做区分，函数则直接原名
    let that=this;
    window.AudioContext=window.AudioContext||window.webkitAudioContext;
    this._engine='webaudio';//webaudio|audio(强行降级为h5 audio)|video(使用video解码)
    if(!window.AudioContext){
        console.log('你的浏览器没有对WebAudio API的支持!');
        this._engine='audio';
        //如果有，这个地方可以加一个预警接口，向接口中返回无法调取webaudio的手机的UA信息，从而从用户端做出调整
        //兼容性记录，IOS中，似乎缺少对detune的支持，所以后面都直接使用的playbackrate
        return false;
    }
    this._status='stop';
    //基础设施初始化
    this._ctx=new AudioContext();
    this._bufferList={};
    this._source=null;//音源
    this._analyser=null;//分析节点，音频可视化
    this._filter=null;//滤波器，
    this._panner=null;
    this._progressScript=null;//在信号处理的能力到达一定水平以后，你可以尝试扩展一下，加入这个节点，理论上讲，在不考虑性能问题下，你可以用这个节点做到一般的音频编辑软件的很多功能，降噪、调频等等，，，但是需要好的算法提供支持
    this._gain=this._ctx.createGain();//音量调节
    this._destination=this._ctx.destination;//输出，扬声器
    //linklist中没有source，因为sourceNode会经常更换，每次建立连接后，头节点会赋给_chainHead,当你的sourceNode频繁变动时，你并不需要
    //每次都重建连接，将旧的sourceNode解除连接，用新的souceNode连接即可
    this._linklist=[this._filter,this._progressScript,this._gain,this._panner,this._analyser,this._destination];
    this._chainHead=null;//链接头，用于给音源用于链接，如果以后出现了非单线链接的逻辑，这里的架构需要调整
    //播放list管理
    this._history={
        data:[],
        push(val){
            if(this.data.length>0&&val==this.data[this.data.length-1]){
                return false;
            }
            this.data.push(val);
        },
        pop(){
            this.data.pop();
            return this.data[this.data.length-1];
        }
    };//播放历史记录
    this._audiolist={
        current:null,
        all:[],
        hash:{},
        length:0
    }//音频信息记录
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
    EasySubscriber.register('setting',this.setAudioParamValue.bind(this),true);
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
                EasySubscriber.cover('setting','volume',valueInRange(val,this._audioParamConfig.volume.min,this._audioParamConfig.volume.max));
            }
        },
        'speed':{
            get:() => {
                return this._speed;
            },
            set:(val) => {
                this._speed=val;
                EasySubscriber.cover('setting','speed',valueInRange(val,this._audioParamConfig.speed.min,this._audioParamConfig.speed.max));
            }
        },
        'total':{
            get:() => {
                return this._total;
            },
            set:(val) => {
                EasySubscriber.cover('duration',val);
                this._total=val;
            }
        },
        'progress':{
            get:() => {
                return this._showProgress;
            },
            set:(val) => {
                let progresstime = valueInRange(val,0,Math.floor(this.total));
                if(this._engine == 'webaudio'){
                    if(!this._source)
                        return false;
                    this._showProgress = progresstime;
                    this._status='progress';
                    this._source.stop();
                }else{
                    this._showProgress = progresstime;
                    this._progress = progresstime;
                    this._countstart = Date.now();
                    this._source.mediaElement.currentTime=progresstime;
                    this._source.mediaElement.play();
                }
            }
        }
    });
    //canvas,界面相关
    this._canvas=null;//document.getElementById('canvas');
    this._canvasCtx=null
    this.raf==null;
    //播放进度计算
    this._progress=0;
    this._showProgress=0;
    this._countstart=0;
    // EasySubscriber.register('countchange',() => {
        
    // });
    this._progressInterval=setInterval(() => {
        if(!this._source)
            return false;
        if(this._engine=='webaudio'){
            if(this._status!='play')
                return false;
            this._showProgress-= (-0.5*this.speed);
            EasySubscriber.cover('progress',this._showProgress,this.total);
        }else{
            this._showProgress=this._source.mediaElement.currentTime;
            EasySubscriber.cover('progress',this._showProgress,this.total);
        }
    },500);
    //参数设置
    if(typeof options === 'object'){
        //第三种，注入array,注入一个音乐list
        if(options.slice&&options.length){
            
        }
        //第四种，注入object,注入诸多参数
        else{
            this.addList(options);
            // if(options.onstarted)
            //     EasySubscriber.register('started',options.onstarted);
            // if(options.onended)
            //     EasySubscriber.register('ended',options.onended);
        }
    }
    //第一种初始化方法，参数空或者其他，这种更依赖prototype里的方法来处理音频
    else{

    }

}
//扩展
//播放基础方法
//选择要播放的音乐
Player.prototype.choose = function(index,notplay){
    let setting=this._audiolist.all[index];
    this.recreateLink();
    this._history.push(index);
    this._audiolist.current=index;
    // console.log(setting)
    if(this._engine=='webaudio'){
        if(this._source && this._status == 'play')
            this.stop();
        EasySubscriber.once('loaded'+index,() => {
            this.createSource(this._bufferList[index]);
            if(!notplay)
                this.play();
        },true);
    }else{
        if(!this._source){
            let mediaElement = document.createElement(this._engine);
            mediaElement.src = setting.url;
            mediaElement.autoplay=false;
            mediaElement.preload='auto';
            mediaElement.crossOrigin="anonymous";
            // mediaElement.setAttribute('x5-video-player-type',"h5");
            // mediaElement.setAttribute('x5-video-player-fullscreen',"true");
            mediaElement.setAttribute('x5-playsinline',true);
            mediaElement.setAttribute('webkit-playsinline',true);
            mediaElement.setAttribute('playsinline',true);
            mediaElement.style.position='abosulte';
            mediaElement.style.left=0;
            mediaElement.style.top=0;
            // document.body.appendChild(mediaElement);
            
            mediaElement.ondurationchange=() =>{
                this.total=mediaElement.duration;
                EasySubscriber.cover('srcloaded',mediaElement.duration);
            }
            mediaElement.onended=() => {
                EasySubscriber.cover('srcended',mediaElement);
                switch(this._strategy){
                    case 'ONE_CIRCLE':
                        this.choose(this._audiolist.current);
                        break;
                    case 'ONE_PLAY':
                        break;
                    case 'LIST_PLAY':
                        this.next();
                        break;
                    case 'LIST_CIRCLE':
                        this.next(true);
                        break;
                    case 'LIST_RANDOM':
                        this.random();
                        break;
                    case 'LIST_NEW_MORE':
                        break;
                }
            }
            this._source = this._ctx.createMediaElementSource(mediaElement);
            // this._source.mediaElement = mediaElement;
            // this.recreateLink();
            this._source.connect(this._chainHead);
            // this._source={
            //     mediaElement:mediaElement
            // }
        }else{
            this._source.mediaElement.src=setting.url;
        }
        this.progress=0;
        if(!notplay)
            this._source.mediaElement.play();
        else this._source.mediaElement.pause();
    }
    EasySubscriber.cover('choose',index);
}
//播放
//delay，多少秒后开始播放，offset，开始播放位置位于音乐多少秒以后，total，一共要播放多长时间
//不过好像很少用参数。。。
Player.prototype.play = function(delay,offset){
    if(!this._source){
        EasySubscriber.cover('loading');
        return false
    }
    if(this._status!='progress')
        EasySubscriber.cover('started');
    if(this._engine=='webaudio')
        this._source.onended=() => {
            // console.log('ended',this._status)
            if(this._status=='progress'){
                this.stop();
                this.createSource(this._bufferList[this._audiolist.current]);
                this.play(0,this._showProgress);
            }else{
                EasySubscriber.cover('ended');
                this.stop();
                switch(this._strategy){
                    case 'ONE_CIRCLE':
                        this.choose(this._audiolist.current);
                        break;
                    case 'ONE_PLAY':
                        break;
                    case 'LIST_PLAY':
                        this.next();
                        break;
                    case 'LIST_CIRCLE':
                        this.next(true);
                        break;
                    case 'LIST_RANDOM':
                        this.random();
                        break;
                    case 'LIST_NEW_MORE':
                        break;
                }
            }
        }
    else{

    }
    if(this._status=='play')
        return false;
    this._status='play';
    this._countstart=Date.now();
    this._progress=offset||0;
    this._showProgress=offset||0;
    if(this._engine=='webaudio'){
        this._source.start(delay||this.currentTime,offset||0);
        this.total=this._source.buffer.duration;
    }else{
        this.total=this._source.mediaElement.duration;
        this._source.mediaElement.play();
    }
}
//暂停
Player.prototype.pause = function(){
    this._progress+=Date.now()-this._countstart;
    this._status='pause';
    if(this._engine=='webaudio'){
        this.speed=0;
    }else{
        this._source.mediaElement.pause();
    }
}
//继续
Player.prototype.resume = function(){
    if(this._engine=='webaudio'){
        if(this._status=='stop')
            this.play(this._audiolist.current);
        else{
            this._countstart=Date.now();
            this._status='play';
            // this.speed=1;
        }
    }else{
        this._countstart=Date.now();
        this._status='play';
        this._source.mediaElement.play();
    }
}
//停止播放后的逻辑
Player.prototype.stop = function(replay){
    if(!this._source||this._status=='stop')
        return false;
    if(this._engine=='webaudio'){
        this._source.disconnect(this._chainHead);
        this._source.stop();
    }else{
        this._source.mediaElement.pause();
    }
    this._status='stop';
}
//详见https://developer.mozilla.org/zh-CN/docs/Web/API/AudioBufferSourceNode，相比<audio>标签，webaudio的source node更像是一次性物品，所以
//常见测pause和replay应该稍微变换一下思路，重要的应该是缓存buffer，而不是死盯着一个sourcenode不放。
// Player.prototype.pause = function(){}
// Player.prototype.replay = function(){}
//设置一个参数的设定
Player.prototype.configAudioParam = function(options){
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
Player.prototype.setAudioParamValue = function(name,value){
    if(!this._source)
        return false;
    let setting = this._audioParamConfig[name].transition;
    let audioparam = this.getAudioParam(name);
    if(name == 'speed'){
        //不推荐对speed做任何transition，会出现奇怪的声音，并且会影响计时的精度
        let now = Date.now();
        this._progress += (now - this._countstart) * this.speed / 1000;
        this._countstart = now;
        if(!audioparam){
            this._source.mediaElement.playbackRate = value;
            return false;
        }
    }
    switch(setting.type){
        case 'default':
            audioparam.value=value;
        case 'linear':
            audioparam.linearRampToValueAtTime(value,this.current - (-setting.time));
        case 'exponential':
            audioparam.exponentialRampToValueAtTime(value || 0.00001,this.current - (-setting.time));
    }
}
//根据名字获取audioParam
Player.prototype.getAudioParam = function(name){
    switch(name){
        case 'speed':{
            if(this._engine == 'webaudio')
                return this._source.playbackRate;
            else return null;
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
Player.prototype.recreateLink = function(disconnect){
    let first = null;
    let show = [];
    const reducer = (total,current) => {
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
    // console.log('linklist:',this._linklist);
    this._chainHead = first;
    // console.log(disconnect?'disconnect':'connect',show.join('---'));
    // console.log('chainhead',first)
}
//根据输入值的情况可能异步
Player.prototype.createSource = function(buffer){
    if(this._engine != 'webaudio')
        return false;
    EasySubscriber.cover('progress',0,buffer.duration);
    this._source = this._ctx.createBufferSource();
    this._source.buffer=buffer;
    // this.speed=this.speed||1;//播放速度
    // this._source.detune.value=detune||0;//解谐，整体提调或者降调
    // this.analysisAudioInfo(buffer);
    if(this._chainHead)
        this._source.connect(this._chainHead);
    EasySubscriber.cover('sourcecreate',buffer.duration);
}
//加载
Player.prototype.load = function(index){
    let request = new XMLHttpRequest();
    let setting = this._audiolist.all[index]
    let url = setting.url;

    request.open('GET',url,true);
    request.responseType='arraybuffer';
    request.send();

    request.onload=(() => {
        if(request.readyState==4&&request.status==200){
            if(request.response.numberOfChannels){
                this._bufferList[index]=request.response;
                EasySubscriber.cover('loaded'+index);
            }else this._ctx.decodeAudioData(request.response,(decodebuffer => {
                this._bufferList[index]=decodebuffer;
                EasySubscriber.cover('loaded'+index);
            }));
        }
        else reject('error:'+request.status+','+request.statusText);
    });
}
//播放器
//向列表中添加曲目,noload基本用不上，比较推荐添加时预加载
Player.prototype.addList = function(options){
    if(!options.url){
        console.error('给出了没有资源链接的曲目');
        return false;
    }
    let obj={
        url:options.url,
        info:options.info
    }
    let index=this._audiolist.length;
    this._audiolist.all[index]=obj;
    this._audiolist.length++;
    if(!this._bufferList[index]&&this._engine=='webaudio')
        this.load(index);
    return index;
}
//向后播放 circle:如果next不存在，是否播放第一个
Player.prototype.next = function(circle){
    this.stop();
    let index=this._audiolist.current;
    if(index<this._audiolist.length-1){
        index++;
    }else{
        if(circle)
            index=0;
        else return false;
    };
    this.choose(index);
}
//生成一个随机播放的index并且choose它
Player.prototype.random = function(){
    let length=this._audiolist.length-1;
    let random=(Math.random()*length+1)<<0;
    random=random-(-this._audiolist.current);
    if(random>length)
        random=random-length-1;
    this.choose(random);
}
//将时间调至结束，触发自动的切换逻辑
Player.prototype.switchNext = function(){
    this.progress=this.total;
}
//读取上一个历史index并且choose它
Player.prototype.switchPrev = function(){
    if(this._history.data.length<2){
        return false;
    }
    
    this.choose(this._history.pop());
}
//简易用法,播放请自行触发
Player.prototype.singlePlay = function(url){
    let index = this.addList({
        url:url
    })
    this.choose(index);
    return index;
}
//extend其他的插件
Player.prototype.extend = function(obj){
    for(let p in obj){
        if(this[p]){
            console.log(p + 'is in Player');
            continue;
        }
        this[p] = obj[p];
    }
    if(this.init){
        this.init();
        this.init = null;
    }
}
Player.prototype.clear = function(){
    EasySubscriber.refreshAll();
    if(this.clearAnalyser)
        this.clearAnalyser();
    this.stop();
    clearInterval(this._progressInterval);
}
//示例
// let player = new Player();
//导出模块
export { Player as EasyPlayer ,EasySubscriber as EasySubscriber , AudioUtil as EasyUtil}
