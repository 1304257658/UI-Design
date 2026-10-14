import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'/',build:{rollupOptions:{input:{entry:resolve(import.meta.dirname,'index.html'),study:resolve(import.meta.dirname,'render-study/index.html'),product:resolve(import.meta.dirname,'products/contour-01/index.html')},output:{manualChunks(id){if(id.includes('node_modules/three'))return 'three';}}}}});
