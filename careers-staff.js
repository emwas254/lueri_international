(function(){
'use strict';
let sb=null, applications=[], roles=[];
const $=(id)=>document.getElementById(id);
function msg(el,text){el.textContent=text||'';el.classList.toggle('show',!!text)}
function setConsole(on){$('loginPanel').style.display=on?'none':'block';$('console').style.display=on?'block':'none';$('logout').style.display=on?'inline-flex':'none'}
async function loadApplications(){
 const result=await window.lueri.rpc('staff_list_career_applications',{p_status:$('statusFilter').value||null,p_limit:200,p_offset:0});
 if(!result?.success) throw new Error(result?.error==='not_authorized'?'This account is not an active Lueri staff/admin account.':(result?.error||'Could not load applications.'));
 applications=result.applications||[]; renderApplications();
}
function renderApplications(){
 $('totalApplications').textContent=applications.length;
 $('newApplications').textContent=applications.filter(x=>x.status==='new').length;
 $('shortlistedApplications').textContent=applications.filter(x=>x.status==='shortlisted').length;
 const body=$('applicationsBody');
 body.innerHTML=applications.length?applications.map(a=>`<tr>
 <td><strong>${window.lueri.escapeHTML(a.full_name)}</strong><br><span class="muted">${window.lueri.escapeHTML(a.location||'')}</span></td>
 <td>${window.lueri.escapeHTML(a.role_title)}</td>
 <td><a href="mailto:${encodeURIComponent(a.email)}">${window.lueri.escapeHTML(a.email)}</a><br>${window.lueri.escapeHTML(a.phone)}</td>
 <td>${a.cv_url?'<a target="_blank" rel="noopener" href="'+window.lueri.escapeHTML(a.cv_url)+'">CV</a> · ':''}${a.linkedin_url?'<a target="_blank" rel="noopener" href="'+window.lueri.escapeHTML(a.linkedin_url)+'">LinkedIn</a>':''}<br><span class="muted">${window.lueri.escapeHTML(a.summary).slice(0,180)}${a.summary.length>180?'…':''}</span></td>
 <td><span class="badge">${window.lueri.escapeHTML(a.status)}</span></td>
 <td><select class="select status-change" data-id="${a.id}" style="width:auto"><option>new</option><option>reviewing</option><option>shortlisted</option><option>interview</option><option>rejected</option><option>hired</option><option>withdrawn</option></select></td>
 </tr>`).join(''):'<tr><td colspan="6" class="muted">No applications match this filter.</td></tr>';
 body.querySelectorAll('.status-change').forEach(s=>{s.value=applications.find(a=>a.id===s.dataset.id)?.status||'new';s.addEventListener('change',()=>updateStatus(s.dataset.id,s.value))});
}
async function updateStatus(id,status){
 const result=await window.lueri.rpc('staff_update_career_application',{p_application_id:id,p_status:status,p_note:null});
 if(!result?.success){msg($('consoleMessage'),result?.error||'Could not update application.');return}
 await loadApplications();
}
async function loadRoles(){
 const result=await window.lueri.rpc('staff_list_career_roles',{});
 if(!result?.success) throw new Error(result?.error||'Could not load roles.');
 roles=result.roles||[];
 const open=roles.filter(r=>r.status==='open').length;
 $('openRoles').textContent=open;
 $('rolesList').innerHTML=roles.map(r=>`<div class="role-row"><div><strong>${window.lueri.escapeHTML(r.title)}</strong><br><span class="muted">${window.lueri.escapeHTML(r.department)} · ${window.lueri.escapeHTML(r.location)}</span></div><div>${window.lueri.escapeHTML(r.employment_type)}</div><div><span class="badge">${window.lueri.escapeHTML(r.status)}</span></div><div class="actions">${r.title==='General / Future Opportunity'?'':'<button class="btn role-status" data-id="'+r.id+'" data-status="'+(r.status==='open'?'closed':'open')+'">'+(r.status==='open'?'Close':'Publish')+'</button>'}</div></div>`).join('');
 $('rolesList').querySelectorAll('.role-status').forEach(b=>b.addEventListener('click',()=>setRoleStatus(b.dataset.id,b.dataset.status)));
}
async function setRoleStatus(id,status){
 const result=await window.lueri.rpc('staff_set_career_role_status',{p_role_id:id,p_status:status});
 if(!result?.success){msg($('consoleMessage'),result?.error==='admin_required'?'Only an admin can publish or close vacancies.':(result?.error||'Could not update role.'));return}
 await loadRoles(); await loadApplications(); msg($('consoleMessage'),status==='open'?'Role published publicly.':'Role closed publicly.');
}
async function refresh(){
 try{msg($('consoleMessage'),'');await loadApplications();await loadRoles()}catch(e){msg($('consoleMessage'),e.message||'Could not load the recruitment console.')}
}
async function init(){
 sb=window.lueri.supabase();
 if(!sb)return;
 $('login').addEventListener('click',async()=>{
   msg($('loginMessage'),'');
   const email=$('email').value.trim(),password=$('password').value;
   if(!email||!password)return msg($('loginMessage'),'Enter your email and password.');
   const result=await sb.auth.signInWithPassword({email,password});
   if(result.error)return msg($('loginMessage'),result.error.message);
   setConsole(true); await refresh();
 });
 $('password').addEventListener('keydown',e=>{if(e.key==='Enter')$('login').click()});
 $('logout').addEventListener('click',async()=>{await sb.auth.signOut();setConsole(false)});
 $('statusFilter').addEventListener('change',refresh);$('refresh').addEventListener('click',refresh);
 const session=(await sb.auth.getSession()).data.session;
 if(session){setConsole(true);await refresh()}else setConsole(false);
 sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')setConsole(false)});
}
document.addEventListener('DOMContentLoaded',init);
})();