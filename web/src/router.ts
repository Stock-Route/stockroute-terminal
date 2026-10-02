import { createRouter, createWebHistory } from 'vue-router'
// 懒加载:echarts 只被 Heartbeat/Stock 两个页面需要,首页不背这个包
import Home from './views/Home.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/heartbeat', component: () => import('./views/Heartbeat.vue') },
    { path: '/stock/:code', component: () => import('./views/Stock.vue') },
    { path: '/sectors', component: () => import('./views/Sectors.vue') },
  ],
})
