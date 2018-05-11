<template>
    <div class="hello">
        <div :class='{active:active}' @click='play()'>播放苏幕遮</div>
        <div>当前：{{currentTime}}</div>
        <div>总时长：{{totalTime}}</div>
        <a @click='$router.go(-1);'>返回</a>
    </div>
</template>

<script>
import { EasyPlayer as Player ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
window.Player = Player;
window.Message = Message;

export default {
    name: 'LongTest',
    data () {
        return {
            currentTime:'00:00',
            totalTime:'00:00',
            active:false,
        }
    },
    methods: {
        play(type){
            Player.singlePlay("/static/祖娅纳惜 - 苏幕遮（Cover 张晓棠）.mp3");
            this.active = true;
        },
    },
    created(){
        Player._strategy = 'ONE_CIRCLE';//音频的播放策略，目前支持的值有:ONE_PLAY 单曲播放 ONE_CIRCLE 

        console.log('--------register&publish-------')
        //这种音频的封装，有许多信息需要进行传递，easyaudio中实现了Subscriber，订阅/发布模式的信息接收和递送。主要的方法有四个 register once publish cover 以及用的很少的两个clear remove
        //register有3个参数[name,func,readHistory],name为订阅的作用域，func为接收到订阅的回调，readHistory为true时，注册即会读取这个域里的历史
        Message.register('messagetest',(msg) => {
            console.log('getmessage 1',msg);
        },false);
        //publish有至少一个参数,[name,[arguments]],register方法里的回调的参数和arguments一一对应
        Message.publish('messagetest','hello');
        //这一条不会读取历史，所以没有触发
        Message.register('messagetest',(msg) => {
            console.log('getmessage 2',msg);
        },false);
        //这一条会读取历史，所以触发
        Message.register('messagetest',(msg) => {
            console.log('getmessage 3',msg);
        },true);
        console.log('--------once-------')
        //once和register非常类似，但是只会触发一次，触发后会被注销
        Message.once('messageoncetest',(arg1,arg2) => {
            console.log('oncetest',arg1,arg2);
        });

        Message.publish('messageoncetest',1,2);
        Message.publish('messageoncetest',3,4);
        console.log('--------cover-------')
        //正常的publish方法，会不断累积历史
        Message.register('messageoncetest',(arg1,arg2) => {
            console.log('covertest',arg1,arg2);
        },true);
        //而用cover代替register的时候，每一个新的记录都会覆盖前一条，cover永远只会保留最新的记录
        //（请不要cover和publish混用在同一个name上）
        Message.cover('messagecovertest','a','b');
        Message.cover('messagecovertest','c','d');
        Message.register('messagecovertest',(arg1,arg2) => {
            console.log('covertest',arg1,arg2);
        },true);
        console.log('--------remove-------')
        //register方法调用后悔返回一个数字，你可以利用那个数字来清除这个register
        let count = Message.register('messageremovetest',(index) => {
            console.log('not remove',index)
        });
        Message.publish('messageremovetest',1);
        Message.remove(count);
        Message.publish('messageremovetest',2);
        //不过那种用一次就注销的，还是直接用once比较方便
        //clear可以用于清楚register的历史
        console.log('--------clear-------')
        Message.clear('messageremovetest');
        Message.register('messageremovetest',(index) => {
            console.log('not remove',index)
        },true);

        //接下来统计一下目前给出的信息，可以按需要自行添加注册
        /*
        type     name      arguments
        cover    setting   type(volume/speed),value  某些设置发生变化的时候
        cover    duration  value                     当音频未开始而duration已获取到的时候会推送
        cover    progress  current,total             当音频在播放时，每半秒会推送一次时间信息
        cover    srcloaded duration                  audio/video模式下，加载完毕
        cover    loaded[index] 无                    webaudio模式下，你输入的加载列表中，索引为index的                                              音频加载完毕
        cover    srcended  无                        audio/video模式下，播放完毕
        cover    ended     无                        webaudio模式下，音频播放完毕
        cover    choose    index                     选择了索引为index的音频
        cover    loading   无                        调用play播放时，音频节点尚未准备好（未加载完）
        cover    started   无                        音频开始播放
        */
        //目前，开发者只对自己需要的事件做出了处理，如果有需要，可以自行添加
        //如果需要帮助，可以联系作者（894416038@qq.com)

        Message.register('progress',(current, total) => {
            this.currentTime = Util.parseTime(current);
            this.totalTime = Util.parseTime(total);
        });
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
    input{
        margin:10px 0;
    }
</style>
