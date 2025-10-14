// auth.v7.1.js
(function () {
  const $ = s => document.querySelector(s);

  function setAuthUI(session) {
    const u = session?.user || null;
    const status = $('#authStatus');
    const btnIn  = $('#btnSignIn');
    const btnOut = $('#btnSignOut');

    if (u) {
      status.style.display = 'inline';
      status.textContent = u.email || 'Signed in';
      btnIn.style.display = 'none';
      btnOut.style.display = 'inline-block';
    } else {
      status.style.display = 'none';
      status.textContent = '';
      btnIn.style.display = 'inline-block';
      btnOut.style.display = 'none';
    }

    // Mostrar/ocultar acciones de Library
    const btnLib  = $('#btnLibrary');
    const btnSave = $('#btnSaveToLibrary');
    if (btnLib)  btnLib.disabled  = !u;
    if (btnSave) btnSave.disabled = !u;
  }

  async function signInWithGoogle() {
    const redirectTo = window.SITE_URL || (location.origin + location.pathname);
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) alert('No se pudo iniciar sesión: ' + error.message);
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  function bind() {
    const inBtn  = $('#btnSignIn');  if (inBtn  && !inBtn._b) { inBtn._b  = true; inBtn.addEventListener('click', signInWithGoogle); }
    const outBtn = $('#btnSignOut'); if (outBtn && !outBtn._b){ outBtn._b = true; outBtn.addEventListener('click', signOut); }

    // Primer pintado + suscripción
    sb.auth.getSession().then(({ data }) => setAuthUI(data.session));
    sb.auth.onAuthStateChange((_evt, session) => setAuthUI(session));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
