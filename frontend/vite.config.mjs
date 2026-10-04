import { defineConfig } from 'vite';
export default defineConfig({server:{headers:{"Referrer-Policy":"strict-origin-when-cross-origin"},port:5173,strictPort:true,proxy:{'/api':process.env.DELUXXX_API_TARGET || 'http://127.0.0.1:8000'}}});
