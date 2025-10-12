<!-- supabaseClient.js -->
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  // === TUS CREDENCIALES ===
  const SUPABASE_URL = 'https://dfnrrkopmdnkpsrxlqew.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbnJya29wbWRua3BzcnhscWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzA5NjYsImV4cCI6MjA3NTg0Njk2Nn0.Z3Bl1xfV943MBSW068AlDaN74XxIwsbsILKEE2ECse8';

  // Cliente
  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Helpers de Auth (Google)
  export async function signInWithGoogle() {
    // Redirige de vuelta a la misma página después del login
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) {
      console.error(error);
      alert('No se pudo iniciar sesión con Google.');
    }
  }

  export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      alert('No se pudo cerrar sesión.');
    } else {
      // refresca UI
      window.location.reload();
    }
  }

  export async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  }

  // Vincula los botones si existen
  async function wireAuthButtons() {
    const loginBtn  = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userSpan  = document.getElementById('userInfo');

    const user = await getCurrentUser();

    if (userSpan) {
      userSpan.textContent = user ? (user.email || 'Logged in') : '';
    }
    if (loginBtn)  loginBtn.style.display  = user ? 'none' : 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = user ? 'inline-flex' : 'none';

    if (loginBtn && !loginBtn._bound) {
      loginBtn._bound = true;
      loginBtn.addEventListener('click', signInWithGoogle);
    }
    if (logoutBtn && !logoutBtn._bound) {
      logoutBtn._bound = true;
      logoutBtn.addEventListener('click', signOut);
    }
  }

  // Reacciona a cambios de sesión
  supabase.auth.onAuthStateChange(() => wireAuthButtons());

  // Primer pintado
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    wireAuthButtons();
  } else {
    document.addEventListener('DOMContentLoaded', wireAuthButtons);
  }
</script>
