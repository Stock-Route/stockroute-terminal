import { createRouter, createWebHistory } from 'vue-router'
// 懒加载:Heartbeat 才需要 echarts(约1MB),首页不背这个包
import Home from './views/Home.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/heartbeat', component: () => import('./views/Heartbeat.vue') },
  ],
})
