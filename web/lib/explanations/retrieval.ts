import type { SupabaseClient } from '@supabase/supabase-js';
import corpus from './corpus.json';
import { embedQuery } from './local-model';
import type { EvidenceSource } from './types';

export function retrieveBundledRules(question:string,revision:string):EvidenceSource[]{
  if(revision!==corpus.revision)return [];
  const words=[...new Set(question.toLowerCase().match(/[a-z]+|(?:hv|st|rc|va|pb)-\d+/g)??[])].filter(w=>w.length>2);
  return corpus.chunks.map(chunk=>({chunk,score:words.reduce((sum,word)=>sum+(chunk.content.toLowerCase().includes(word)?1:0),0)}))
    .filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.chunk.id.localeCompare(b.chunk.id)).slice(0,4)
    .map(({chunk})=>({id:`rule:${chunk.id}`,label:`${chunk.tags.join(', ')} · ${chunk.file}:${chunk.line}`,text:chunk.content,file:chunk.file,line:chunk.line,tags:chunk.tags}));
}

export async function retrieveRules(db:SupabaseClient,question:string,revision:string,signal?:AbortSignal){
  const fallback=retrieveBundledRules(question,revision);
  if(!process.env.GRIT_EMBEDDING_BASE_URL)return {sources:fallback,notice:null};
  try{
    const embedding=await embedQuery(question,signal);
    if(!embedding)return {sources:fallback,notice:'Semantic retrieval is not configured; source-text retrieval was used.'};
    const {data,error}=await db.rpc('search_training_rules',{p_revision:revision,p_query:question,p_model:embedding.model,p_embedding:JSON.stringify(embedding.vector)});
    if(error||!data?.length)throw new Error('Index unavailable');
    return {sources:data.map((row:{chunk_id:string;content:string;file:string;line:number;tags:string[]})=>({id:`rule:${row.chunk_id}`,label:`${row.tags.join(', ')} · ${row.file}:${row.line}`,text:row.content,file:row.file,line:row.line,tags:row.tags})) as EvidenceSource[],notice:null};
  }catch{
    return {sources:fallback,notice:'Semantic retrieval is unavailable; source-text retrieval was used.'};
  }
}
