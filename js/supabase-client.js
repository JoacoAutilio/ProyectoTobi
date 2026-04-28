/* ═══════════════════════════════════════════
   TSP ARQUITECTURA · supabase-client.js
   Configuración y acceso a Supabase.
═══════════════════════════════════════════ */

const SUPABASE_URL = 'https://fhyrhevilhbcpsbvmubi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeXJoZXZpbGhiY3BzYnZtdWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjE4MTksImV4cCI6MjA5Mjc5NzgxOX0.tcAsDbDjgrHZQ1z43JgACydhvT6xk5wCdT3eJP8SCkg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
const Auth = {

  async login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  },

  async register(name, email, password) {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'client' } }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  },

  async logout() {
    await db.auth.signOut();
  },

  async getSession() {
    const { data } = await db.auth.getSession();
    return data.session;
  },

  async getCurrentUser() {
    const { data } = await db.auth.getUser();
    return data.user || null;
  },

  onAuthChange(callback) {
    db.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
};


/* ══════════════════════════════════════════
   PERFILES
══════════════════════════════════════════ */
const Profiles = {

  async getOwn(userId) {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  async getAll() {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data;
  },

  async updateStatus(userId, status) {
    const { error } = await db
      .from('profiles')
      .update({ status })
      .eq('id', userId);
    return !error;
  },

  async delete(userId) {
    // Elimina el perfil (el usuario de auth se borra en cascada)
    const { error } = await db
      .from('profiles')
      .delete()
      .eq('id', userId);
    return !error;
  },

  // Crear usuario directamente desde admin (usa service role en prod)
  // Por ahora usamos signUp normal
  async createByAdmin(name, email, password, role) {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
};


/* ══════════════════════════════════════════
   PROYECTOS
══════════════════════════════════════════ */
const Projects = {

  async getByClient(clientId) {
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .single();
    if (error) return null;
    return data;
  },

  async getAll() {
    const { data, error } = await db
      .from('projects')
      .select(`
        *,
        profiles ( name, email )
      `)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data;
  },

  async create(projData) {
    const { data, error } = await db
      .from('projects')
      .insert([{
        name:        projData.name,
        subtitle:    projData.subtitle,
        location:    projData.location,
        stage:       projData.stage,
        client_id:   projData.clientId,
        surface:     projData.surface     || null,
        covered:     projData.covered     || null,
        rooms:       projData.rooms       || null,
        bathrooms:   projData.bathrooms   || null,
        materials:   projData.materials   || null,
        updated_at:  new Date().toLocaleDateString('es-AR'),
      }])
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, project: data };
  },

  async delete(projId) {
    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', projId);
    return !error;
  }
};
