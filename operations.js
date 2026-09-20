(() => {
'use strict';
const SUPABASE_URL='https://ylifvexqamxvwzvhmwex.supabase.co';
const SUPABASE_KEY='sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let bookings=[],payments=[],filter='all',selected=null;
const $=id=>document.getElementById(id);
const statusLabel=s=>({pending_payment:'Awaiting payment',paid_ready:'Ready for dispatch',assigned:'Assigned',picked_up:'Picked up',in_transit:'In transit',delivered:'Delivered',payment_failed:'Payment failed',payment_cancelled:'Payment cancelled',issue:'Issue'})[s]||String(s||'Unknown').replaceAll('_',' ');
function badgeClass(s){return ['paid_ready','assigned','picked_up','in_transit','delivered'].includes(s)?'green':['pending_payment','payment_cancelled'].includes(s)?'yellow':['payment_failed','issue'].includes(s)?'red':''}
async function checkAccess(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){$('loginView').hidden=false;$('dashboardView').hidden=true;return}
 const {data:p,error}=await sb.from('profiles').select('full_name,role,active').eq('id',session.user.id).single();
 if(error||!p||!p.active||!['staff','admin'].includes(p.role)){
   await sb.auth.signOut();$('loginError').textContent='This account is not provisioned for Lueri Operations. Ask an Lueri administrator to activate a staff/admin profile.';$('loginView').hidden=false;$('dashboardView').hidden=true;return;
 }
 $('operatorName').textContent=p.full_name||session.user.email||'Operator';$('loginView').hidden=true;$('dashboardView').hidden=false;await load();
}
async function load(){
 const b=await sb.from('bookings').select('*').order('created_at',{ascending:false}).limit(200);
 if(b.error){$('queue').innerHTML='<div class="detail-card">Unable to load bookings: '+escapeHtml(b.error.message)+'</div>';return}
 bookings=b.data||[];
 const ids=bookings.map(x=>x.id);
 payments=[];
 if(ids.length){const p=await sb.from('payments').select('id,booking_id,status,amount,currency,payment_method,internal_reference,pesapal_tracking_id,completed_at').in('booking_id',ids);payments=p.data||[]}
 $('lastUpdated').textContent='Live queue · '+new Date().toLocaleTimeString();
 renderStats();renderQueue();
}
function renderStats(){
 const counts={ready:bookings.filter(x=>x.status==='paid_ready').length,awaiting:bookings.filter(x=>x.status==='pending_payment').length,active:bookings.filter(x=>['assigned','picked_up','in_transit'].includes(x.status)).length,delivered:bookings.filter(x=>x.status==='delivered').length,issues:bookings.filter(x=>['issue','payment_failed','payment_cancelled'].includes(x.status)).length};
 $('stats').innerHTML=[['ready','Ready',counts.ready],['awaiting','Awaiting payment',counts.awaiting],['active','Active',counts.active],['delivered','Delivered',counts.delivered],['issues','Issues',counts.issues]].map(x=>'<div class="stat"><b>'+x[2]+'</b><span>'+x[1]+'</span></div>').join('');
}
function renderQueue(){
 const list=filter==='all'?bookings:bookings.filter(x=>x.status===filter);
 $('queue').innerHTML=list.length?list.map(x=>{
   const p=payments.find(y=>y.booking_id===x.id), ref=x.reference||p?.internal_reference||x.id.slice(0,8).toUpperCase();
   return '<article class="order" data-id="'+x.id+'"><div><div class="ref">'+escapeHtml(ref)+'</div><div class="route">'+escapeHtml(x.pickup)+' → '+escapeHtml(x.dropoff)+'</div></div><div class="meta">'+escapeHtml(x.customer_name||'Customer')+' · '+escapeHtml(x.phone||'')+'<br>'+escapeHtml(x.preferred_time||'Time not specified')+(x.parcel_photo_path?' · 📷 photo attached':'')+'</div><div><span class="badge '+badgeClass(x.status)+'">'+escapeHtml(statusLabel(x.status))+'</span><br><span class="ref">'+new Date(x.created_at).toLocaleString()+'</span></div></article>'
 }).join(''):'<div class="detail-card">No bookings in this queue.</div>';
 document.querySelectorAll('.order').forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
}
function paymentFor(id){return payments.find(x=>x.booking_id===id)}
async function openDetail(id){
 selected=bookings.find(x=>x.id===id);if(!selected)return;
 const p=paymentFor(id);$('dashboardView').hidden=true;$('detailView').hidden=false;
 let photo='';
 if(selected.parcel_photo_path){const r=await sb.storage.from('lucy-parcel-photos').createSignedUrl(selected.parcel_photo_path,900);if(r.data?.signedUrl)photo='<img class="photo" src="'+r.data.signedUrl+'" alt="Parcel photograph">';}
 $('detailBody').innerHTML='<div class="detail-card"><div class="ref">'+escapeHtml(selected.reference||selected.id)+'</div><h2>'+escapeHtml(selected.customer_name||'Customer')+'</h2><div class="detail-grid"><div><div class="kv"><b>Pickup</b>'+escapeHtml(selected.pickup)+'</div><div class="kv"><b>Drop-off</b>'+escapeHtml(selected.dropoff)+'</div><div class="kv"><b>Preferred time</b>'+escapeHtml(selected.preferred_time||'Not specified')+'</div><div class="kv"><b>Phone</b><a href="tel:'+escapeHtml(selected.phone||'')+'">'+escapeHtml(selected.phone||'')+'</a></div><div class="kv"><b>Email</b>'+escapeHtml(selected.customer_email||'Not provided')+'</div><div class="kv"><b>Parcel details</b>'+escapeHtml(selected.details||'Not provided')+'</div></div><div><h3>Payment</h3><div class="kv"><b>Status</b>'+escapeHtml(p?({pending:'Pending',successful:'Paid',failed:'Failed',cancelled:'Cancelled'}[p.status]||p.status):'No payment record')+'</div><div class="kv"><b>Amount</b>'+escapeHtml(p?((p.currency||'KES')+' '+Number(p.amount||0).toLocaleString()):'—')+'</div><div class="kv"><b>Reference</b>'+escapeHtml(p?.internal_reference||selected.reference||'—')+'</div><div class="kv"><b>PesaPal tracking</b>'+escapeHtml(p?.pesapal_tracking_id||selected.pesapal_tracking_id||'—')+'</div><h3>Parcel photograph</h3>'+ (photo||'<div class="meta">No photograph attached.</div>')+'</div></div><h3>Dispatch status</h3><div class="status-row">'+['paid_ready','assigned','picked_up','in_transit','delivered','issue'].map(s=>'<button class="status-btn '+(selected.status===s?'active':'')+'" data-set-status="'+s+'">'+statusLabel(s)+'</button>').join('')+'</div><h3>Internal notes</h3><textarea id="notes" class="notes" placeholder="Rider, access, customer or parcel notes…">'+escapeHtml(selected.internal_notes||'')+'</textarea><div class="save-row"><button class="primary" id="saveBooking">Save booking</button></div></div>';
 document.querySelectorAll('[data-set-status]').forEach(b=>b.onclick=async()=>{await updateBooking({status:b.dataset.setStatus})});
 $('saveBooking').onclick=async()=>{await updateBooking({status:selected.status,internal_notes:$('notes').value})};
}
async function updateBooking(patch){const r=await sb.from('bookings').update({...patch,updated_at:new Date().toISOString()}).eq('id',selected.id).select('*').single();if(r.error){alert('Could not save: '+r.error.message);return}selected=r.data;await load();openDetail(selected.id)}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){$('loginError').textContent=error.message;return}await checkAccess()};
$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('closeDetail').onclick=()=>{$('detailView').hidden=true;$('dashboardView').hidden=false;renderQueue()};
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.status;renderQueue()});
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT')setTimeout(checkAccess,0)});
sb.channel('operations-bookings').on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>load()).subscribe();
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
checkAccess();
})();
