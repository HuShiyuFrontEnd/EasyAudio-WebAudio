<template>
    <div class="hello">
        <div :class='{active:active}' @click='play()'>播放苏幕遮</div>
        <div>当前：{{currentTime}}</div>
        <div>总时长：{{totalTime}}</div>
        <div>当前音量:{{volume}}</div>
        <div @click='move(5)'>进度+5s</div>
        <div @click='move(-5)'>进度-5s</div>
        进度修改：<input v-model=current /><br>
        音量修改：<input v-model=volume /><br>
        速度修改：<input v-model=speed /><br>
        <a @click='$router.go(-1);'>返回</a>
    </div>
</template>

<script>
import { EasyPlayer as EasyPlayer ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
let Player;

export default {
    name: 'LongTest',
    data () {
        return {
            current:0,
            currentTime:'00:00',
            totalTime:'00:00',
            active:false,
            volume:1,
            speed:1,
        }
    },
    methods: {
        play(type){
        },
        move(num){
            //Player.progress 在赋值后会被加上安全处理，使其值处于0和total之间
            Player.progress = Player.progress - (-num);
        }
    },
    watch:{
        current(val){
            Player.progress = val;
        },
        speed(val){
            //大于等于0
            Player.speed = val;
        },
        volume(val){
            Player.volume = val;
        }
    },
    mounted(){
        Player = new EasyPlayer();
        //easyaudio将一些参数进行了封装管理，最后用最简单的方式暴露了出来，包括：
        //easyaudio的Player对象下的参数，带_的一般是参数/对象，而没有的往往是方法
        //以下是推荐用户拿出来使用的
        Player.singlePlay("/static/祖娅纳惜 - 苏幕遮（Cover 张晓棠）.mp3");
        this.active = true;
        console.log(Player._audiolist);//查看目前的所有音频的信息
        Player._strategy = 'ONE_CIRCLE';//音频的播放策略，目前支持的值有:ONE_PLAY 单曲播放 ONE_CIRCLE 单曲循环 LIST_PLAY 顺序播放 LIST_CIRCLE 列表循环 LIST_RANDOM 随机播放
        console.log(Player.volume);
        Player.volume = 1;//Player.volume是一个设置过getter/setter的方法
        //声音设置的渐变，如果你需要设置一个声音的渐变，可以用下面的方法：
        Player.configAudioParam({
            name:'volume',
            transition:{
                type:'exponential',//渐变的类型 default 没有 linear 线性 exponential 指数
                time:2,//渐变所花时间
            },
            min:0,//可以设置音量下限，最低不低于0
            max:3 //可以设置音量上限
        });
        //playrate 和 detune在效果上是类似的，不过设置值的方法不太相同，前者是强调倍数，后者是改变值。
        //detune在IOS上会有点问题，这里使用的都是playrate
        //无论playrate还是detune，都有一个共同的问题，这种加速的方法，是在提高音频波形移动速度的前提下的，所以其实在人生下，会明显感到音色发生了变化（声音的频率提升造成的）
        //那么问题来了，有没有提高播放速度而频率感觉不变的加速方法呢？肯定是有的。但是并不好写，如果你熟知信号处理的知识，你可以自己完成 变速不变调 的处理算法
        //提供一个参考，
        //https://github.com/urtzurd/html-audio
        Player.speed = 1;

        Message.register('progress',(current, total) => {
            this.currentTime = Util.parseTime(current);
            this.totalTime = Util.parseTime(total);
        });
        //监听一些属性的变化,volume,speed
        Message.register('setting',(type,value) => {
            switch(type){
                case 'volume':this.volume = value;break;
                case 'speed':this.speed = value;break;
            }
        });
    },
    beforeDestroy(){
        Player.clear();
        Player = null;
    },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .hello{
        margin-top:100px;
    }
    .hello>div{
        font-size:18px;
        margin:20px 0;
    }
    .active{
        color:#ff5455;
    }
    input{
        margin:10px 0;
    }
</style>
