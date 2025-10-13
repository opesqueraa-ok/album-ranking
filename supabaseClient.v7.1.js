<!-- supabaseClient.v7.1.js -->
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

  // === Credenciales del proyecto ===
  const SUPABASE_URL = 'https://dfnrrkopmdnkpsrxlqew.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbnJya29wbWRua3BzcnhscWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzA5NjYsImV4cCI6MjA3NTg0Njk2Nn0.Z3Bl1xfV943MBSW068AlDaN74XxIwsbsILKEE2ECse8';

  // Crear cliente Supabase global (disponible para otros scripts)
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // === Autenticación con Google ===
  async function signInWithGoogle() {
    try {
      const redirectTo = location.origin + location.pathname;
      const { error } = await window.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Supabase] Login error:', err);
      alert('No se pudo iniciar sesión con Google.');
    }
  }

  async function signOut() {
    try {
      const { error } = await window.supabase.auth.signOut();
      if (error) throw error;
      location.reload();
    } catch (err) {
      console.error('[Supabase] Logout error:', err);
      alert('Error al cerrar sesión.');
    }
  }

  // === Estado de sesión ===
  async function refreshAuthUI() {
    const { data } = await window.supabase.auth.getSession();
    const user = data?.session?.user;
    const loginBtn = document.getElementById('btnSigninGoogle');
    const logoutBtn = document.getElementById('btnSignout');
    const saveBtn = document.getElementById('btnSaveToLibrary');
    const myLibBtn = document.getElementById('btnMyLibrary');
    const badge = document.getElementById('userEmailBadge');

    const logged = !!user;
    if (loginBtn) loginBtn.style.display = logged ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = logged ? '' : 'none';
    if (saveBtn) saveBtn.style.display = logged ? '' : 'none';
    if (myLibBtn) myLibBtn.style.display = logged ? '' : 'none';
    if (badge) {
      badge.style.display = logged ? 'inline-block' : 'none';
      badge.textContent = logged ? user.email : '';
    }
  }

  // === Eventos ===
  document.addEventListener('DOMContentLoaded', () => {
    const inBtn = document.getElementById('btnSigninGoogle');
    const outBtn = document.getElementById('btnSignout');
    if (inBtn) inBtn.addEventListener('click', signInWithGoogle);
    if (outBtn) outBtn.addEventListener('click', signOut);

    window.supabase.auth.onAuthStateChange(refreshAuthUI);
    refreshAuthUI();
  });
</script>
