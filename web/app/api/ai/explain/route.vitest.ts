import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recommendProgression } from '@grit/rules/progressionEngine';
import { decisionEvidence } from '@/lib/explanations/decision';

const createClient=vi.fn();
vi.mock('@/lib/supabase/server',()=>({createClient}));
const input={dayId:'00000000-0000-4000-8000-000000000001',exerciseName:'Row',question:'Why did the weight stay the same?',displayed:{sets:3,repsMin:8,repsMax:12,weight:100,rir:2},setCount:3};
function database({user=true,pro=true,owned=true,target=null,error=false,pushup=false}:{user?:boolean;pro?:boolean;owned?:boolean;target?:unknown;error?:boolean;pushup?:boolean}={}){
  const rows:Record<string,unknown>={
    program_day_targets:target?[{exercise_name:pushup?'Push-Up':input.exerciseName,...target as object}]:[],
    user_profiles:pro ? {experience_level:'intermediate',body_weight:206,role:'pro',subscription_status:'active'} : {experience_level:'intermediate',body_weight:206,role:'free',subscription_status:'canceled'},
    program_exercises:[{exercise_name:pushup?'Push-Up':'Row',muscle_group:pushup?'Chest':'Back',equipment:pushup?'Bodyweight':'Barbell',target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:100,rir:pushup?4:2}],
    workouts:[{id:'w1',completed_at:'2026-09-30',program_day_id:'past-day'}],
    workout_sets:(pushup?[20,20,20,20]:[12,12,10]).map((reps,set_index)=>({workout_id:'w1',exercise_name:pushup?'Push-Up':'Row',weight:pushup?210:100,reps,set_index})),workout_feedback:[],
  };
  return {auth:{getUser:vi.fn(async()=>({data:{user:user?{id:'owner'}:null}}))},from:vi.fn((table:string)=>{
    let selection='';const chain:Record<string,unknown>={};
    chain.select=vi.fn((value:string)=>{selection=value;return chain});
    for(const name of ['eq','is','in','gt','order','limit'])chain[name]=vi.fn(()=>chain);
    const result=()=>({data:table==='program_days'?(selection.includes('!inner')?(owned?{id:input.dayId,program_id:'p',week_number:pushup?1:2,day_number:1,programs:{user_id:'owner',deleted_at:null,total_weeks:6,focus:pushup?'hypertrophy':'general',muscle_priorities:{}}}:null):selection==='id'?{id:'template'}:[{id:'past-day',week_number:1,programs:{total_weeks:6}}]):rows[table],error:error?{message:'failed'}:null});
    chain.maybeSingle=vi.fn(async()=>result());chain.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve(result()).then(resolve);return chain;
  })};
}
async function post(body:unknown=input){const {POST}=await import('./route');return POST(new Request('http://grit.test/api/ai/explain',{method:'POST',body:JSON.stringify(body)}))}
beforeEach(()=>{vi.stubEnv('GRIT_EXPLANATIONS_ENABLED','0');vi.stubEnv('GRIT_EMBEDDING_BASE_URL','');createClient.mockReset()});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
it('rejects unauthenticated reads before querying workout data',async()=>{
  const db=database({user:false});createClient.mockResolvedValue(db);
  expect((await post()).status).toBe(401);expect(db.from).not.toHaveBeenCalled();
});
it('rejects standard free accounts with 403 Forbidden',async()=>{
  const db=database({pro:false});createClient.mockResolvedValue(db);
  expect((await post()).status).toBe(403);
});
it('rejects another account’s day without retrieving targets',async()=>{
  const db=database({owned:false});createClient.mockResolvedValue(db);
  expect((await post()).status).toBe(404);expect(db.from).not.toHaveBeenCalledWith('program_day_targets');
});
it('reconstructs targets from saved inputs when a decision snapshot is missing',async()=>{
  createClient.mockResolvedValue(database());const response=await post(),body=await response.json();
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(body).toMatchObject({mode:'evidence',evidenceStatus:'reconstructed'});
  expect(body.answer).not.toContain('no saved reason');expect(body.sources.find((source:{id:string})=>source.id==='rep-plan').text).toContain('12, 12, 11');
  expect(JSON.stringify(body)).not.toMatch(/src\/rules|\.ts:\d|HV-045|client-supplied|set_index/);
});
it('surfaces database errors without claiming an AI answer',async()=>{
  createClient.mockResolvedValue(database({error:true}));expect((await post()).status).toBe(503);
});
it('reuses authenticated profile inputs without repeating auth or training-profile queries',async()=>{
  const db=database();createClient.mockResolvedValue(db);
  const response=await post();
  expect(response.status).toBe(200);
  expect(db.auth.getUser).toHaveBeenCalledTimes(1);
  expect(db.from.mock.calls.filter(([table])=>table==='user_profiles')).toHaveLength(2);
});
it('keeps recorded evidence available when llama.cpp is down',async()=>{
  const prescription={sets:3,repsMin:8,repsMax:12,rir:2,equipment:'Barbell'};
  const sessions=[{workoutId:'w1',date:'2026-09-30',sets:[{weight:100,reps:12,rir:2},{weight:100,reps:12,rir:2},{weight:100,reps:10,rir:2}]}];
  const context={experienceLevel:'intermediate' as const,isDeload:false,mesoWeek:2,totalMesoWeeks:6,programFocus:'general' as const};
  const rec=recommendProgression(prescription,sessions,context);
  const evidence=decisionEvidence({source:'progression',sourceWorkoutId:'w1',prescription,sessions,context,recommendation:rec,finalTarget:{sets:3,repsMin:8,repsMax:12,weightLbs:100,rir:2}});
  createClient.mockResolvedValue(database({target:{target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:100,rir:2,decision_evidence:evidence}}));
  vi.stubEnv('GRIT_EXPLANATIONS_ENABLED','1');vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  const body=await (await post({...input,question:'How do these records relate to effort?'})).json();expect(body).toMatchObject({mode:'evidence',evidenceStatus:'recorded'});expect(body.notice).toContain('Local AI could not');expect(body.answer).toContain('straight-set prescription');
});
it('rejects malformed question context',async()=>{expect((await post({...input,setCount:-1})).status).toBe(400);expect(createClient).not.toHaveBeenCalled()});

it('explains stale push-up targets using the same current calculation as the workout page',async()=>{
  createClient.mockResolvedValue(database({pushup:true,target:{target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:206,rir:4}}));
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);vi.stubEnv('GRIT_EXPLANATIONS_ENABLED','1');
  const body=await(await post({...input,exerciseName:'Push-Up',question:'Why are these my targets?',displayed:{sets:3,repsMin:8,repsMax:12,weight:206,rir:4},repTargets:[12,12,12]})).json();
  expect(body).toMatchObject({evidenceStatus:'reconstructed',refreshNeeded:true});
  expect(body.answer).toContain('20');expect(body.answer).toContain('Reload');
  expect(body.sources.find((source:{id:string})=>source.id==='rep-plan').text).toContain('Current set targets: 20, 20, 20');
  expect(body.sources.map((source:{id:string})=>source.id)).toEqual(expect.arrayContaining(['sets','reps','weight','effort']));
  expect(body.answer).not.toContain('cannot confirm');expect(fetchMock).not.toHaveBeenCalled();
});
