<script>
/* auth.v7.1.js – maneja login Google y el intercambio del código/token */

(function () {
  const $ = s => document.querySelector(s);
  const sb = window.sb; // creado en index.html

  // --- UI ---
  function paintAuthUI(session) {
    const u = session?.user || null;
    const email = u?.email || u?.identities?.[0]?.identity_data?.email || '';
    const st   = $('#authStatus');
    const btnIn  = $('#btnSignIn');
    const btnOut = $('#btnSignOut');
    const btnLib = $('#btnLibrary');
    const btnSave = $('#btnSaveToLibrary');
    const btnExpLib = $('#btnExportLibrary');
    const lblImpLib = document.querySelector('label[for="fileImportLibrary"]');

    if (u) {
      if (st) { st.style.display = 'inline'; st.textContent = email; }
      if (btnIn)  btnIn.style.display  = 'none';
      if (btnOut) btnOut.style.display = 'inline-block';
      [btnLib, btnSave, btnExpLib, lblImpLib].forEach(b => { if (b) b.disabled = false; });
    } else {
      if (st) { st.style.display = 'none'; st.textContent = ''; }
      if (btnIn)  btnIn.style.display  = 'inline-block';
      if (btnOut) btnOut.style.display = 'none';
      [btnLib, btnSave, btnExpLib, lblImpLib].forEach(b => { if (b) b && (b.disabled = true); });
    }
  }

  // --- Manejo del retorno OAuth (code o #access_token) ---
  async function handleOAuthReturn() {
    const url = new URL(window.location.href);

    // 1) Flujo PKCE (?code=...)
    if (url.searchParams.get('code')) {
      const { data, error } = await sb.auth.exchangeCodeForSession(window.location.href);
      if (error) console.error('exchangeCodeForSession error:', error);
    }

    // 2) Flujo implícito (#access_token=..., #refresh_token=...)
    if (url.hash && url.hash.includes('access_token=')) {
      const params = new URLSearchParams(url.hash.slice(1));
      const access_token  = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) console.error('setSession error:', error);
      }
    }

    // 3) Limpia la URL (mantén ?v=7.1)
    const clean = url.pathname + (url.search.includes('v=') ? url.search : '?v=7.1');
    if (url.search || url.hash) history.replaceState({}, document.title, clean);
  }

  // --- Acciones ---
  async function signInGoogle() {
    const redirectTo = window.SITE_URL || (location.origin + location.pathname);
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) { alert('No se pudo iniciar sesión: ' + error.message); }
  }

  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) alert('No se pudo cerrar sesión: ' + error.message);
  }

  // --- Bind ---
  async function boot() {
    await handleOAuthReturn();

    // pinta estado actual
    sb.auth.getSession().then(({ data }) => paintAuthUI(data.session));

    // escucha cambios
    sb.auth.onAuthStateChange((_evt, session) => {
      paintAuthUI(session);
      // si abriste Library antes de loguearte, al loguear refresca su contenido
      if (session?.user) window.Library?.refresh?.();
    });

    // botones
    const btnIn  = $('#btnSignIn');
    const btnOut = $('#btnSignOut');
    if (btnIn && !btnIn._b)  { btnIn._b = true;  btnIn.addEventListener('click', signInGoogle); }
    if (btnOut && !btnOut._b){ btnOut._b = true; btnOut.addEventListener('click', signOut); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>
