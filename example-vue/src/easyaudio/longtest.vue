<template>
    <div class="hello">
        <div :class='{active:active.aac}' @click='play("aac")'>测试播放AAC</div>
        <div :class='{active:active.m4a}' @click='play("m4a")'>测试播放M4A</div>
        <div>当前：{{currentTime}}</div>
        <div>总时长：{{totalTime}}</div>
        <a @click='$router.go(-1);'>返回</a>
    </div>
</template>

<script>
import { EasyPlayer as Player ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
window.Player = Player;

export default {
    name: 'LongTest',
    data () {
        return {
            currentTime:'00:00',
            totalTime:'00:00',
            active:{
                aac:false,
                m4a:false
            }
        }
    },
    methods: {
        play(type){
            switch(type){
                case 'aac':
                    Player.singlePlay("https://zm-chat-lessons.oss-cn-hangzhou.aliyuncs.com/0000UriTGIQSK5ntg0aAqMo7zt596c36b9/0_20180503061834179.aac");
                    this.active.aac = true;
                    this.active.m4a = false;
                    break;
                case 'm4a':
                    Player.singlePlay("https://zm-chat-lessons.oss-cn-hangzhou.aliyuncs.com/0a2cNYKp8O72YhDp5KOMNUp0Ln5acd7c82/100002886_1_merge_tmp.m4a");
                    this.active.aac = false;
                    this.active.m4a = true;
                    break;
                
            }
        }
    },
    created(){
        let ua=window.navigator.userAgent;
        let is_ios=/iphone|ipod|ipad/ig.test(ua);
        if(is_ios)
            Player._engine = 'audio';
        else Player._engine = 'video';

        Message.register('progress',(current, total) => {
            this.currentTime = Util.parseTime(current);
            this.totalTime = Util.parseTime(total);
        })
    },
    beforeDestroy(){
        Player.stop();
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
