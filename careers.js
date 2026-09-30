/* LUERI CAREERS — localized public recruitment catalogue + application flow */
(function(){
  'use strict';

  const openRolesEl=document.getElementById('openRoles');
  const emptyEl=document.getElementById('rolesEmpty');
  const form=document.getElementById('careerForm');
  const roleSelect=document.getElementById('role');
  const errorEl=document.getElementById('careerError');
  const successEl=document.getElementById('careerSuccess');
  const submitBtn=document.getElementById('careerSubmit');
  const futureBtn=document.getElementById('futureApplyBtn');

  if(!openRolesEl||!form||!roleSelect||!window.lueri)return;

  let roles=[];
  let futureRole=null;

  const esc=v=>window.lueri.escapeHTML(v==null?'':String(v));
  const i18n=()=>window.LueriCareersI18n||null;
  const t=k=>i18n()?.t(k)||k;
  const localizedRole=r=>i18n()?.role(r)||{
    title:r.title,department:r.department,location:r.location,type:r.employment_type,
    summary:r.summary,description:r.description,responsibilities:Array.isArray(r.responsibilities)?r.responsibilities:[],
    requirements:Array.isArray(r.requirements)?r.requirements:[]
  };

  function showError(message){errorEl.textContent=message;errorEl.style.display='block';successEl.style.display='none';}
  function showSuccess(message){successEl.textContent=message;successEl.style.display='block';errorEl.style.display='none';}

  function roleCard(role){
    const x=localizedRole(role);
    const resp=(x.responsibilities||[]).slice(0,5).map(esc).join(' · ');
    const req=(x.requirements||[]).slice(0,4).map(v=>'<li>'+esc(v)+'</li>').join('');
    return `<article class="pricing-card career-role-card">
      <div class="tier">${esc(x.department)} · ${esc(x.location)}</div>
      <h3>${esc(x.title)}</h3>
      <div class="price">${esc(x.type)}</div>
      <p>${esc(x.summary)}</p>
      <p class="role-detail-copy"><strong>${esc(t('roles.whatDo'))}</strong><br>${resp||esc(t('roles.fallback'))}</p>
      ${req?'<div class="role-requirements"><strong>'+esc(t('roles.lookFor'))+'</strong><ul>'+req+'</ul></div>':''}
      <button type="button" class="btn btn-primary role-apply" data-role-id="${esc(role.id)}">${esc(t('roles.apply'))}</button>
    </article>`;
  }

  function renderRoles(){
    const open=roles.filter(r=>r.title!=='General / Future Opportunity');
    futureRole=roles.find(r=>r.title==='General / Future Opportunity')||null;
    if(!open.length){openRolesEl.innerHTML='';emptyEl.style.display='block';}
    else{emptyEl.style.display='none';openRolesEl.innerHTML=open.map(roleCard).join('');}

    roleSelect.innerHTML='';
    const first=document.createElement('option');
    first.value='';first.disabled=true;first.selected=true;first.textContent=t('form.roleSelect');
    roleSelect.appendChild(first);

    open.forEach(role=>{
      const option=document.createElement('option');
      option.value=role.id;option.textContent=localizedRole(role).title;roleSelect.appendChild(option);
    });
    if(futureRole){
      const option=document.createElement('option');
      option.value=futureRole.id;option.textContent=t('roles.futureOption');roleSelect.appendChild(option);
      futureBtn.style.display='inline-flex';
    }else futureBtn.style.display='none';
  }

  async function loadRoles(){
    try{
      const sb=window.lueri.supabase();
      if(!sb)throw new Error(t('messages.system'));
      const {data,error}=await sb.from('career_roles')
        .select('id,title,department,location,employment_type,summary,description,responsibilities,requirements,salary_range,application_deadline,sort_order')
        .eq('status','open').order('sort_order',{ascending:true});
      if(error)throw error;
      roles=data||[];renderRoles();
    }catch(err){
      console.error('Careers roles load failed:',err);
      openRolesEl.innerHTML='';
      emptyEl.style.display='block';
      emptyEl.innerHTML='<strong>'+esc(t('messages.unavailableTitle'))+'</strong><br>'+t('roles.unavailable').replace(/<br\s*\/?>(?)/i,'');
      roleSelect.innerHTML='<option value="" selected>'+esc(t('messages.unavailableTitle'))+'</option>';
      roleSelect.disabled=true;
    }
  }

  function scrollToApplication(roleId){
    if(roleId)roleSelect.value=roleId;
    document.getElementById('apply')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>document.getElementById('candidateName')?.focus(),350);
  }

  openRolesEl.addEventListener('click',event=>{
    const button=event.target.closest('.role-apply');
    if(button)scrollToApplication(button.dataset.roleId);
  });
  futureBtn?.addEventListener('click',()=>{if(futureRole)scrollToApplication(futureRole.id);});

  form.addEventListener('submit',async event=>{
    event.preventDefault();errorEl.style.display='none';successEl.style.display='none';
    const roleId=roleSelect.value;
    const name=document.getElementById('candidateName').value.trim();
    const phone=document.getElementById('candidatePhone').value.trim();
    const email=document.getElementById('candidateEmail').value.trim();
    const location=document.getElementById('candidateLocation').value.trim();
    const summary=document.getElementById('candidateSummary').value.trim();
    const cvUrl=document.getElementById('cvUrl').value.trim();
    const linkedinUrl=document.getElementById('linkedinUrl').value.trim();
    const availability=document.getElementById('availability').value.trim();
    const expectedSalary=document.getElementById('expectedSalary').value.trim();

    if(!roleId)return showError(t('messages.roleRequired'));
    if(name.length<2)return showError(t('messages.name'));
    if(!window.lueriIsValidPhone(phone))return showError(t('messages.phone'));
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return showError(t('messages.email'));
    if(summary.length<20)return showError(t('messages.summary'));
    if(cvUrl&&!/^https?:\/\//i.test(cvUrl))return showError(t('messages.cv'));
    if(linkedinUrl&&!/^https?:\/\//i.test(linkedinUrl))return showError(t('messages.linkedin'));

    submitBtn.disabled=true;submitBtn.textContent=t('messages.submitted');
    try{
      const result=await window.lueri.rpc('submit_career_application',{
        p_role_id:roleId,p_full_name:name,p_email:email,
        p_phone:window.lueriNormalizePhone(phone)||phone,p_location:location||null,
        p_summary:summary,p_cv_url:cvUrl||null,p_linkedin_url:linkedinUrl||null,
        p_availability:availability||null,p_expected_salary:expectedSalary||null,p_source:'website'
      });
      if(!result?.success){
        const map={
          role_required:'messages.roleRequired',role_unavailable:'messages.roleUnavailable',
          invalid_name:'messages.invalidName',invalid_email:'messages.invalidEmail',
          invalid_phone:'messages.invalidPhone',invalid_summary:'messages.invalidSummary',
          invalid_cv_url:'messages.invalidCv',invalid_linkedin_url:'messages.invalidLinkedin',
          duplicate_recent_application:'messages.duplicate',rate_limited:'messages.rate'
        };
        throw new Error(t(map[result.error]||'messages.submitFailed'));
      }
      form.reset();roleSelect.value='';
      const roleName=localizedRole(roles.find(r=>r.id===roleId)||{title:'the selected role'}).title;
      showSuccess(t('messages.received').replace('{role}',roleName));
      document.getElementById('apply')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){
      console.error('Career application failed:',err);showError(err.message||t('messages.submitFailed'));
    }finally{
      submitBtn.disabled=false;submitBtn.textContent=t('form.submit');
    }
  });

  window.addEventListener('lueri:languagechange',()=>{
    if(window.LueriCareersI18n?.apply)window.LueriCareersI18n.apply();
    renderRoles();
  });
  loadRoles();
})();