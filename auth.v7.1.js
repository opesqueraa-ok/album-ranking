// auth.v7.1.js — Magic link fallback + UI status, compatible con ui.v7.1.js
(function () {
  const $ = (s) => document.querySelector(s);

  // Cliente Supabase perezoso usando las credenciales globales del index
  let _sb = null;
  function sb() {
    if (_sb) return _sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      console.warn('[auth.v7.1] Supabase CDN o claves no disponibles aún.');
      throw new Error('Supabase not ready');
    }
    _sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return _sb;
  }

  // Limpia fragmentos ?refresh o #access_token de la URL después del callback
  function cleanCallbackURL() {
    try {
      const hasHashToken = location.hash.includes('access_token=') || location.hash.includes('refresh_token=');
      const hasType = /[?&]type=/.test(location.search) || /[?&]code=/.test(location.search);
      if (hasHashToken || hasType) {
        const url = location.origin + location.pathname + (window.SITE_VERSION ? `?v=${window.SITE_VERSION}` : '');
        history.replaceState(null, '', url || location.pathname);
      }
    } catch {}
  }

  // --- Auth por email (fallback) ---
  async function promptSignInEmail() {
    const email = prompt('Enter your email to sign in:');
    if (!email) return;
    try {
      const { error } = await sb().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.SITE_URL || (location.origin + location.pathname) },
      });
      if (error) throw error;
      alert('Check your email for the magic link.');
    } catch (e) {
      alert('Sign-in failed: ' + (e?.message || 'Unknown error'));
      console.error(e);
    }
  }

  async function signOut() {
    try {
      await sb().auth.signOut();
    } catch (e) {
      console.warn(e);
    } finally {
      updateAuthUI(null);
    }
  }

  // --- UI mínima para btnSignIn / btnSignOut (si existen) ---
  function updateAuthUI(session) {
    const u = session?.user || null;
    const status = $('#authStatus');
    const btnIn = $('#btnSignIn');   // botón de "sign in por email" opcional
    const btnOut = $('#btnSignOut'); // botón de "sign out" opcional

    if (status) {
      if (u) {
        const mail = u.email || u.user_metadata?.email || 'Signed in';
        status.style.display = 'inline';
        status.textContent = mail;
      } else {
        status.style.display = 'none';
        status.textContent = '';
      }
    }
    if (btnIn) btnIn.style.display = u ? 'none' : 'inline-block';
    if (btnOut) btnOut.style.display = u ? 'inline-block' : 'none';
  }

  function bind() {
    const inBtn = $('#btnSignIn');
    if (inBtn && !inBtn._b) {
      inBtn._b = true;
      inBtn.addEventListener('click', (e) => {
        e.preventDefault();
        promptSignInEmail();
      });
    }

    const outBtn = $('#btnSignOut');
    if (outBtn && !outBtn._b) {
      outBtn._b = true;
      outBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut();
      });
    }

    // Primer pintado de estado
    sb()
      .auth.getSession()
      .then(({ data }) => {
        updateAuthUI(data?.session || null);
        cleanCallbackURL(); // limpia URL si venimos de callback
      })
      .catch(() => {});

    // Reaccionar a cambios de sesión
    sb().auth.onAuthStateChange((_evt, session) => {
      updateAuthUI(session);
      // Tras OAuth o magic link, limpia URL una sola vez
      cleanCallbackURL();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        bind();
      } catch (e) {
        console.warn('[auth.v7.1] bind error', e);
      }
    });
  } else {
    try {
      bind();
    } catch (e) {
      console.warn('[auth.v7.1] bind error', e);
    }
  }
})();
