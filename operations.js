(() => {
'use strict';
const SUPABASE_URL='https://ylifvexqamxvwzvhmwex.supabase.co';
const SUPABASE_KEY='sb_publishable_ozdYp7hE9r5Ncf8PiE8w-A_MTVyF64F';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const setupToken=new URLSearchParams(location.search).get('setup')||'';
let bookings=[],payments=[],costs=[],filter='all',selected=null;
const $=id=>document.getElementById(id);
const statusLabel=s=>({pending_payment:'Awaiting payment',paid_ready:'Ready for dispatch',assigned:'Assigned',picked_up:'Picked up',in_transit:'In transit',delivered:'Delivered',payment_failed:'Payment failed',payment_cancelled:'Payment cancelled',issue:'Issue'})[s]||String(s||'Unknown').replaceAll('_',' ');
function badgeClass(s){return ['paid_ready','assigned','picked_up','in_transit','delivered'].includes(s)?'green':['pending_payment','payment_cancelled'].includes(s)?'yellow':['payment_failed','issue'].includes(s)?'red':''}
async function getProfile(){const {data:{session}}=await sb.auth.getSession();if(!session)return null;const r=await sb.from('profiles').select('full_name,role,active,job_title').eq('id',session.user.id).maybeSingle();return r.error?null:r.data}
async function bootstrapAccount(name){if(!setupToken)return{success:false,error:'no_setup_token'};const r=await sb.rpc('claim_chief_dispatch_bootstrap',{p_token:setupToken,p_full_name:name});return r.error?{success:false,error:r.error.message}:r.data}
async function checkAccess(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){$('loginView').hidden=false;$('signupView').hidden=true;$('dashboardView').hidden=true;return}
 let p=await getProfile();
 if(p&&!p.active&&setupToken){const b=await bootstrapAccount(p.full_name||'');if(b.success)p=await getProfile();else{await sb.auth.signOut();$('loginError').textContent=b.error==='email_not_confirmed'?'Confirm your email first, then return and sign in again.':b.error==='bootstrap_closed'?'Initial setup has already been completed.':b.error==='invalid_or_expired_token'?'This setup link is invalid or has expired.':(b.error||'Account activation failed.');$('loginView').hidden=false;$('signupView').hidden=true;$('dashboardView').hidden=true;return}}
 if(!p||!p.active||!['staff','admin'].includes(p.role)){
   await sb.auth.signOut();$('loginError').textContent='This account is not provisioned for Lueri Operations. Ask an Lueri administrator to activate a staff/admin profile.';$('loginView').hidden=false;$('signupView').hidden=true;$('dashboardView').hidden=true;return;
 }
 $('operatorName').textContent=(p.full_name||session.user.email||'Operator')+' · '+(p.job_title||'Lueri Staff');$('loginView').hidden=true;$('signupView').hidden=true;$('dashboardView').hidden=false;await load();
}
async function load(){
 const b=await sb.from('bookings').select('*').order('created_at',{ascending:false}).limit(200);
 if(b.error){$('queue').innerHTML='<div class="detail-card">Unable to load bookings: '+escapeHtml(b.error.message)+'</div>';return}
 bookings=b.data||[];
 const ids=bookings.map(x=>x.id);
 payments=[]; costs=[];
 if(ids.length){const p=await sb.from('payments').select('id,booking_id,status,amount,currency,payment_method,internal_reference,pesapal_tracking_id,completed_at').in('booking_id',ids);payments=p.data||[]; const c=await sb.from('delivery_costs').select('id,booking_id,cost_type,amount_kes,notes,created_at').in('booking_id',ids); costs=c.data||[]}
 $('lastUpdated').textContent='Live queue · '+new Date().toLocaleTimeString();
 renderStats();renderQueue();
}
function renderStats(){
 const revenue=bookings.reduce((s,b)=>s+Number(b.quoted_amount_kes||0),0);const variableCosts=costs.reduce((s,x)=>s+Number(x.amount_kes||0),0);const margin=revenue-variableCosts;const marginPct=revenue>0?(margin/revenue)*100:0;const counts={ready:bookings.filter(x=>x.status==='paid_ready').length,awaiting:bookings.filter(x=>x.status==='pending_payment').length,active:bookings.filter(x=>['assigned','picked_up','in_transit'].includes(x.status)).length,delivered:bookings.filter(x=>x.status==='delivered').length,issues:bookings.filter(x=>['issue','payment_failed','payment_cancelled'].includes(x.status)).length};
 $('stats').innerHTML=[['ready','Ready',counts.ready],['awaiting','Awaiting payment',counts.awaiting],['active','Active',counts.active],['delivered','Delivered',counts.delivered],['issues','Issues',counts.issues],['revenue','Quoted revenue','KES '+revenue.toLocaleString()],['costs','Recorded variable cost','KES '+variableCosts.toLocaleString()],['margin','Contribution margin','KES '+margin.toLocaleString()+' ('+marginPct.toFixed(1)+'%)']].map(x=>'<div class="stat"><b>'+x[2]+'</b><span>'+x[1]+'</span></div>').join('');
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
 const p=paymentFor(id);const bookingCosts=costs.filter(x=>x.booking_id===id);const totalCosts=bookingCosts.reduce((s,x)=>s+Number(x.amount_kes||0),0);const revenue=Number(selected.quoted_amount_kes||0);const margin=revenue-totalCosts;const marginPct=revenue>0?(margin/revenue)*100:0;$('dashboardView').hidden=true;$('detailView').hidden=false;
 let photo='';
 if(selected.parcel_photo_path){const r=await sb.storage.from('lucy-parcel-photos').createSignedUrl(selected.parcel_photo_path,900);if(r.data?.signedUrl)photo='<img class="photo" src="'+r.data.signedUrl+'" alt="Parcel photograph">';}
 $('detailBody').innerHTML='<div class="detail-card"><div class="ref">'+escapeHtml(selected.reference||selected.id)+'</div><h2>'+escapeHtml(selected.customer_name||'Customer')+'</h2><div class="detail-grid"><div><div class="kv"><b>Pickup</b>'+escapeHtml(selected.pickup)+'</div><div class="kv"><b>Drop-off</b>'+escapeHtml(selected.dropoff)+'</div><div class="kv"><b>Preferred time</b>'+escapeHtml(selected.preferred_time||'Not specified')+'</div><div class="kv"><b>Phone</b><a href="tel:'+escapeHtml(selected.phone||'')+'">'+escapeHtml(selected.phone||'')+'</a></div><div class="kv"><b>Email</b>'+escapeHtml(selected.customer_email||'Not provided')+'</div><div class="kv"><b>Parcel details</b>'+escapeHtml(selected.details||'Not provided')+'</div></div><div><h3>Payment</h3><div class="kv"><b>Status</b>'+escapeHtml(p?({pending:'Pending',successful:'Paid',failed:'Failed',cancelled:'Cancelled'}[p.status]||p.status):'No payment record')+'</div><div class="kv"><b>Amount</b>'+escapeHtml(p?((p.currency||'KES')+' '+Number(p.amount||0).toLocaleString()):'—')+'</div><div class="kv"><b>Reference</b>'+escapeHtml(p?.internal_reference||selected.reference||'—')+'</div><div class="kv"><b>PesaPal tracking</b>'+escapeHtml(p?.pesapal_tracking_id||selected.pesapal_tracking_id||'—')+'</div><h3>Parcel photograph</h3>'+ (photo||'<div class="meta">No photograph attached.</div>')+'</div></div><h3>Delivery economics</h3><div class="economics-grid"><div class="kv"><b>Quoted revenue</b>KES '+revenue.toLocaleString()+'</div><div class="kv"><b>Recorded variable cost</b>KES '+totalCosts.toLocaleString()+'</div><div class="kv"><b>Contribution margin</b>KES '+margin.toLocaleString()+' ('+marginPct.toFixed(1)+'%)</div></div><div class="cost-form"><select id="costType"><option value="rider">Rider</option><option value="fuel">Fuel</option><option value="payment_fee">Payment fee</option><option value="refund">Refund</option><option value="other">Other</option></select><input id="costAmount" type="number" min="0" step="0.01" placeholder="Amount KES"><input id="costNotes" type="text" placeholder="Cost note"><button class="ghost" id="addCost">Add cost</button></div><div class="meta">'+(bookingCosts.length?bookingCosts.map(x=>escapeHtml(x.cost_type)+' · KES '+Number(x.amount_kes||0).toLocaleString()+(x.notes?' · '+escapeHtml(x.notes):'')).join('<br>'):'No variable costs recorded yet.')+'</div><h3>Dispatch status</h3><div class="status-row">'+['paid_ready','assigned','picked_up','in_transit','delivered','issue'].map(s=>'<button class="status-btn '+(selected.status===s?'active':'')+'" data-set-status="'+s+'">'+statusLabel(s)+'</button>').join('')+'</div><h3>Internal notes</h3><textarea id="notes" class="notes" placeholder="Rider, access, customer or parcel notes…">'+escapeHtml(selected.internal_notes||'')+'</textarea><div class="save-row"><button class="primary" id="saveBooking">Save booking</button></div></div>';
 document.querySelectorAll('[data-set-status]').forEach(b=>b.onclick=async()=>{await updateBooking({status:b.dataset.setStatus})}); $('addCost').onclick=async()=>{const amount=Number($('costAmount').value);if(!Number.isFinite(amount)||amount<0){alert('Enter a valid non-negative cost amount.');return}const r=await sb.from('delivery_costs').insert({booking_id:selected.id,cost_type:$('costType').value,amount_kes:amount,notes:$('costNotes').value.trim()||null,recorded_by:(await sb.auth.getUser()).data.user?.id});if(r.error){alert('Could not record cost: '+r.error.message);return}await load();openDetail(selected.id)};
 $('saveBooking').onclick=async()=>{await updateBooking({status:selected.status,internal_notes:$('notes').value})};
}
async function updateBooking(patch){const r=await sb.from('bookings').update({...patch,updated_at:new Date().toISOString()}).eq('id',selected.id).select('*').single();if(r.error){alert('Could not save: '+r.error.message);return}selected=r.data;await load();openDetail(selected.id)}
async function createAccount(){const name=$('signupName').value.trim(),email=$('signupEmail').value.trim(),pw=$('signupPassword').value,pw2=$('signupPasswordConfirm').value,err=$('signupError'),btn=$('signupBtn');err.textContent='';if(!setupToken){err.textContent='This page is not carrying the one-time setup authorization.';return}if(name.length<2){err.textContent='Enter your full name.';return}if(!/^\\S+@\\S+\\.\\S+$/.test(email)){err.textContent='Enter a valid email address.';return}if(pw.length<10){err.textContent='Use a password of at least 10 characters.';return}if(pw!==pw2){err.textContent='The passwords do not match.';return}btn.disabled=true;btn.textContent='Creating account…';try{const r=await sb.auth.signUp({email,password:pw,options:{data:{full_name:name}}});if(r.error){err.textContent=r.error.message||'Could not create account.';return}if(r.data.session){const b=await bootstrapAccount(name);if(!b.success){await sb.auth.signOut();err.textContent=b.error||'Account activation failed.';return}await checkAccess();return}err.className='success';err.textContent='Account created. Check your email for the confirmation link if requested. Then return here and sign in with the same credentials.';$('email').value=email;setTimeout(()=>{$('signupView').hidden=true;$('loginView').hidden=false},1400)}finally{btn.disabled=false;btn.textContent='Create Chief Dispatch Officer account'}}
$('signupForm').onsubmit=async e=>{e.preventDefault();await createAccount()};
$('createAccountLink').onclick=e=>{e.preventDefault();if(setupToken){$('loginView').hidden=true;$('signupView').hidden=false;$('dashboardView').hidden=true}};
$('backToLogin').onclick=e=>{e.preventDefault();$('signupView').hidden=true;$('loginView').hidden=false};
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){$('loginError').textContent=error.message;return}await checkAccess()};
$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('closeDetail').onclick=()=>{$('detailView').hidden=true;$('dashboardView').hidden=false;renderQueue()};
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.status;renderQueue()});
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT')setTimeout(checkAccess,0)});
sb.channel('operations-bookings').on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>load()).subscribe();sb.channel('operations-costs').on('postgres_changes',{event:'*',schema:'public',table:'delivery_costs'},()=>load()).subscribe();
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
if(location.hash==='#create-account'&&setupToken){$('loginView').hidden=true;$('signupView').hidden=false;$('dashboardView').hidden=true}else{checkAccess()}
})();
