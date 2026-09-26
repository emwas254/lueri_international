import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"");
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"GET,OPTIONS"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json"}});}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:CORS});
 if(req.method!=="GET")return json({error:"Method not allowed"},405);
 const url=new URL(req.url);
 const ref=(url.searchParams.get("reference")??"").trim();
 if(!/^LR-DEL-\d{10,}-[A-Za-z0-9]{8}$/.test(ref))return json({error:"Invalid booking reference"},400);
 const {data,error}=await db.from("payments").select("internal_reference,status,amount,currency,completed_at,booking_id,reconciliation_status,payment_method").eq("internal_reference",ref).eq("payment_method","ncba_till").maybeSingle();
 if(error)return json({error:"Unable to check payment status"},500);
 if(!data)return json({error:"Payment reference not found"},404);
 return json({reference:data.internal_reference,status:data.status,amount:data.amount,currency:data.currency,completedAt:data.completed_at,reconciliationStatus:data.reconciliation_status,paid:data.status==="successful",bookingId:data.booking_id});
});