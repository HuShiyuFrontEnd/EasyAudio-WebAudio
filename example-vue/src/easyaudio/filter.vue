<template>
    <div class='audio-main'>
        <div class='one-line-container'>
            <canvas id='analyser_canvas'></canvas>
        </div>
        <!-- <div class='one-line-container'>
            <el-checkbox v-model="checked">使用滤波器</el-checkbox>
        </div> -->
        <div class='one-line-container'>
            <el-tabs v-model="activeName" @tab-click="handleClick">
                <el-tab-pane label="高频通" name="highpass">
                    高频通
                    <el-slider v-model="value1" height="200px" :format-tooltip="formatTooltip(80)"></el-slider>
                </el-tab-pane>
                <el-tab-pane label="低频通" name="lowpass">
                    低频通
                    <el-slider v-model="value1" height="200px" :format-tooltip="formatTooltip(80)"></el-slider>
                </el-tab-pane>
                <el-tab-pane label="范围" name="bandpass">
                    范围
                    <el-slider v-model="value1" height="200px" :format-tooltip="formatTooltip(40)"></el-slider>
                </el-tab-pane>
            </el-tabs>
        </div>
        <div class='one-line-container'>
            <a @click='$router.go(-1);'>返回</a>
        </div>
        <!--  -->
    </div>
</template>

<script>
import { EasyPlayer as EasyPlayer ,EasySubscriber as Message, EasyUtil as Util } from './easyaudio/easyaudio.core.js';
import { AnalyserExtension as Analyser } from './easyaudio/extension/easeaudio.analyse.js';
import { Checkbox as elCheckbox } from 'element-ui' ;

let Player;
let filter;
// window.Message = Message;

export default {
    data() {
        return {
            checked:true,
            activeName:'highpass',
            value1:0
        }
    },
    components:{
    },
    watch:{
        activeName(val){
            if(!filter)
                return false;
            let value = 0;
            switch(this.activeName){
                case 'lowpass':
                    value = this.value1*80;
                    break;
                case 'highpass':
                    value = this.value1*80;
                    break;
                case 'bandpass':
                    value = this.value1*40;
                    break;
            }
            filter.setFrequency(val, value);
        },
        value1(val){
            if(!filter)
                return false;
            let value = 0;
            switch(this.activeName){
                case 'lowpass':
                    value = val*80;
                    break;
                case 'highpass':
                    value = val*80;
                    break;
                case 'bandpass':
                    value = val*40;
                    break;
            }
            filter.setFrequency(this.activeName, value);
        }
    },
    mounted(){
        Player = new EasyPlayer();
        Player.singlePlay('/static/根小八 - 天下怎如你.mp3');
        Player.extend(Analyser);

        Message.once('sourcecreate',(duration) => {
            let canvas = document.getElementById('analyser_canvas');
            Player.initCanvas(canvas);
            filter = Player.activateFilter();
            filter.setFrequency('highpass', 0);
            console.log(filter)

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
            });
        })
    },
    beforeDestroy(){
        //vue应用中
        Player.clear();
        Player = null;
    },
    methods:{
        handleClick(tab, event) {
            console.log(tab, event);
        },
        formatTooltip(param){
            return function(val){
                return val * param;
            }
        }
    }
}
</script>

<style lang='scss'>
    @import "../assets/public.scss";

    .one-line-container{width:100%;box-sizing:border-box;padding:0 30px;}
    .el-slider{width:80%;margin-left:10%;}
    #app,.audio-main{
        width:100%;
        height:100%;
        canvas{
            margin-top:20px;
        }
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
