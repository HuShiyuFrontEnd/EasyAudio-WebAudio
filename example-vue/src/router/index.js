import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/home/Home'

const demolist = () => import('@/easyaudio/playlist')
const demolongtest = () => import('@/easyaudio/longtest')
const demoquickstart = () => import('@/easyaudio/quickstart')
const demosetparam = () => import('@/easyaudio/setparam')
const demomessage = () => import('@/easyaudio/message')
const demodecibel = () => import('@/easyaudio/decibel')
const demofilter = () => import('@/easyaudio/filter')
const demopanner = () => import('@/easyaudio/panner')

Vue.use(Router)

export default new Router({
  mode:'history',
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/demo/quickstart',
      name: 'DemoQuickStart',
      component: demoquickstart
    },
    {
      path: '/demo/setparam',
      name: 'DemoSetParam',
      component: demosetparam
    },
    {
      path: '/demo/message',
      name: 'DemoMessage',
      component: demomessage
    },
    {
      path: '/demo/decibel',
      name: 'DemoDecibel',
      component: demodecibel
    },
    {
      path: '/demo/longtest',
      name: 'DemoLongTest',
      component: demolongtest
    },
    {
      path: '/demo/filter',
      name: 'DemoFilter',
      component: demofilter
    },
    {
      path: '/demo/panner',
      name: 'DemoPanner',
      component: demopanner
    },
    {
      path: '/demo/playlist',
      name: 'DemoList',
      component: demolist
    },
    {
      path: '/*',
      name: '404',
      component: Home
    },
  ]
})
