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

    await loadProjectFiles(project);
  if (project.surface)   document.getElementById('stat-surface').innerHTML    = `${project.surface} <span class="stat-unit">m²</span>`;
    if (project.covered)   document.getElementById('stat-covered').innerHTML    = `${project.covered} <span class="stat-unit">m²</span>`;
    if (project.rooms)     document.getElementById('stat-rooms').textContent     = project.rooms;
    if (project.bathrooms) document.getElementById('stat-bathrooms').textContent = project.bathrooms;
    if (project.materials) document.getElementById('stat-materials').textContent = project.materials;
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
      <td style="color:var(--text-2)">${p.location||'—'}</td>
      <td><span class="badge badge-client">${p.stage||'—'}</span></td>
      <td>${clientName}</td>
      <td>
        <div class="table-actions">
          <button class="btn-table danger" data-action="delete-project" data-id="${p.id}">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="delete-project"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Eliminar este proyecto?')) {
        const ok = await Projects.delete(btn.dataset.id);
        if (ok) { await renderProjectsTable(); showAdminAlert('proj-alert', '✓ Proyecto eliminado.'); }
        else showAdminAlert('proj-alert', '✗ Error al eliminar.', true);
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
async function loadProjectFiles(project) {
  if (!project) return;

  // ── Renders ──
  const renders = await Storage.list(project.id, 'renders');
  const rendersGrid = document.getElementById('renders-grid');
  if (rendersGrid) {
    if (renders.length > 0) {
      rendersGrid.className = 'renders-viewer-grid';
      rendersGrid.innerHTML = `
        <div class="render-img-main" data-idx="0">
          <img src="${renders[0].url}" alt="Render principal" loading="lazy"/>
        </div>
        ${renders.slice(1, 5).map((r, i) => `
          <div class="render-img-thumb" data-idx="${i+1}">
            <img src="${r.url}" alt="Render ${i+2}" loading="lazy"/>
          </div>
        `).join('')}
      `;
      // Lightbox
      initLightbox(renders.map(r => r.url));
    } else {
      rendersGrid.className = '';
      rendersGrid.innerHTML = '<div class="render-main render-ph r1">Sin renders aún</div>';
    }
  }

  // ── Tour 360 Kuula ──
  const tourSection = document.querySelector('#screen-dashboard .section-panel:nth-child(2)');
  if (tourSection && project.kuula_url) {
    const viewer = tourSection.querySelector('.tour-viewer');
    if (viewer) {
      viewer.outerHTML = `<div class="tour-embed"><iframe src="${project.kuula_url}" allowfullscreen allow="xr-spatial-tracking"></iframe></div>`;
    }
  }

  // ── Planos ──
  const planos = await Storage.list(project.id, 'planos');
  const planosWrap = document.querySelector('#screen-dashboard .planos-wrap');
  if (planosWrap) {
    if (planos.length > 0) {
      planosWrap.innerHTML = `
        <ul class="planos-list" id="planos-tabs">
          ${planos.map((p, i) => `
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
      // Click en tabs de planos
      document.querySelectorAll('.plano-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.plano-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const frame = document.getElementById('plano-frame');
          frame.innerHTML = `
            <iframe src="${item.dataset.url}#toolbar=0" title="Plano"></iframe>
            <a class="plano-download-btn" href="${item.dataset.url}" download target="_blank">Descargar ↓</a>
          `;
        });
      });
    } else {
      planosWrap.innerHTML = `
        <ul class="planos-tabs" id="planos-tabs">
          <li class="plano-tab active">Sin planos aún</li>
        </ul>
        <div class="plano-preview">Subí planos desde el panel admin</div>
      `;
    }
  }
}

/* Lightbox */
let lightboxImages = [];
let lightboxIndex  = 0;

function initLightbox(urls) {
  lightboxImages = urls;

  // Crear lightbox si no existe
  if (!document.getElementById('lightbox')) {
    const lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <button class="lightbox-close" id="lb-close">✕</button>
      <button class="lightbox-prev" id="lb-prev">‹</button>
      <img id="lb-img" src="" alt=""/>
      <button class="lightbox-next" id="lb-next">›</button>
    `;
    document.body.appendChild(lb);
    document.getElementById('lb-close').addEventListener('click', closeLightbox);
    document.getElementById('lb-prev').addEventListener('click', () => moveLightbox(-1));
    document.getElementById('lb-next').addEventListener('click', () => moveLightbox(1));
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  }

  // Clicks en renders
  document.querySelectorAll('.render-img-main, .render-img-thumb').forEach(el => {
    el.addEventListener('click', () => {
      lightboxIndex = parseInt(el.dataset.idx) || 0;
      openLightbox();
    });
  });
}

function openLightbox() {
  document.getElementById('lb-img').src = lightboxImages[lightboxIndex];
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

function moveLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
  document.getElementById('lb-img').src = lightboxImages[lightboxIndex];
}