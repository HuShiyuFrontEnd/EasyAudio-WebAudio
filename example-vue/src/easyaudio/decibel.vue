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
        Player.singlePlay('/static/祖娅纳惜 - 苏幕遮（Cover 张晓棠）.mp3');
        
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

            let view = new DataView(Player._bufferList[0].getChannelData(0).buffer);
            this.decibelList = this.divideDataInto(view, this.partsNum);
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
        //buffer里的原始数据的长度，可以看到：length = samplerate * duration;原始数据为32位有符号浮点数
        //转化成dataview后，应该用同样的取32位的浮点数来计算。
        //某种意义上，我这里并没有计算出真正合理的分贝数，而是简单的依据分成多少块粗暴的进行轮询，
        //但是就我个人认为，提出这个需求的需求方，恐怕也没有真正考虑图像的合理性。
        //正确的做法应该是按照一个音频文件格式的一帧的字节规则，去计算每一帧的振幅来作图，这里就不做实现了（因为不会）
        //另外，为了提升渣机的计算性能，这里还采取了隔段取样的做法。
        divideDataInto(data, num){
            //为了提升性能，我们尝试隔段采样
            let divide = 3;//假设每3段我们取第一段数据来取样,等于1的时候则不分段
            let time = Date.now();
            //我们认为只有双声道
            let returnData = [];
            let byteLength = data.byteLength / 4 << 0;
            let length = byteLength / num / divide << 0;
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
                    i -= length * (1 - divide);
                }
                let floati = data.getFloat32(i);
                if(!floati && floati !== 0)floati = 0;
                value -= -floati;
            }
            returnData = returnData.map((value) => (value - min)/(max - min));
            // console.log(returnData)
            console.log(Date.now()-time);
            return returnData;
        },
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
