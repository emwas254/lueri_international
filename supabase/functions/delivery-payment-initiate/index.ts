import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lueriinternational.com";
const PESAPAL_ENV = Deno.env.get("PESAPAL_ENV") ?? (SITE_URL.includes("lueriinternational.com") ? "live" : "sandbox");
const BASE_URL = PESAPAL_ENV === "live" ? "https://pay.pesapal.com/v3/api" : "https://cybqa.pesapal.com/pesapalv3/api";
const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY") ?? "";
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET") ?? "";
const IPN_ID = Deno.env.get("PESAPAL_IPN_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS={"Access-Control-Allow-Origin":"https://lueriinternational.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS_HEADERS,"Content-Type":"application/json"}})}
function normalizePhone(phone:string){const digits=phone.replace(/\D/g,"");if(digits.startsWith("0"))return `254${digits.slice(1)}`;if(digits.startsWith("254"))return digits;return digits}
function nameParts(fullName:string){const parts=fullName.trim().split(/\s+/).filter(Boolean);return{first_name:parts[0]||"Customer",last_name:parts.slice(1).join(" ")||"Customer"}}
function validPhone(v:string){return /^0[17]\d{8}$/.test(v.replace(/\s/g,""))}
function validEmail(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())}
async function getAuthToken(){const res=await fetch(`${BASE_URL}/Auth/RequestToken`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({consumer_key:CONSUMER_KEY,consumer_secret:CONSUMER_SECRET})});const raw=await res.text();let data:Record<string,unknown>={};try{data=JSON.parse(raw)}catch{}if(!res.ok||!data.token)throw new Error("Pesapal authentication failed.");return String(data.token)}
async function getAuthoritativePrice(pickup:string,dropoff:string,details:string){if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)throw new Error("Supabase service credentials unavailable");const {data,error}=await supabaseAdmin.rpc("get_delivery_price",{p_pickup:pickup,p_dropoff:dropoff,p_details:details});if(error||data==null){console.error("Pricing RPC failed",error);throw new Error("Failed to calculate authoritative price")}const row=Array.isArray(data)?data[0]:data;const amount=Number(row?.amount_kes);if(row?.is_valid!==true||!Number.isFinite(amount)||amount<0){throw new Error(row?.error_message||"A confirmed price is required for this route before payment.")}return amount}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:CORS_HEADERS});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const origin=req.headers.get("origin");if(origin&&!["https://lueriinternational.com","https://www.lueriinternational.com"].includes(origin))return json({error:"Invalid payment origin."},403);
 try{
  const body=await req.json();
  const pickup=String(body?.pickup??"").trim(),dropoff=String(body?.dropoff??"").trim(),details=String(body?.details??"").trim();
  const customerName=String(body?.customer_name??"").trim(),phone=String(body?.phone??body?.customer_phone??"").trim();
  const preferredTime=body?.preferred_time?String(body.preferred_time).trim():null;
  const customerEmail=body?.customer_email?String(body.customer_email).trim().toLowerCase():null;
  const memberId=body?.member_id?String(body.member_id).trim():null;
  const parcelPhotoPath=body?.parcel_photo_path?String(body.parcel_photo_path).trim():null;
  if(!pickup||!dropoff||!customerName||!phone)return json({error:"Missing required booking fields."},400);
  if(!validPhone(phone))return json({error:"Invalid Kenyan phone number."},400);
  if(customerEmail&&!validEmail(customerEmail))return json({error:"Invalid email address."},400);
  if(!CONSUMER_KEY||!CONSUMER_SECRET||!IPN_ID)return json({error:"Pesapal is not fully configured."},500);
  const amount=await getAuthoritativePrice(pickup,dropoff,details);
  const internalReference=`LR-DEL-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
  const {data:booking,error:bookingInsertError}=await supabaseAdmin.from("bookings").insert({customer_name:customerName,customer_email:customerEmail,phone,pickup,dropoff,details:details||null,preferred_time:preferredTime,member_id:memberId,parcel_photo_path:parcelPhotoPath,status:"pending_payment",reference:internalReference}).select("id").single();
  if(bookingInsertError||!booking){console.error("booking insert failed",bookingInsertError);return json({error:"Could not create the booking."},500)}
  const {data:payment,error:paymentInsertError}=await supabaseAdmin.from("payments").insert({internal_reference:internalReference,pesapal_tracking_id:null,booking_id:booking.id,member_id:memberId,organization_id:null,purpose:"delivery_fee",amount,currency:"KES",status:"pending",payment_method:"pesapal"}).select("id").single();
  if(paymentInsertError||!payment){await supabaseAdmin.from("bookings").delete().eq("id",booking.id);console.error("payment insert failed",paymentInsertError);return json({error:"Could not create the payment record."},500)}
  try{
   const token=await getAuthToken(),names=nameParts(customerName);
   const orderRes=await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({id:internalReference,currency:"KES",amount,description:`Lueri Delivery: ${pickup} to ${dropoff}`,callback_url:`${SITE_URL}/delivery-callback.html?payment=complete`,notification_id:IPN_ID,billing_address:{email_address:customerEmail||"booking@lueriinternational.com",phone_number:normalizePhone(phone),country_code:"KE",first_name:names.first_name,last_name:names.last_name}})});
   const rawOrder=await orderRes.text();let order:Record<string,unknown>={};try{order=JSON.parse(rawOrder)}catch{}
   const trackingId=String(order.order_tracking_id??""),redirectUrl=String(order.redirect_url??"");
   if(!orderRes.ok||!trackingId||!redirectUrl){console.error("Pesapal order failed",{status:orderRes.status});throw new Error("Pesapal did not return a valid checkout URL.")}
   await supabaseAdmin.from("payments").update({pesapal_tracking_id:trackingId}).eq("id",payment.id);
   await supabaseAdmin.from("bookings").update({pesapal_tracking_id:trackingId,quoted_amount_kes:amount,updated_at:new Date().toISOString()}).eq("id",booking.id);
   return json({success:true,redirectUrl,trackingId,orderTrackingId:trackingId,paymentId:payment.id,bookingId:booking.id,amount});
  }catch(err){console.error("Pesapal initiation error",err);await supabaseAdmin.from("payments").update({status:"failed",failure_reason:"pesapal_initiate_error"}).eq("id",payment.id);await supabaseAdmin.from("bookings").update({status:"payment_failed",updated_at:new Date().toISOString()}).eq("id",booking.id);return json({error:"We couldn't start your Pesapal checkout. Please try again."},502)}
 }catch(err){console.error("delivery-payment-initiate error",err);return json({error:"Unable to initiate delivery payment."},500)}
});