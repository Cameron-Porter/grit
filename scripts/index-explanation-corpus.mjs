import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'web/package.json'));
const {createClient}=require('@supabase/supabase-js');
const corpus=JSON.parse(readFileSync(path.join(root,'web/lib/explanations/corpus.json'),'utf8'));
const {NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key,GRIT_EMBEDDING_BASE_URL:base,GRIT_EMBEDDING_MODEL:model,GRIT_EMBEDDING_API_KEY:embeddingKey}=process.env;
if(!url||!key)throw new Error('Set Supabase URL and server-only service key before indexing.');
if(!base||!model)throw new Error('Set GRIT_EMBEDDING_BASE_URL and GRIT_EMBEDDING_MODEL to a local embedding server.');
const endpoint=new URL(base);
if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error('Invalid embedding endpoint.');
const rows=[];let dimensions;
for(const chunk of corpus.chunks){
  const response=await fetch(`${base.replace(/\/$/,'')}/embeddings`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(60_000),headers:{'content-type':'application/json',...(embeddingKey?{authorization:`Bearer ${embeddingKey}`}:{})},body:JSON.stringify({model,input:chunk.content})});
  if(!response.ok)throw new Error(`Embedding failed for ${chunk.id}; the index has not been changed.`);
  const result=await response.json(),vector=result.data?.[0]?.embedding;
  if(!Array.isArray(vector)||!vector.length||vector.some(n=>typeof n!=='number'||!Number.isFinite(n))||vector.every(n=>n===0))throw new Error('Invalid embedding.');
  dimensions??=vector.length;if(vector.length!==dimensions)throw new Error('Embedding dimensions changed during indexing.');
  rows.push({revision:corpus.revision,chunk_id:chunk.id,file:chunk.file,line:chunk.line,tags:chunk.tags,content:chunk.content,embedding_model:model,embedding:JSON.stringify(vector)});
}
// One database statement: partial embeddings never activate a partial corpus.
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {error}=await db.from('training_rule_chunks').upsert(rows,{onConflict:'revision,chunk_id,embedding_model'});
if(error)throw new Error(`Index upload failed: ${error.message}`);
console.log(`Indexed ${rows.length} rule blocks using ${model} (${dimensions} dimensions), revision ${corpus.revision.slice(0,12)}.`);
