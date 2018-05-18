<template>
    <div class='audio-main'>
        <div class='audio-header'>Easy Player</div>
        <div class='audio-content'>
            <div :key='index' v-for='(item, index) of audiolist' class='audio-item'>
                <div class='audio-item-name' @click='select(index)' :class='{active:item.active}'>{{item.name}}</div>
            </div>
            <div class='audio-analyser-container'>
                <canvas id='analyser_canvas'></canvas>
            </div>
        </div>
        <div class='audio-footer'>
            <div class='audio-footer-time'>
                <div class='audio-current-time'>当前：{{currentTime}}</div>
                <div class='audio-total-time'>总计：{{totalTime}}</div>
            </div>
            <div class='audio-strategy' @click='changeStrategy'>{{strategyList[strategy]}}</div>
            <div class='audio-next' @click='nextOne()'>下一首</div>
            <div class='audio-next' @click='prevOne()'>前一首</div>
        </div>
        <a @click='$router.go(-1);'>返回</a>
    </div>
</template>
  
</template>

<script>
import { EasyPlayer as EasyPlayer ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
import { AnalyserExtension as Analyser } from './easyaudio/extension/easeaudio.analyse.js';
let Player;
// window.Message = Message;

export default {
    data() {
        return {
            currentindex:0,
            audiolist:[],
            current:0,
            total:0,
            currentTime:'00:00',
            totalTime:'00:00',
            currentPercent:'0',
            strategy:'LIST_RANDOM',
            strategyList:{
                'ONE_PLAY':'单曲播放',
                'ONE_CIRCLE':'单曲循环',
                'LIST_PLAY':'列表播放',
                'LIST_CIRCLE':'列表循环',
                'LIST_RANDOM':'随机播放'
            }
        }
    },
    mounted(){
        Player = new EasyPlayer();
        Player._engine = 'audio';
        Player._strategy = this.strategy;

        // if(Player._engine == 'webaudio'){
            Player.extend(Analyser);
            let canvas=document.getElementById('analyser_canvas');
            Player.initCanvas(canvas);
            Player.activateAnalyser(function(delt, frequency, timedomain){
                // let first = 0
                // first ++;
                // if(first == 300)
                //     console.log(timedomain)
                let width = this._canvas.width;
                let height = this._canvas.height;
                let freLength = frequency.length;
                let timeLength = timedomain.length;
                let barWidth = width / freLength;
                let heightRate = height / 300;
                
                this._canvasCtx.clearRect(0, 0, width, height);

                //频域图的绘制
                for(let i = 0;i < freLength;i++){
                    let barHeight = frequency[i] * heightRate;
                    this._canvasCtx.fillStyle = 'rgb(255,'+Math.floor(barHeight/2+50)+','+Math.floor(120-barHeight/2)+')';
                    this._canvasCtx.fillRect(barWidth * i, height / 2 - barHeight / 2, barWidth, barHeight );
                }
                //时域的绘制也类似
                // for(let i = 0;i < timeLength;i++){
                //     let barHeight = (timedomain[i] - 150) * heightRate;
                //     this._canvasCtx.fillStyle = '#C62F2F';
                //     this._canvasCtx.fillRect(barWidth * i, height / 2 - barHeight, barWidth, 2 );
                // }
            })
        // }

        let request = new XMLHttpRequest();
        request.open('GET','/static/list.json',true);
        request.send();
        request.onload = () => {
            if(request.readyState==4&&request.status==200){
                let list = JSON.parse(request.response);
                for(let i=0;i < list.length;i++){
                    this.audiolist.push(list[i])
                    Player.addList({
                        url:list[i].src,
                        info:{
                            name:list[i].name,
                        }
                    });
                }
                Player.choose(0);
            }
        };

        Message.register('progress',(current, total) => {
            this.current = current;
            this.total = total;
            this.refreshTime();
        });
        Message.register('choose',(index) => {
            console.log(index)
            this.audiolist[this.currentindex].active=false;
            this.audiolist[index].active=true;
            this.currentindex=index;
        })
    },
    beforeDestroy(){
        Player.clear();
        Player = null;
    },
    methods:{
        refreshTime(){
            this.currentTime = Util.parseTime(this.current);
            this.totalTime = Util.parseTime(this.total);
        },
        changeStrategy(){
            let list = ['ONE_PLAY','ONE_CIRCLE','LIST_PLAY','LIST_CIRCLE','LIST_RANDOM'];
            let index = list.indexOf(this.strategy);
            let newStrategy;
            if(index == list.length-1)
                newStrategy = list[0];
            else newStrategy = list[++index];
            this.strategy=newStrategy;
            Player._strategy=newStrategy;
        },
        nextOne(){
            Player.switchNext(true);
        },
        prevOne(){
            Player.switchPrev();
        },
        select(index){
            Player.choose(index);
        }
    }
}
</script>

<style lang='scss' scoped>
    @import "../assets/public.scss";

    #app,.audio-main{
        width:100%;
        height:100%;
        .audio-header{
            height:px375(48);
            line-height:px375(48);
            width:100%;
            background-color:#C62F2F;
            color:#fff;
            font-size:px375(20);
            text-align:left;
            text-indent:1em;
        }
        .audio-item{
            height:px375(40);
            line-height:px375(40);
            .audio-item-name{
                font-size:px375(16);
                text-align:left;
                text-indent:1em;
                &.active{
                    color:#C62F2F;
                }
            }
        }
        .audio-analyser-container{
        }
        .audio-footer{
            &>div{
                margin:px375(10) 0;
            }
        }
    }
</style>
