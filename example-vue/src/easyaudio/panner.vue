<template>
    <div class='audio-main'>
        <div class='one-line-container'>
            <canvas id='analyser_canvas'></canvas>
        </div>
        <!-- <div class='one-line-container'>
            <el-checkbox v-model="checked">使用滤波器</el-checkbox>
        </div> -->
        <div class='one-line-container'>
            <el-row :gutter="20">
                <el-col :span="8" :class='{"active":activegrid==0}'><div @click='activateGrid(0)' class="grid-content bg-purple"></div></el-col>
                <el-col :span="8" :class='{"active":activegrid==1}'><div @click='activateGrid(1)' class="grid-content bg-purple-light"></div></el-col>
                <el-col :span="8" :class='{"active":activegrid==2}'><div @click='activateGrid(2)' class="grid-content bg-purple"></div></el-col>
            </el-row>
            <el-row :gutter="20">
                <el-col :span="8" :class='{"active":activegrid==3}'><div @click='activateGrid(3)' class="grid-content bg-purple"></div></el-col>
                <el-col :span="8" :class='{"active":activegrid==4}'><div @click='activateGrid(4)' class="grid-content bg-purple-light"></div></el-col>
                <el-col :span="8" :class='{"active":activegrid==5}'><div @click='activateGrid(5)' class="grid-content bg-purple"></div></el-col>
            </el-row>
            <el-row :gutter="20">
                <el-col :span="8" :class='{"active":activegrid==6}'><div @click='activateGrid(6)' class="grid-content bg-purple"></div></el-col>
                <el-col :span="8" :class='{"active":activegrid==7}'><div @click='activateGrid(7)' class="grid-content bg-purple-light">原本位置</div></el-col>
                <el-col :span="8" :class='{"active":activegrid==8}'><div @click='activateGrid(8)' class="grid-content bg-purple"></div></el-col>
            </el-row>
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
let panner;
// window.Message = Message;

export default {
    data() {
        return {
            activegrid:7
        }
    },
    components:{
    },
    watch:{
        activegrid(val){
            if(!panner)
                return false;
            console.log([(1 - val%3)*3 ,0 ,2 - Math.floor(val/3)])
            panner.setPosition([(1 - val%3)*3 ,0 ,2 - Math.floor(val/3)]);
        }
    },
    mounted(){
        Player = new EasyPlayer();
            console.log(Player)
        Player.singlePlay('/static/根小八 - 天下怎如你.mp3');
        Player.extend(Analyser);

        Message.once('sourcecreate',(duration) => {
            let canvas = document.getElementById('analyser_canvas');
            Player.initCanvas(canvas);
            panner = Player.activePanner();
            console.log(panner)

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
        Player.clearAnalyser();
        Player = null;
    },
    methods:{
        handleClick(tab, event) {
            console.log(tab, event);
        },
        activateGrid(index){
            console.log(index)
            this.activegrid = index;
        }
    }
}
</script>

<style lang='scss'>
    @import "../assets/public.scss";

    .one-line-container{width:100%;box-sizing:border-box;padding:0 30px;}
    .el-slider{width:80%;margin-left:10%;}
    .el-row{margin-bottom: 20px;}
    .grid-content{height:80px;line-height:80px;color:#fff;background-color:#a0d3ff;border-radius:10px;}
    .active>.grid-content{background-color:#409eff;}

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
