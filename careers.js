/* LUERI CAREERS — public recruitment catalogue + application flow */
(function () {
  'use strict';

  const openRolesEl = document.getElementById('openRoles');
  const emptyEl = document.getElementById('rolesEmpty');
  const form = document.getElementById('careerForm');
  const roleSelect = document.getElementById('role');
  const errorEl = document.getElementById('careerError');
  const successEl = document.getElementById('careerSuccess');
  const submitBtn = document.getElementById('careerSubmit');
  const futureBtn = document.getElementById('futureApplyBtn');

  if (!openRolesEl || !form || !roleSelect || !window.lueri) return;

  let roles = [];
  let futureRole = null;

  const esc = (value) => window.lueri.escapeHTML(value == null ? '' : String(value));

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    successEl.style.display = 'none';
  }

  function showSuccess(message) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
  }

  function roleCard(role) {
    const responsibilities = Array.isArray(role.responsibilities) ? role.responsibilities : [];
    const requirements = Array.isArray(role.requirements) ? role.requirements : [];
    const resp = responsibilities.slice(0, 5).map((x) => esc(x)).join(' · ');
    const req = requirements.slice(0, 4).map((x) => '<li>' + esc(x) + '</li>').join('');
    return `
      <article class="pricing-card career-role-card">
        <div class="tier">${esc(role.department)} · ${esc(role.location)}</div>
        <h3>${esc(role.title)}</h3>
        <div class="price">${esc(role.employment_type)}</div>
        <p>${esc(role.summary)}</p>
        <p class="role-detail-copy"><strong>What you'll do</strong><br>${resp || 'See the role details below.'}</p>
        ${req ? '<div class="role-requirements"><strong>What we look for</strong><ul>' + req + '</ul></div>' : ''}
        <button type="button" class="btn btn-primary role-apply" data-role-id="${esc(role.id)}">View role &amp; apply</button>
      </article>`;
  }

  function renderRoles() {
    const open = roles.filter((r) => r.title !== 'General / Future Opportunity');
    futureRole = roles.find((r) => r.title === 'General / Future Opportunity') || null;

    if (!open.length) {
      openRolesEl.innerHTML = '';
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      openRolesEl.innerHTML = open.map(roleCard).join('');
    }

    roleSelect.innerHTML = '<option value="" disabled selected>Select a role…</option>';
    open.forEach((role) => {
      const option = document.createElement('option');
      option.value = role.id;
      option.textContent = role.title;
      roleSelect.appendChild(option);
    });

    if (futureRole) {
      const option = document.createElement('option');
      option.value = futureRole.id;
      option.textContent = 'Future opportunity / talent pool';
      roleSelect.appendChild(option);
      futureBtn.style.display = 'inline-flex';
    } else {
      futureBtn.style.display = 'none';
    }
  }

  async function loadRoles() {
    try {
      const sb = window.lueri.supabase();
      if (!sb) throw new Error('Recruitment service unavailable.');
      const { data, error } = await sb
        .from('career_roles')
        .select('id,title,department,location,employment_type,summary,description,responsibilities,requirements,salary_range,application_deadline,sort_order')
        .eq('status', 'open')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      roles = data || [];
      renderRoles();
    } catch (err) {
      console.error('Careers roles load failed:', err);
      openRolesEl.innerHTML = '';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<strong>Openings are temporarily unavailable</strong><br>Please try again shortly. The application system is still protected and no application data has been submitted.';
      roleSelect.innerHTML = '<option value="" selected>Roles temporarily unavailable</option>';
      roleSelect.disabled = true;
    }
  }

  function scrollToApplication(roleId) {
    if (roleId) roleSelect.value = roleId;
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('candidateName')?.focus(), 350);
  }

  openRolesEl.addEventListener('click', (event) => {
    const button = event.target.closest('.role-apply');
    if (!button) return;
    scrollToApplication(button.dataset.roleId);
  });

  futureBtn?.addEventListener('click', () => {
    if (futureRole) scrollToApplication(futureRole.id);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    const roleId = roleSelect.value;
    const name = document.getElementById('candidateName').value.trim();
    const phone = document.getElementById('candidatePhone').value.trim();
    const email = document.getElementById('candidateEmail').value.trim();
    const location = document.getElementById('candidateLocation').value.trim();
    const summary = document.getElementById('candidateSummary').value.trim();
    const cvUrl = document.getElementById('cvUrl').value.trim();
    const linkedinUrl = document.getElementById('linkedinUrl').value.trim();
    const availability = document.getElementById('availability').value.trim();
    const expectedSalary = document.getElementById('expectedSalary').value.trim();

    if (!roleId) return showError('Please select the role you are applying for.');
    if (name.length < 2) return showError('Please enter your full name.');
    if (!window.lueriIsValidPhone(phone)) return showError('Please enter a valid Kenyan phone number.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');
    if (summary.length < 20) return showError('Please provide at least a short summary of your relevant experience.');
    if (cvUrl && !/^https?:\/\//i.test(cvUrl)) return showError('Your CV / portfolio link must start with https:// or http://.');
    if (linkedinUrl && !/^https?:\/\//i.test(linkedinUrl)) return showError('Your LinkedIn link must start with https:// or http://.');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const result = await window.lueri.rpc('submit_career_application', {
        p_role_id: roleId,
        p_full_name: name,
        p_email: email,
        p_phone: window.lueriNormalizePhone(phone) || phone,
        p_location: location || null,
        p_summary: summary,
        p_cv_url: cvUrl || null,
        p_linkedin_url: linkedinUrl || null,
        p_availability: availability || null,
        p_expected_salary: expectedSalary || null,
        p_source: 'website'
      });

      if (!result?.success) {
        const messages = {
          role_required: 'Please select a role.',
          role_unavailable: 'That role is no longer accepting applications. Please refresh the page and choose another role.',
          invalid_name: 'Please enter a valid full name.',
          invalid_email: 'Please enter a valid email address.',
          invalid_phone: 'Please enter a valid phone number.',
          invalid_summary: 'Please provide a little more information about your experience and fit.',
          invalid_cv_url: 'Please check your CV / portfolio link.',
          invalid_linkedin_url: 'Please check your LinkedIn link.',
          duplicate_recent_application: 'We already received an application from this email for this role in the last 24 hours.',
          rate_limited: 'Too many application attempts were made from this connection. Please try again later.'
        };
        throw new Error(messages[result.error] || 'We could not submit the application. Please try again.');
      }

      form.reset();
      roleSelect.value = '';
      showSuccess('Application received. Lueri has recorded your application for ' + (result.role?.title || 'the selected role') + '. Keep your phone and email available in case the recruitment team contacts you.');
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Career application failed:', err);
      showError(err.message || 'We could not submit the application. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit application';
    }
  });

  loadRoles();
})();
