/** Preserve original shop assets; derive tight, aspect-correct garden variants from shared metadata. */
import {GARDEN_ITEM_GEOMETRY} from '@aimi/contracts';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../apps/miniapp/public/content/',import.meta.url);
await mkdir(new URL('garden/',root),{recursive:true});
for(const [id,spec] of Object.entries(GARDEN_ITEM_GEOMETRY)) {
 const source=await readFile(new URL(id+'.svg',root),'utf8');
 if(!source.includes('viewBox="0 0 120 110"')) throw Error('SOURCE_GEOMETRY_CHANGED: '+id);
 const output=source.replace('viewBox="0 0 120 110"',`viewBox="${spec.viewBox.join(' ')}"`);
 await writeFile(new URL('garden/'+id+'.svg',root),output);
 console.log(id+': '+spec.viewBox.join(' '));
}
