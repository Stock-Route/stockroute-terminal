import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Heartbeat from './views/Heartbeat.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/heartbeat', component: Heartbeat },
  ],
})
