import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchStripeSubscriptionStatus } from '@/lib/billing/fetch-entitlement-profile';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { ExplanationError, loadExplanationEvidence } from '@/lib/explanations/load';
import { localExplanation } from '@/lib/explanations/local-model';
import { retrieveRules } from '@/lib/explanations/retrieval';
import { presentSources } from '@/lib/explanations/presentation';
import { answerTargetQuestion } from '@/lib/explanations/target-answer';
import { isExplanationRequest, type ExplanationResult } from '@/lib/explanations/types';

export const runtime='nodejs';
export const maxDuration=60;
// Bounds work on a single local model per app process. Not a distributed quota.
const active=new Set<string>();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'cache-control':'private, no-store'}});
export async function POST(request:Request){
  let userId:string|undefined;
  try{
    const raw=await request.text();if(raw.length>8000)return reply({error:'Question is too large.'},413);
    let input:unknown;try{input=JSON.parse(raw)}catch{return reply({error:'Invalid question.'},400)}
    if(!isExplanationRequest(input))return reply({error:'Choose an exercise and enter a valid question.'},400);
    const db=await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return reply({ error: 'Authentication required.' }, 401);
    const [profileResult, stripeStatus] = await Promise.all([
      db.from('user_profiles').select('role,subscription_status,experience_level,body_weight').eq('id',user.id).maybeSingle(),
      fetchStripeSubscriptionStatus(db,user.id),
    ]);
    if(profileResult.error) throw new ExplanationError('Could not verify your membership. Please try again.',503);
    const profile=profileResult.data;
    const entitlementProfile=profile ? {...profile,stripe_subscription_status:stripeStatus} : null;
    if (resolveEntitlement(entitlementProfile) !== 'pro') {
      return reply({ error: 'GRIT Pro or VIP membership required for AI explanations.' }, 403);
    }
    const evidence=await loadExplanationEvidence(db,input,{userId:user.id,profile});
    if(active.has(evidence.userId)||active.size>=2)return reply({error:'Another explanation is running. Try again shortly.'},429);
    userId=evidence.userId;active.add(userId);
    const retrieved=await retrieveRules(db,`${input.question} ${evidence.tags.join(' ')}`,evidence.revision,request.signal);
    // Preserve facts first. Whole rule blocks only; do not truncate exceptions.
    const sources=[...evidence.sources];let size=JSON.stringify(sources).length;
    for(const source of retrieved.sources){if(size+source.text.length>16000)continue;sources.push(source);size+=source.text.length}
    const result:ExplanationResult={answer:evidence.fallback,mode:'evidence',notice:null,evidenceStatus:evidence.evidenceStatus,refreshNeeded:evidence.refreshNeeded,sources,citations:evidence.sources.map(s=>s.id)};
    const factualAnswer=answerTargetQuestion(input.question,sources);
    if(factualAnswer)result.answer=factualAnswer;
    else try{
      const answer=await localExplanation(input.question,sources,request.signal);
      if(answer){result.answer=answer.answer;result.citations=answer.citations;result.mode='local_ai'}
      else result.notice='Showing recorded evidence. Local AI explanations are not enabled.';
    }catch{result.notice='Local AI could not produce a verified answer. Showing the available evidence.'}
    // Always expose the basis of each target, even if the model cites only one.
    result.sources=presentSources(sources,[...new Set([...result.citations,...evidence.sources.map(source=>source.id)])]);
    result.citations=result.sources.map(source=>source.id);
    return reply(result);
  }catch(error){return reply({error:error instanceof ExplanationError?error.message:'Could not load this explanation. Please try again.'},error instanceof ExplanationError?error.status:500)}
  finally{if(userId)active.delete(userId)}
}
