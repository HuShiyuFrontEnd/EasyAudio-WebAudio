<template>
    <div class='audio-main'>
        <div class='audio-header'>Easy Player</div>
        <div class='audio-content'>
            <div class='audio-analyser-container'>
                <canvas id='analyser_canvas'></canvas>
            </div>
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
            decibelList:[],
            current:0,
            partsNum:90
        }
    },
    mounted(){
        Player = new EasyPlayer();
        Player._strategy = 'ONE_CIRCLE';
        window.Player = Player;
        
        Player._engine = 'webaudio';
        let index = Player.singlePlay('/static/祖娅纳惜 - 苏幕遮（Cover 张晓棠）.mp3');
        
        Message.register('progress',(current, duration) => {
            if(current / duration * this.partsNum > this.current){
                Player._canvasCtx.fillStyle = 'rgb(255, 84, 85)';
                let width = Math.floor(Player._canvas.width / this.partsNum)-1;
                let margin = (Player._canvas.width - (width + 1) * this.partsNum)/2 << 0;
                let height = Player._canvas.height;
                let barHeight = this.decibelList[this.current] * height * 0.8;
                Player._canvasCtx.fillRect(margin + (width + 1) * this.current, height / 2 - barHeight / 2, width, barHeight );
                this.current++;
            }
        });

        Message.once('sourcecreate',() => {
            Player.extend(Analyser);
            let canvas=document.getElementById('analyser_canvas');
            Player.initCanvas(canvas);
            Player._canvas.height = 50;

            let bufferCanvas = document.createElement('canvas');
            let bufferCtx = bufferCanvas.getContext('2d');

            this.decibelList = Player.analyseDecibel(index, this.partsNum);
            console.log(this.decibelList)
            bufferCanvas.width = Player._canvas.width * 1;
            bufferCanvas.height = Player._canvas.height * 1;

            let width = Math.floor(bufferCanvas.width / this.partsNum)-1;
            let margin = (bufferCanvas.width - (width + 1) * this.partsNum)/2 << 0;
            let height = bufferCanvas.height;

            for(let i = 0;i < this.partsNum ;i++){
                let barHeight = this.decibelList[i] * height * 0.8;
                bufferCtx.fillStyle = 'rgb(160, 160 ,160)';
                bufferCtx.fillRect(margin + (width + 1) * i, height / 2 - barHeight / 2, width, barHeight );
            }

            Player._canvasCtx.drawImage(bufferCanvas, 0, 0, Player._canvas.width, Player._canvas.height);
            bufferCtx = null;
            bufferCanvas = null;
        })
        
    },
    beforeDestroy(){
        Player.clear();
        Player = null;
    },
    methods:{
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
