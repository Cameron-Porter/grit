import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient=vi.fn();
vi.mock('@/lib/supabase/server',()=>({createClient}));

const request=(body:unknown)=>new Request('https://grit.test/api/program-exercises/order',{method:'POST',body:JSON.stringify(body)});
const payload={templateDayId:'day-1',exerciseNames:['Curl','Row']};

describe('POST /api/program-exercises/order',()=>{
  beforeEach(()=>vi.resetAllMocks());

  it('requires an authenticated user before reading program data',async()=>{
    createClient.mockResolvedValue({auth:{getUser:vi.fn(async()=>({data:{user:null}}))}});
    const{POST}=await import('./route');const response=await POST(request(payload));
    expect(response.status).toBe(401);
  });

  it('verifies ownership and persists every requested sort position',async()=>{
    const updates:{id:string;sort_order:number}[]=[];
    const from=vi.fn((table:string)=>{
      if(table==='program_days')return{select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn(async()=>({data:{id:'day-1'},error:null}))};
      return{
        select:vi.fn(()=>({eq:vi.fn(()=>({order:vi.fn(async()=>({data:[{id:'row',exercise_name:'Row',sort_order:0},{id:'curl',exercise_name:'Curl',sort_order:1}],error:null}))}))})),
        update:vi.fn((value:{sort_order:number})=>({eq:vi.fn((field:string,id:string)=>({eq:vi.fn(async()=>{updates.push({id,sort_order:value.sort_order});return{error:null}})}))})),
      };
    });
    createClient.mockResolvedValue({auth:{getUser:vi.fn(async()=>({data:{user:{id:'user-1'}}}))},from});
    const{POST}=await import('./route');const response=await POST(request(payload));
    expect(response.status).toBe(200);await expect(response.json()).resolves.toEqual({saved:true});
    expect(updates).toEqual([{id:'curl',sort_order:0},{id:'row',sort_order:1}]);
  });
});
