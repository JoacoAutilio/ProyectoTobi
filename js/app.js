/* ═══════════════════════════════════════════
   TSP ARQUITECTURA · app.js
   Lógica principal conectada a Supabase.
═══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   ROUTER
══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function showLoading(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}


/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);

  const session = await Auth.getSession();
  if (session) {
    await enterApp(session.user.id);
  } else {
    showLoading(false);
    showScreen('login');
  }

  bindLoginEvents();
  bindRegisterEvents();
  bindDashboardEvents();
  bindAdminEvents();
});


/* ══════════════════════════════════════════
   ENTRAR A LA APP
══════════════════════════════════════════ */
async function enterApp(userId) {
  showLoading(true);
  const profile = await Profiles.getOwn(userId);

  if (!profile) {
    showLoading(false);
    showAlert(document.getElementById('login-error'), 'Error al cargar tu perfil. Intentá de nuevo.');
    showScreen('login');
    return;
  }

  if (profile.status === 'pending') {
    await Auth.logout();
    showLoading(false);
    showScreen('login');
    showAlert(document.getElementById('login-error'), 'Tu cuenta está pendiente de activación. Tobias la revisará pronto.');
    return;
  }

  if (profile.role === 'admin') {
    await loadAdminPanel();
    showLoading(false);
    showScreen('admin');
  } else {
    await loadDashboard(profile);
    showLoading(false);
    showScreen('dashboard');
  }
}


/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */
function bindLoginEvents() {
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-email').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-pass').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('go-register').addEventListener('click', e => { e.preventDefault(); showScreen('register'); });
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const okEl  = document.getElementById('login-success');

  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!email || !pass) { showAlert(errEl, 'Completá email y contraseña.'); return; }

  const btn = document.getElementById('btn-login');
  btn.textContent = 'Ingresando...';
  btn.disabled = true;

  const result = await Auth.login(email, pass);

  btn.textContent = 'Ingresar →';
  btn.disabled = false;

  if (!result.ok) {
    const msg = result.error.includes('Invalid') || result.error.includes('invalid')
      ? 'Email o contraseña incorrectos.'
      : result.error;
    showAlert(errEl, msg);
    return;
  }

  await enterApp(result.user.id);
}


/* ══════════════════════════════════════════
   REGISTRO
══════════════════════════════════════════ */
function bindRegisterEvents() {
  document.getElementById('btn-register').addEventListener('click', doRegister);
  document.getElementById('go-login').addEventListener('click', e => { e.preventDefault(); showScreen('login'); });
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const errEl = document.getElementById('reg-error');

  errEl.style.display = 'none';

  if (!name || !email || !pass || !pass2) { showAlert(errEl, 'Completá todos los campos.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAlert(errEl, 'Ingresá un email válido.'); return; }
  if (pass.length < 6) { showAlert(errEl, 'La contraseña debe tener al menos 6 caracteres.'); return; }
  if (pass !== pass2)  { showAlert(errEl, 'Las contraseñas no coinciden.'); return; }

  const btn = document.getElementById('btn-register');
  btn.textContent = 'Creando cuenta...';
  btn.disabled = true;

  const result = await Auth.register(name, email, pass);

  btn.textContent = 'Crear cuenta →';
  btn.disabled = false;

  if (!result.ok) {
    showAlert(errEl, result.error.includes('already registered')
      ? 'Ya existe una cuenta con ese email.'
      : result.error);
    return;
  }

  ['reg-name','reg-email','reg-pass','reg-pass2'].forEach(id => document.getElementById(id).value = '');
  showScreen('login');
  showAlert(document.getElementById('login-success'), '✓ Cuenta creada. Tobias activará tu acceso en las próximas 24 hs.');
}


/* ══════════════════════════════════════════
   DASHBOARD CLIENTE
══════════════════════════════════════════ */
async function loadDashboard(profile) {
  document.getElementById('dash-avatar').textContent = profile.initials || '??';
  initMobileNav(profile);
  document.getElementById('dash-name').textContent   = profile.name;
  document.getElementById('dash-role').textContent   = profile.role === 'admin' ? 'ADMINISTRADOR' : 'CLIENTE';
  document.getElementById('admin-banner').style.display = profile.role === 'admin' ? 'flex' : 'none';

  const project = await Projects.getByClient(profile.id);

  if (project) {
    document.getElementById('hero-title').textContent    = project.name;
    document.getElementById('hero-subtitle').textContent = project.subtitle || '';
    document.getElementById('hero-badge').textContent    = project.stage || '—';
    document.getElementById('hero-updated').textContent  = '⏰ Última actualización: ' + (project.updated_at || '—');
    document.getElementById('hero-location').innerHTML   =
      `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 1C4.3 1 3 2.3 3 4c0 2.6 3 7 3 7s3-4.4 3-7c0-1.7-1.3-3-3-3z"/><circle cx="6" cy="4" r="1"/></svg> ${project.location || ''}`;
    document.getElementById('hero-stage').innerHTML =
      `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1"><rect x="1" y="2" width="10" height="9" rx="1"/><path d="M1 5h10M4 1v2M8 1v2"/></svg> ${project.stage || ''}`;

    // Stats — mostrar siempre, independiente de los archivos
    document.getElementById('stat-surface').innerHTML    = project.surface   ? `${project.surface} <span class="stat-unit">m²</span>`   : '— <span class="stat-unit">m²</span>';
    document.getElementById('stat-covered').innerHTML    = project.covered   ? `${project.covered} <span class="stat-unit">m²</span>`    : '— <span class="stat-unit">m²</span>';
    document.getElementById('stat-rooms').textContent     = project.rooms     || '—';
    document.getElementById('stat-bathrooms').textContent = project.bathrooms || '—';
    document.getElementById('stat-materials').textContent = project.materials || '—';

    // Cargar archivos (renders, planos, tour) — por separado para no bloquear los stats
    try { await loadProjectFiles(project, profile); } catch(e) { console.warn('loadProjectFiles error:', e); }
  } else {
    document.getElementById('hero-title').textContent    = 'Sin proyecto asignado';
    document.getElementById('hero-subtitle').textContent = 'Contactá a Tobias para más información';
    document.getElementById('hero-badge').textContent    = '—';
    document.getElementById('hero-updated').textContent  = '';
  }
}

function bindDashboardEvents() {
  document.getElementById('btn-logout').addEventListener('click', doLogout);

  const goAdmin = document.getElementById('go-admin-panel');
  if (goAdmin) {
    goAdmin.addEventListener('click', async e => {
      e.preventDefault();
      showLoading(true);
      await loadAdminPanel();
      showLoading(false);
      showScreen('admin');
    });
  }

  document.getElementById('tour-rooms').addEventListener('click', e => {
    if (e.target.classList.contains('room-btn')) {
      document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  document.getElementById('planos-tabs').addEventListener('click', e => {
    if (e.target.classList.contains('plano-tab')) {
      document.querySelectorAll('.plano-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById('plano-preview').textContent = e.target.textContent + ' · Escala 1:100';
    }
  });
}


/* ══════════════════════════════════════════
   PANEL ADMIN
══════════════════════════════════════════ */
async function loadAdminPanel() {
  initAdminMobileNav();
  initUploadZones();
  await renderUsersTable();
  await renderProjectsTable();
  await populateClientSelect();
}

function bindAdminEvents() {
  document.getElementById('btn-logout-admin').addEventListener('click', doLogout);

  document.getElementById('admin-go-dash').addEventListener('click', async e => {
    e.preventDefault();
    const user = await Auth.getCurrentUser();
    if (user) {
      const profile = await Profiles.getOwn(user.id);
      if (profile) { await loadDashboard(profile); showScreen('dashboard'); }
    }
  });

  // Tabs botones
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Tabs sidebar
  document.querySelectorAll('[data-tab-trigger]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tabName = link.dataset.tabTrigger;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabName));
      document.querySelectorAll('[data-tab-trigger]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Form usuario
  document.getElementById('btn-add-user').addEventListener('click', () => {
    document.getElementById('form-add-user').style.display = 'block';
    document.getElementById('btn-add-user').style.display  = 'none';
  });
  document.getElementById('btn-cancel-user').addEventListener('click', () => {
    document.getElementById('form-add-user').style.display = 'none';
    document.getElementById('btn-add-user').style.display  = 'inline-block';
  });
  document.getElementById('btn-save-user').addEventListener('click', saveNewUser);

  // Form proyecto
  document.getElementById('btn-add-project').addEventListener('click', async () => {
    document.getElementById('form-add-project').style.display = 'block';
    document.getElementById('btn-add-project').style.display  = 'none';
    await populateClientSelect();
  });
  document.getElementById('btn-cancel-project').addEventListener('click', () => {
    document.getElementById('form-add-project').style.display = 'none';
    document.getElementById('btn-add-project').style.display  = 'inline-block';
  });
  document.getElementById('btn-save-project').addEventListener('click', saveNewProject);
}

/* ── Tabla usuarios ── */
async function renderUsersTable() {
  const users = await Profiles.getAll();
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-4);text-align:center;padding:24px">No hay usuarios registrados</td></tr>';
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar" style="width:26px;height:26px;font-size:9px;${u.role==='admin'?'background:var(--gold-dim);border:1px solid var(--gold-bdr);':''}">${u.initials||'??'}</div>
          <span>${u.name}</span>
        </div>
      </td>
      <td style="color:var(--text-2);font-size:11px">${u.id}</td>
      <td><span class="badge ${u.role==='admin'?'badge-admin':'badge-client'}">${u.role==='admin'?'Admin':'Cliente'}</span></td>
      <td><span class="badge ${u.status==='active'?'badge-active':'badge-pending'}">${u.status==='active'?'Activo':'Pendiente'}</span></td>
      <td>
        <div class="table-actions">
          ${u.status==='pending'?`<button class="btn-table" data-action="activate" data-id="${u.id}">Activar</button>`:''}
          ${u.role!=='admin'?`<button class="btn-table danger" data-action="delete-user" data-id="${u.id}">Eliminar</button>`:''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'activate') {
        const ok = await Profiles.updateStatus(id, 'active');
        if (ok) { await renderUsersTable(); showAdminAlert('user-alert', '✓ Usuario activado.'); }
        else showAdminAlert('user-alert', '✗ Error al activar.', true);
      }
      if (action === 'delete-user') {
        if (confirm('¿Eliminar este usuario?')) {
          const ok = await Profiles.delete(id);
          if (ok) { await renderUsersTable(); await populateClientSelect(); showAdminAlert('user-alert', '✓ Usuario eliminado.'); }
          else showAdminAlert('user-alert', '✗ Error al eliminar.', true);
        }
      }
    });
  });
}

/* ── Tabla proyectos ── */
async function renderProjectsTable() {
  const projects = await Projects.getAll();
  const tbody = document.getElementById('projects-tbody');
  tbody.innerHTML = '';

  if (!projects.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-4);text-align:center;padding:24px">No hay proyectos creados</td></tr>';
    return;
  }

  projects.forEach(p => {
    const clientName = p.profiles?.name || '<span style="color:var(--text-4)">Sin asignar</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:400;color:var(--text-0)">${p.name}</td>
      <td style="color:var(--text-2)">${p.subtitle||'—'}</td>
      <td><span class="badge badge-client">${p.stage||'—'}</span></td>
      <td>${clientName}</td>
      <td>
        <div class="table-actions">
          <button class="btn-table" data-action="edit-project" data-id="${p.id}">Editar</button>
          <button class="btn-table danger" data-action="delete-project" data-id="${p.id}">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, id } = btn.dataset;
      if (action === 'edit-project') {
        await openEditProject(id);
      }
      if (action === 'delete-project') {
        if (confirm('¿Eliminar este proyecto?')) {
          const ok = await Projects.delete(id);
          if (ok) { await renderProjectsTable(); showAdminAlert('proj-alert', '✓ Proyecto eliminado.'); }
          else showAdminAlert('proj-alert', '✗ Error al eliminar.', true);
        }
      }
    });
  });
}

/* ── Select clientes ── */
async function populateClientSelect() {
  const sel = document.getElementById('new-proj-client');
  if (!sel) return;
  const users = await Profiles.getAll();
  const clients = users.filter(u => u.role === 'client');
  sel.innerHTML = clients.length
    ? clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    : '<option value="">No hay clientes aún</option>';
}


/* ══════════════════════════════════════════
   EDIT PROJECT PANEL
══════════════════════════════════════════ */
async function openEditProject(projId) {
  const projects = await Projects.getAll();
  const proj = projects.find(p => p.id === projId);
  if (!proj) return;

  const panel = document.getElementById('edit-project-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('editing-proj-id').value        = proj.id;
  document.getElementById('edit-panel-title').textContent = `Editando: ${proj.name}`;
  document.getElementById('edit-proj-name').value         = proj.name || '';
  document.getElementById('edit-proj-sub').value          = proj.subtitle || '';
  document.getElementById('edit-proj-loc').value          = proj.location || '';
  document.getElementById('edit-proj-materials').value    = proj.materials || '';
  document.getElementById('edit-proj-surface').value      = proj.surface || '';
  document.getElementById('edit-proj-covered').value      = proj.covered || '';
  document.getElementById('edit-proj-rooms').value        = proj.rooms || '';
  document.getElementById('edit-proj-bathrooms').value    = proj.bathrooms || '';
  document.getElementById('edit-proj-kuula').value        = proj.kuula_url || '';

  const stageEl = document.getElementById('edit-proj-stage');
  Array.from(stageEl.options).forEach(o => o.selected = o.value === proj.stage);

  const clientSel = document.getElementById('edit-proj-client');
  const users = await Profiles.getAll();
  const clients = users.filter(u => u.role === 'client');
  clientSel.innerHTML = clients.map(c =>
    `<option value="${c.id}" ${c.id === proj.client_id ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  await loadEditCurrentFiles(proj.id);
  initEditUploadZones(proj.id);

  document.getElementById('btn-close-edit').onclick    = () => { panel.style.display = 'none'; clearEditUploadZones(); };
  document.getElementById('btn-update-project').onclick = () => updateProject(proj.id);
  document.getElementById('btn-update-kuula').onclick   = () => updateKuula(proj.id);
  document.getElementById('btn-upload-edit-files').onclick = () => uploadEditFiles(proj.id);
}

async function loadEditCurrentFiles(projId) {
  const renders = await Storage.list(projId, 'renders');
  const rendersEl = document.getElementById('edit-renders-current');
  rendersEl.innerHTML = renders.length
    ? renders.map(r => `
        <div class="edit-file-item">
          <img src="${r.url}" loading="lazy"/>
          <button class="edit-file-delete" data-path="${r.path}" title="Eliminar">✕</button>
        </div>`).join('')
    : '';

  rendersEl.querySelectorAll('.edit-file-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este render?')) return;
      await Storage.delete(btn.dataset.path);
      await loadEditCurrentFiles(projId);
    });
  });

  const planos = await Storage.list(projId, 'planos');
  const planosEl = document.getElementById('edit-planos-current');
  planosEl.innerHTML = planos.length
    ? planos.map(p => `
        <div class="plano-preview-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          <span class="plano-name">${p.name}</span>
          <a href="${p.url}" target="_blank" class="plano-status ok" style="text-decoration:none">Ver ↗</a>
          <button class="btn-table danger" data-path="${p.path}" style="font-size:10px;padding:3px 8px">✕</button>
        </div>`).join('')
    : '';

  planosEl.querySelectorAll('[data-path]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este plano?')) return;
      await Storage.delete(btn.dataset.path);
      await loadEditCurrentFiles(projId);
    });
  });
}

let editPendingRenders = [];
let editPendingPlanos  = [];

function initEditUploadZones(projId) {
  editPendingRenders = [];
  editPendingPlanos  = [];

  const ri = document.getElementById('edit-renders-input');
  const rt = document.getElementById('edit-renders-trigger');
  const rd = document.getElementById('edit-renders-drop');
  if (ri) {
    rt.onclick  = () => ri.click();
    ri.onchange = e => addEditRenders(e.target.files);
    rd.ondragover  = e => { e.preventDefault(); rd.classList.add('drag-over'); };
    rd.ondragleave = () => rd.classList.remove('drag-over');
    rd.ondrop = e => { e.preventDefault(); rd.classList.remove('drag-over'); addEditRenders(e.dataTransfer.files); };
  }

  const pi = document.getElementById('edit-planos-input');
  const pt = document.getElementById('edit-planos-trigger');
  const pd = document.getElementById('edit-planos-drop');
  if (pi) {
    pt.onclick  = () => pi.click();
    pi.onchange = e => addEditPlanos(e.target.files);
    pd.ondragover  = e => { e.preventDefault(); pd.classList.add('drag-over'); };
    pd.ondragleave = () => pd.classList.remove('drag-over');
    pd.ondrop = e => { e.preventDefault(); pd.classList.remove('drag-over'); addEditPlanos(e.dataTransfer.files); };
  }
}

function addEditRenders(files) {
  const preview = document.getElementById('edit-renders-preview');
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    editPendingRenders.push(file);
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `<img src="${URL.createObjectURL(file)}"/><div class="preview-status pending">Pendiente</div>`;
    preview.appendChild(item);
  });
}

function addEditPlanos(files) {
  const preview = document.getElementById('edit-planos-preview');
  Array.from(files).forEach(file => {
    if (file.type !== 'application/pdf') return;
    editPendingPlanos.push(file);
    const item = document.createElement('div');
    item.className = 'plano-preview-item';
    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
      <span class="plano-name">${file.name}</span>
      <span class="plano-size">${(file.size/1024/1024).toFixed(1)} MB</span>
      <span class="plano-status pending">Pendiente</span>`;
    preview.appendChild(item);
  });
}

async function uploadEditFiles(projId) {
  const btn = document.getElementById('btn-upload-edit-files');
  btn.textContent = 'Subiendo...';
  btn.disabled = true;

  if (editPendingRenders.length > 0) {
    const prog = document.getElementById('edit-renders-progress');
    const bar  = document.getElementById('edit-renders-bar');
    const txt  = document.getElementById('edit-renders-text');
    prog.style.display = 'flex';
    const items = document.querySelectorAll('#edit-renders-preview .preview-item');
    for (let i = 0; i < editPendingRenders.length; i++) {
      txt.textContent = `Subiendo render ${i+1} de ${editPendingRenders.length}...`;
      bar.style.setProperty('--progress', `${(i/editPendingRenders.length)*100}%`);
      const result = await Storage.upload(projId, 'renders', editPendingRenders[i]);
      const status = items[i]?.querySelector('.preview-status');
      if (status) { status.className = 'preview-status '+(result.ok?'ok':'err'); status.textContent = result.ok?'✓':'Error'; }
    }
    bar.style.setProperty('--progress', '100%');
    txt.textContent = `✓ ${editPendingRenders.length} renders subidos`;
  }

  if (editPendingPlanos.length > 0) {
    const prog = document.getElementById('edit-planos-progress');
    const txt  = document.getElementById('edit-planos-text');
    prog.style.display = 'flex';
    const items = document.querySelectorAll('#edit-planos-preview .plano-preview-item');
    for (let i = 0; i < editPendingPlanos.length; i++) {
      txt.textContent = `Subiendo plano ${i+1} de ${editPendingPlanos.length}...`;
      const result = await Storage.upload(projId, 'planos', editPendingPlanos[i]);
      const status = items[i]?.querySelector('.plano-status');
      if (status) { status.className = 'plano-status '+(result.ok?'ok':'err'); status.textContent = result.ok?'✓ Subido':'Error'; }
    }
    txt.textContent = `✓ ${editPendingPlanos.length} planos subidos`;
  }

  btn.textContent = 'Subir archivos seleccionados';
  btn.disabled = false;
  await loadEditCurrentFiles(projId);
  clearEditUploadZones();
  showAdminAlert('proj-alert', '✓ Archivos subidos correctamente.');
}

async function updateProject(projId) {
  const btn = document.getElementById('btn-update-project');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const { error } = await db
    .from('projects')
    .update({
      name:       document.getElementById('edit-proj-name').value.trim(),
      subtitle:   document.getElementById('edit-proj-sub').value.trim(),
      location:   document.getElementById('edit-proj-loc').value.trim(),
      stage:      document.getElementById('edit-proj-stage').value,
      client_id:  document.getElementById('edit-proj-client').value,
      surface:    document.getElementById('edit-proj-surface').value || null,
      covered:    document.getElementById('edit-proj-covered').value || null,
      rooms:      document.getElementById('edit-proj-rooms').value || null,
      bathrooms:  document.getElementById('edit-proj-bathrooms').value || null,
      materials:  document.getElementById('edit-proj-materials').value.trim(),
      updated_at: new Date().toLocaleDateString('es-AR'),
    })
    .eq('id', projId);

  btn.textContent = 'Guardar cambios';
  btn.disabled = false;

  if (error) { showAdminAlert('proj-alert', '✗ Error: ' + error.message, true); return; }
  await renderProjectsTable();
  showAdminAlert('proj-alert', '✓ Proyecto actualizado.');
}

async function updateKuula(projId) {
  const url = document.getElementById('edit-proj-kuula').value.trim();
  const ok  = await Projects.updateKuula(projId, url);
  if (ok) showAdminAlert('proj-alert', '✓ Tour 360° guardado.');
  else    showAdminAlert('proj-alert', '✗ Error al guardar Kuula.', true);
}

function clearEditUploadZones() {
  editPendingRenders = [];
  editPendingPlanos  = [];
  ['edit-renders-preview','edit-planos-preview'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  ['edit-renders-input','edit-planos-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['edit-renders-progress','edit-planos-progress'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
}

/* ── Guardar usuario ── */
async function saveNewUser() {
  const name  = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim();
  const pass  = document.getElementById('new-user-pass').value.trim();
  const role  = document.getElementById('new-user-role').value;

  if (!name || !email || !pass) { alert('Completá todos los campos.'); return; }

  const btn = document.getElementById('btn-save-user');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const result = await Profiles.createByAdmin(name, email, pass, role);

  btn.textContent = 'Guardar usuario';
  btn.disabled = false;

  if (!result.ok) { alert('Error: ' + result.error); return; }

  document.getElementById('form-add-user').style.display = 'none';
  document.getElementById('btn-add-user').style.display  = 'inline-block';
  ['new-user-name','new-user-email','new-user-pass'].forEach(id => document.getElementById(id).value = '');

  await renderUsersTable();
  await populateClientSelect();
  showAdminAlert('user-alert', `✓ Usuario "${name}" creado.`);
}

/* ── Guardar proyecto ── */
async function saveNewProject() {
  const name      = document.getElementById('new-proj-name').value.trim();
  const subtitle  = document.getElementById('new-proj-sub').value.trim();
  const location  = document.getElementById('new-proj-loc').value.trim();
  const stage     = document.getElementById('new-proj-stage').value;
  const clientId  = document.getElementById('new-proj-client').value;
  const surface   = document.getElementById('new-proj-surface').value;
  const covered   = document.getElementById('new-proj-covered').value;
  const rooms     = document.getElementById('new-proj-rooms').value;
  const bathrooms = document.getElementById('new-proj-bathrooms').value;
  const materials = document.getElementById('new-proj-materials').value.trim();

  if (!name || !subtitle || !location) { alert('Completá nombre, subtítulo y ubicación.'); return; }

  const btn = document.getElementById('btn-save-project');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const result = await Projects.create({ name, subtitle, location, stage, clientId, surface, covered, rooms, bathrooms, materials });

  btn.textContent = 'Guardar proyecto';
  btn.disabled = false;

  if (!result.ok) { alert('Error: ' + result.error); return; }

  // Guardar URL de Kuula si se ingresó
  const kuulaUrl = document.getElementById('new-proj-kuula').value.trim();
  if (kuulaUrl && result.project) {
    await Projects.updateKuula(result.project.id, kuulaUrl);
  }

  // Subir archivos
  if (result.project && (pendingRenders.length > 0 || pendingPlanos.length > 0)) {
    btn.textContent = 'Subiendo archivos...';
    await uploadProjectFiles(result.project.id);
  }

  document.getElementById('form-add-project').style.display = 'none';
  document.getElementById('btn-add-project').style.display  = 'inline-block';
  ['new-proj-name','new-proj-sub','new-proj-loc','new-proj-surface','new-proj-covered','new-proj-rooms','new-proj-bathrooms','new-proj-materials','new-proj-kuula']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  clearUploadZones();

  await renderProjectsTable();
  showAdminAlert('proj-alert', `✓ Proyecto "${name}" creado correctamente.`);
}


/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
async function doLogout() {
  await Auth.logout();
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value  = '';
  document.getElementById('login-error').style.display   = 'none';
  document.getElementById('login-success').style.display = 'none';
  showScreen('login');
}


/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function showAlert(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}

function showAdminAlert(id, msg, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? 'var(--danger-bg)' : 'var(--success-bg)';
  el.style.borderColor = isError ? 'var(--danger-bdr)' : 'var(--success-bdr)';
  el.style.color = isError ? 'var(--danger)' : 'var(--success)';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}


/* ══════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════ */
function initMobileNav(profile) {
  // Logout móvil
  const mobileLogout = document.getElementById('btn-logout-mobile');
  if (mobileLogout) {
    mobileLogout.addEventListener('click', doLogout);
  }

  // Nombre en header móvil
  const mobileName = document.getElementById('mobile-user-name');
  if (mobileName) mobileName.textContent = profile.name.split(' ')[0];

  // Bottom nav — scroll a sección
  const mobileNav = document.getElementById('mobile-nav');
  if (!mobileNav) return;

  const sectionMap = {
    'inicio':   '.project-hero',
    'renders':  '.sections-grid .section-panel:nth-child(1)',
    'tour':     '.sections-grid .section-panel:nth-child(2)',
    'planos':   '.sections-grid .section-panel:nth-child(3)',
    'info':     '.info-section',
  };

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      mobileNav.querySelectorAll('a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const section = link.dataset.mobileSection;
      const target = document.querySelector(sectionMap[section]);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


/* ══════════════════════════════════════════
   MOBILE NAV — ADMIN
══════════════════════════════════════════ */
function initAdminMobileNav() {
  // Logout móvil admin
  const mobileLogout = document.getElementById('btn-logout-admin-mobile');
  if (mobileLogout) mobileLogout.addEventListener('click', doLogout);

  // Nav — Dashboard
  const navDash = document.getElementById('admin-nav-dash');
  if (navDash) {
    navDash.addEventListener('click', async e => {
      e.preventDefault();
      setAdminMobileActive(navDash);
      const user = await Auth.getCurrentUser();
      if (user) {
        const profile = await Profiles.getOwn(user.id);
        if (profile) { await loadDashboard(profile); showScreen('dashboard'); }
      }
    });
  }

  // Nav — Usuarios
  const navUsuarios = document.getElementById('admin-nav-usuarios');
  if (navUsuarios) {
    navUsuarios.addEventListener('click', e => {
      e.preventDefault();
      setAdminMobileActive(navUsuarios);
      // Activar tab usuarios
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'usuarios'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-usuarios'));
      document.getElementById('tab-usuarios').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Nav — Proyectos
  const navProyectos = document.getElementById('admin-nav-proyectos');
  if (navProyectos) {
    navProyectos.addEventListener('click', e => {
      e.preventDefault();
      setAdminMobileActive(navProyectos);
      // Activar tab proyectos
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'proyectos'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-proyectos'));
      document.getElementById('tab-proyectos').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function setAdminMobileActive(el) {
  document.querySelectorAll('#admin-mobile-nav a').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
}


/* ══════════════════════════════════════════
   UPLOAD — RENDERS
══════════════════════════════════════════ */
let pendingRenders = []; // archivos a subir
let pendingPlanos  = [];
let currentProjectId = null;

function initUploadZones() {
  // ── Renders ──
  const rendersInput   = document.getElementById('renders-input');
  const rendersTrigger = document.getElementById('renders-trigger');
  const rendersArea    = document.getElementById('renders-drop-area');

  if (!rendersInput) return;

  rendersTrigger.addEventListener('click', () => rendersInput.click());
  rendersInput.addEventListener('change', e => addRenderFiles(e.target.files));

  rendersArea.addEventListener('dragover', e => { e.preventDefault(); rendersArea.classList.add('drag-over'); });
  rendersArea.addEventListener('dragleave', () => rendersArea.classList.remove('drag-over'));
  rendersArea.addEventListener('drop', e => {
    e.preventDefault();
    rendersArea.classList.remove('drag-over');
    addRenderFiles(e.dataTransfer.files);
  });

  // ── Planos ──
  const planosInput   = document.getElementById('planos-input');
  const planosTrigger = document.getElementById('planos-trigger');
  const planosArea    = document.getElementById('planos-drop-area');

  planosTrigger.addEventListener('click', () => planosInput.click());
  planosInput.addEventListener('change', e => addPlanoFiles(e.target.files));

  planosArea.addEventListener('dragover', e => { e.preventDefault(); planosArea.classList.add('drag-over'); });
  planosArea.addEventListener('dragleave', () => planosArea.classList.remove('drag-over'));
  planosArea.addEventListener('drop', e => {
    e.preventDefault();
    planosArea.classList.remove('drag-over');
    addPlanoFiles(e.dataTransfer.files);
  });
}

function addRenderFiles(files) {
  const preview = document.getElementById('renders-preview');
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    pendingRenders.push(file);

    const item = document.createElement('div');
    item.className = 'preview-item';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    const status = document.createElement('div');
    status.className = 'preview-status pending';
    status.textContent = 'Pendiente';
    item.appendChild(img);
    item.appendChild(status);
    preview.appendChild(item);
  });
}

function addPlanoFiles(files) {
  const preview = document.getElementById('planos-preview');
  Array.from(files).forEach(file => {
    if (file.type !== 'application/pdf') return;
    pendingPlanos.push(file);

    const item = document.createElement('div');
    item.className = 'plano-preview-item';
    item.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
      <span class="plano-name">${file.name}</span>
      <span class="plano-size">${(file.size/1024/1024).toFixed(1)} MB</span>
      <span class="plano-status pending">Pendiente</span>
    `;
    preview.appendChild(item);
  });
}

async function uploadProjectFiles(projectId) {
  // Subir renders
  if (pendingRenders.length > 0) {
    const prog = document.getElementById('renders-progress');
    const progBar = document.getElementById('renders-progress-bar');
    const progText = document.getElementById('renders-progress-text');
    prog.style.display = 'flex';

    const items = document.querySelectorAll('#renders-preview .preview-item');
    for (let i = 0; i < pendingRenders.length; i++) {
      progText.textContent = `Subiendo render ${i+1} de ${pendingRenders.length}...`;
      progBar.style.setProperty('--progress', `${((i)/pendingRenders.length*100)}%`);
      const result = await Storage.upload(projectId, 'renders', pendingRenders[i]);
      const status = items[i]?.querySelector('.preview-status');
      if (status) {
        status.className = 'preview-status ' + (result.ok ? 'ok' : 'err');
        status.textContent = result.ok ? '✓' : 'Error';
      }
    }
    progBar.style.setProperty('--progress', '100%');
    progText.textContent = `✓ ${pendingRenders.length} renders subidos`;
  }

  // Subir planos
  if (pendingPlanos.length > 0) {
    const prog = document.getElementById('planos-progress');
    const progText = document.getElementById('planos-progress-text');
    prog.style.display = 'flex';

    const items = document.querySelectorAll('#planos-preview .plano-preview-item');
    for (let i = 0; i < pendingPlanos.length; i++) {
      progText.textContent = `Subiendo plano ${i+1} de ${pendingPlanos.length}...`;
      const result = await Storage.upload(projectId, 'planos', pendingPlanos[i]);
      const status = items[i]?.querySelector('.plano-status');
      if (status) {
        status.className = 'plano-status ' + (result.ok ? 'ok' : 'err');
        status.textContent = result.ok ? '✓ Subido' : 'Error';
      }
    }
    progText.textContent = `✓ ${pendingPlanos.length} planos subidos`;
  }

  pendingRenders = [];
  pendingPlanos  = [];
}

function clearUploadZones() {
  pendingRenders = [];
  pendingPlanos  = [];
  const rp = document.getElementById('renders-preview');
  const pp = document.getElementById('planos-preview');
  if (rp) rp.innerHTML = '';
  if (pp) pp.innerHTML = '';
  const ri = document.getElementById('renders-input');
  const pi = document.getElementById('planos-input');
  if (ri) ri.value = '';
  if (pi) pi.value = '';
  ['renders-progress','planos-progress'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}


/* ══════════════════════════════════════════
   DASHBOARD — CARGAR ARCHIVOS DEL PROYECTO
══════════════════════════════════════════ */
async function loadProjectFiles(project, profile) {
  if (!project) return;
  const isAdmin = profile?.role === 'admin';

  // Marcar el dashboard como admin para mostrar botones
  const dash = document.getElementById('screen-dashboard');
  if (isAdmin) dash.classList.add('is-admin');
  else dash.classList.remove('is-admin');

  // ── Renders ──
  const renders = await Storage.list(project.id, 'renders');
  const rendersPanel = document.querySelector('#screen-dashboard .sections-grid .section-panel:nth-child(1)');
  const rendersGrid  = document.getElementById('renders-grid');

  // Botón subir renders (solo admin)
  if (isAdmin) {
    const head = rendersPanel?.querySelector('.section-head');
    if (head && !head.querySelector('.section-upload-btn')) {
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'section-upload-btn';
      uploadBtn.textContent = '+ Subir renders';
      uploadBtn.addEventListener('click', () => openDashUploadModal('renders', project.id));
      head.appendChild(uploadBtn);
    }
  }

  if (rendersGrid) {
    if (renders.length > 0) {
      rendersGrid.className = 'renders-viewer-grid';
      rendersGrid.innerHTML = `
        <div class="render-img-main" data-idx="0">
          <img src="${renders[0].url}" alt="Render principal" loading="lazy"/>
        </div>
        ${renders.slice(1,5).map((r,i) => `
          <div class="render-img-thumb" data-idx="${i+1}">
            <img src="${r.url}" alt="Render ${i+2}" loading="lazy"/>
          </div>
        `).join('')}
      `;
      initLightbox(renders.map(r => r.url));
    } else {
      rendersGrid.className = '';
      rendersGrid.innerHTML = '<div class="render-main render-ph r1" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-4);letter-spacing:1px">Sin renders aún</div>';
    }
  }

  // ── Tour 360° Kuula ──
  const tourPanel  = document.querySelector('#screen-dashboard .sections-grid .section-panel:nth-child(2)');
  const tourViewer = tourPanel?.querySelector('.tour-viewer');

  if (isAdmin) {
    const head = tourPanel?.querySelector('.section-head');
    if (head && !head.querySelector('.section-upload-btn')) {
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'section-upload-btn';
      uploadBtn.textContent = '+ Tour 360°';
      uploadBtn.addEventListener('click', () => openDashUploadModal('tour', project.id));
      head.appendChild(uploadBtn);
    }
  }

  if (project.kuula_url && tourViewer) {
    tourViewer.outerHTML = `<div class="tour-embed"><iframe src="${project.kuula_url}" allowfullscreen allow="xr-spatial-tracking"></iframe></div>`;
  }

  // ── Planos ──
  const planos     = await Storage.list(project.id, 'planos');
  const planosPanel = document.querySelector('#screen-dashboard .sections-grid .section-panel:nth-child(3)');
  const planosWrap  = planosPanel?.querySelector('.planos-wrap');

  if (isAdmin) {
    const head = planosPanel?.querySelector('.section-head');
    if (head && !head.querySelector('.section-upload-btn')) {
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'section-upload-btn';
      uploadBtn.textContent = '+ Subir planos';
      uploadBtn.addEventListener('click', () => openDashUploadModal('planos', project.id));
      head.appendChild(uploadBtn);
    }
  }

  if (planosWrap) {
    if (planos.length > 0) {
      planosWrap.innerHTML = `
        <ul class="planos-list" id="planos-tabs">
          ${planos.map((p,i) => `
            <li class="plano-item ${i===0?'active':''}" data-url="${p.url}" data-name="${p.name}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              ${p.name.replace('.pdf','').replace(/-/g,' ')}
            </li>
          `).join('')}
        </ul>
        <div class="plano-viewer-frame" id="plano-frame">
          <iframe src="${planos[0].url}#toolbar=0" title="Plano"></iframe>
          <a class="plano-download-btn" href="${planos[0].url}" download target="_blank">Descargar ↓</a>
        </div>
      `;
      document.querySelectorAll('.plano-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.plano-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          document.getElementById('plano-frame').innerHTML = `
            <iframe src="${item.dataset.url}#toolbar=0" title="Plano"></iframe>
            <a class="plano-download-btn" href="${item.dataset.url}" download target="_blank">Descargar ↓</a>
          `;
        });
      });
    }
  }
}


/* ══════════════════════════════════════════
   DASHBOARD UPLOAD MODAL
══════════════════════════════════════════ */
let dashUploadType    = null;
let dashUploadProjId  = null;
let dashPendingFiles  = [];

function openDashUploadModal(type, projId) {
  dashUploadType   = type;
  dashUploadProjId = projId;
  dashPendingFiles = [];

  // Crear modal si no existe
  if (!document.getElementById('dash-upload-modal')) {
    const overlay = document.createElement('div');
    overlay.id = 'dash-upload-modal';
    overlay.className = 'upload-modal-overlay';
    overlay.innerHTML = `
      <div class="upload-modal">
        <div class="upload-modal-header">
          <h3 class="upload-modal-title" id="dash-modal-title">Subir archivos</h3>
          <button class="btn-ghost-light" id="dash-modal-close">✕</button>
        </div>
        <div id="dash-modal-body"></div>
        <div style="display:flex;gap:12px;margin-top:20px">
          <button class="btn-gold" id="dash-modal-upload">Subir archivos</button>
          <button class="btn-ghost-light" id="dash-modal-cancel">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('dash-modal-close').addEventListener('click', closeDashUploadModal);
    document.getElementById('dash-modal-cancel').addEventListener('click', closeDashUploadModal);
    document.getElementById('dash-modal-upload').addEventListener('click', doDashUpload);
  }

  const titles = { renders: '+ Subir Renders', tour: '+ Tour 360° Kuula', planos: '+ Subir Planos' };
  document.getElementById('dash-modal-title').textContent = titles[type];

  const body = document.getElementById('dash-modal-body');

  if (type === 'tour') {
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Link embed de Kuula</label>
        <input class="form-input" type="text" id="dash-kuula-input" placeholder="https://kuula.co/share/XXXXX?fs=1&vr=0"/>
        <p style="font-size:10px;color:var(--text-4);margin-top:8px">En Kuula → tu tour → Share → Embed → copiá la URL del src del iframe</p>
      </div>
    `;
  } else {
    const accept = type === 'renders' ? 'image/jpeg,image/png,image/webp' : 'application/pdf';
    const hint   = type === 'renders' ? 'JPG, PNG · Máx 10MB' : 'PDF · Máx 20MB';
    body.innerHTML = `
      <input type="file" id="dash-file-input" multiple accept="${accept}" style="display:none"/>
      <div class="upload-zone-inner" id="dash-drop-area" style="border:0.5px dashed var(--line);border-radius:var(--radius);margin-bottom:10px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        <p>Arrastrá o <span class="upload-link" id="dash-file-trigger">seleccioná archivos</span></p>
        <p class="upload-hint">${hint}</p>
      </div>
      <div id="dash-files-preview"></div>
      <div class="upload-progress" id="dash-upload-progress" style="display:none">
        <div class="upload-progress-bar" id="dash-upload-bar"></div>
        <span id="dash-upload-text">Subiendo...</span>
      </div>
    `;

    setTimeout(() => {
      const fi = document.getElementById('dash-file-input');
      const ft = document.getElementById('dash-file-trigger');
      const da = document.getElementById('dash-drop-area');
      ft.addEventListener('click', () => fi.click());
      fi.addEventListener('change', e => addDashFiles(e.target.files));
      da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('drag-over'); });
      da.addEventListener('dragleave', () => da.classList.remove('drag-over'));
      da.addEventListener('drop', e => { e.preventDefault(); da.classList.remove('drag-over'); addDashFiles(e.dataTransfer.files); });
    }, 50);
  }

  document.getElementById('dash-upload-modal').classList.add('open');
}

function addDashFiles(files) {
  const preview = document.getElementById('dash-files-preview');
  Array.from(files).forEach(file => {
    dashPendingFiles.push(file);
    if (dashUploadType === 'renders') {
      const item = document.createElement('div');
      item.className = 'preview-item';
      item.style.cssText = 'display:inline-block;width:80px;height:60px;margin:3px;';
      item.innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover;border-radius:2px"/>`;
      preview.appendChild(item);
    } else {
      const item = document.createElement('div');
      item.className = 'plano-preview-item';
      item.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        <span class="plano-name">${file.name}</span>
        <span class="plano-size">${(file.size/1024/1024).toFixed(1)} MB</span>
      `;
      preview.appendChild(item);
    }
  });
}

async function doDashUpload() {
  const btn = document.getElementById('dash-modal-upload');
  btn.textContent = 'Subiendo...';
  btn.disabled = true;

  if (dashUploadType === 'tour') {
    const url = document.getElementById('dash-kuula-input').value.trim();
    if (!url) { alert('Ingresá el link de Kuula.'); btn.textContent = 'Subir archivos'; btn.disabled = false; return; }
    const ok = await Projects.updateKuula(dashUploadProjId, url);
    if (ok) {
      closeDashUploadModal();
      // Recargar dashboard
      const user = await Auth.getCurrentUser();
      const profile = await Profiles.getOwn(user.id);
      await loadDashboard(profile);
    }
    return;
  }

  if (dashPendingFiles.length === 0) { alert('Seleccioná al menos un archivo.'); btn.textContent = 'Subir archivos'; btn.disabled = false; return; }

  const prog = document.getElementById('dash-upload-progress');
  const bar  = document.getElementById('dash-upload-bar');
  const txt  = document.getElementById('dash-upload-text');
  prog.style.display = 'flex';

  for (let i = 0; i < dashPendingFiles.length; i++) {
    txt.textContent = `Subiendo ${i+1} de ${dashPendingFiles.length}...`;
    bar.style.setProperty('--progress', `${(i/dashPendingFiles.length)*100}%`);
    await Storage.upload(dashUploadProjId, dashUploadType, dashPendingFiles[i]);
  }

  bar.style.setProperty('--progress', '100%');
  txt.textContent = `✓ Listo`;

  setTimeout(async () => {
    closeDashUploadModal();
    const user = await Auth.getCurrentUser();
    const profile = await Profiles.getOwn(user.id);
    await loadDashboard(profile);
  }, 800);
}

function closeDashUploadModal() {
  const modal = document.getElementById('dash-upload-modal');
  if (modal) modal.classList.remove('open');
  dashPendingFiles = [];
}