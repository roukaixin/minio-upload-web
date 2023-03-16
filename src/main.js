import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Router from './router'
import axios from "axios";
axios.defaults.baseURL = 'http://127.0.0.1:8081';

const app = createApp(App);
app.use(ElementPlus)
app.use(Router)
app.provide('$axios', axios)
app.mount('#app')
