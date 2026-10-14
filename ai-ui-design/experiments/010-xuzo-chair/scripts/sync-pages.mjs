import {copyFile} from 'node:fs/promises';
// One content source serves both the homepage and the earlier preview URL.
for(const target of ['index.html','render-study/index.html'])await copyFile(new URL('../company-page.html',import.meta.url),new URL('../'+target,import.meta.url));
