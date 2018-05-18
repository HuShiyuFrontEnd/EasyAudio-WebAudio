<template>
    <div class="hello">
        <div :class='{active:active}' @click='play()'>播放一首歌</div>
        <div>当前：{{currentTime}}</div>
        <div>总时长：{{totalTime}}</div>
        <a @click='$router.go(-1);'>返回</a>
    </div>
</template>

<script>
import { EasyPlayer as EasyPlayer ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
// window.Player = Player;
let Player;

export default {
    name: 'LongTest',
    data () {
        return {
            currentTime:'00:00',
            totalTime:'00:00',
            active:false
        }
    },
    methods: {
        play(type){
            //easyaudio最简单的播放方式是singlePlay,直接输入一个url即可进行播放，
            //但是可能大多数情况下，你不一定会喜欢这个，更加有趣的播放方法，请移步playlist的demo
            Player.singlePlay("/static/Mili - Camelia.mp3");
            this.active = true;
        }
    },
    mounted(){
        Player = new EasyPlayer();
        //这里通过修改engine，在解决一些问题上会有些许的不同，默认的为webaudio，可选值还有audio/video
        //webaudio 支持各种功能，播放上对格式的支持可能也是最为全面的，但是，webaudio有两个问题：
        //1.webaudio的使用是基于XHR的读取后进行解码，要求XHR的读取格式（responsetype)为arraybuffer，而这个格式是不支持流的，所以在未来解决这个问题之前，webaudio做不到缓冲播放，对于较长的音频文件（几十M的），会有毁灭性的体验，，除非你们使用websocket推送流，否则长音频不推荐webaudio
        //2.虽然已经是现代了，但是这个技术在某些细节上可能会在某些平台上有支持问题，（极少），如遇碰到，请联系作者（894416038@qq.com)
        //audio 最常见的最简单最稳定的方案，但是，也会有一些问题，例如AAC格式、M4A格式在某些浏览器上无法缓冲播放的问题（例如安卓的QQ浏览器）
        //video 这个谜一样的解决方案，其实仔细一想完全是在理的，video的解码，音画相对是独立的，而声音部分则类似于audio，但是由于视频常用的音频格式和audio不太相同（猜测的），AAC、M4A格式的音频在那些无法缓冲播放的安卓浏览器上，可以正常的缓冲播放。但是这个方案需要注意的是，IOS上video必须在屏幕中呈现（如果你隐藏到屏幕外，开始后强制全屏，如果你想缩小或者遮挡，则会被隐藏或层级置顶，总之IOS中不要使用video方案）
        Player._engine = 'audio';
        //easyaudio内实现了一个 发布/订阅模式 的消息管理，这里是简单的注册了一个progress的接收器，
        //每0.5s，easyaudio内部都会推送给你最新的 current/total 值，分别对应了当前歌曲的当前时间和总时长
        //Util提供了几个简单的小工具，希望可以帮到你，这里的parseTime会将一个时间数字，变成一个00:00格式的时间字符串。
        Message.register('progress',(current, total) => {
            this.currentTime = Util.parseTime(current);
            this.totalTime = Util.parseTime(total);
        })
        //当然，如果你需要使用原生控件？？那么你完全没有必要使用这个，直接想写一个audio标签就好
    },
    //vue单页离开后，并不会自动销毁Player，请将Player暂停
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
</style>
