import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['src/rules','src/data','src/utils'].flatMap(dir=>readdirSync(path.join(root,dir)).filter(name=>name.endsWith('.ts')).map(name=>`${dir}/${name}`)).sort();
const hash=createHash('sha256');
const chunks=[];
for(const file of files){
  const source=readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
  hash.update(file).update(source);
  const lines=source.split('\n');
  for(let index=0;index<lines.length;index++){
    if(!/^\s*\/\//.test(lines[index]))continue;
    const start=index,block=[];
    while(index<lines.length&&/^\s*\/\//.test(lines[index]))block.push(lines[index++].replace(/^\s*\/\/\s?/,''));
    index--;
    const content=block.join('\n').trim(),tags=[...new Set(content.match(/\b(?:HV|ST|PB|RC|VA)-\d{3}\b/g)??[])];
    // Retained retracted comments are not current retrieval evidence. Mixed
    // historical/current blocks are excluded too; exact decision facts still work.
    if(!tags.length||/SUPERSEDED|\(original\)/i.test(content)||content.length<100)continue;
    chunks.push({id:createHash('sha256').update(file+':'+start+':'+content).digest('hex').slice(0,20),file,line:start+1,tags,content});
  }
}
for(const file of ['web/lib/progression/compute.ts','web/lib/workout/recovery-target.ts','web/lib/workout/prescription.ts','web/lib/workout/target-resolution.ts'])hash.update(file).update(readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'));
const corpus={version:1,revision:hash.digest('hex'),chunks};
const destination=path.join(root,'web/lib/explanations/corpus.json');
const output=JSON.stringify(corpus,null,2)+'\n';
if(process.argv.includes('--check')){
  if(readFileSync(destination,'utf8').replace(/\r\n/g,'\n')!==output)throw new Error('Explanation corpus is stale. Run npm run ai:corpus.');
}else writeFileSync(destination,output);
console.log(`Explanation corpus: ${chunks.length} source blocks, revision ${corpus.revision.slice(0,12)}`);
