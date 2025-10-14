// auth.v7.1.js
(() => {
  const $ = (s) => document.querySelector(s);

  // --- Google OAuth (via Supabase) ---
  async function signIn() {
    try {
      const redirectTo = window.SITE_URL; // vuelve a la misma página
      const { error } = await window.sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // La redirección la maneja Google/Supabase
    } catch (e) {
      alert("No se pudo iniciar sesión con Google.");
      console.error(e);
    }
  }

  async function signOut() {
    try {
      await window.sb.auth.signOut();
    } finally {
      updateAuthUI(); // refresca visibilidad de botones
    }
  }

  async function updateAuthUI() {
    try {
      const { data } = await window.sb.auth.getSession();
      const session = data?.session || null;
      const user = session?.user || null;

      const $in = $("#btnSignIn");
      const $out = $("#btnSignOut");
      const $lib = $("#btnLibrary");
      const $exp = $("#btnExportLibrary");
      const $imp = document.querySelector("label[for='fileImport']");
      const $status = $("#authStatus");

      const signed = !!user;

      if ($in) $in.style.display = signed ? "none" : "inline-block";
      if ($out) $out.style.display = signed ? "inline-block" : "none";
      if ($lib) $lib.disabled = !signed;
      if ($exp) $exp.disabled = !signed;
      if ($imp) $imp.style.opacity = signed ? "1" : ".5";

      if ($status) {
        if (signed) {
          $status.style.display = "inline";
          $status.textContent = user.email || "Logged in";
        } else {
          $status.style.display = "none";
          $status.textContent = "";
        }
      }
    } catch (e) {
      console.warn("updateAuthUI:", e);
    }
  }

  function bind() {
    const inBtn = $("#btnSignIn");
    const outBtn = $("#btnSignOut");

    if (inBtn && !inBtn._b) {
      inBtn._b = true;
      inBtn.addEventListener("click", signIn);
    }
    if (outBtn && !outBtn._b) {
      outBtn._b = true;
      outBtn.addEventListener("click", signOut);
    }

    window.sb.auth.onAuthStateChange(() => updateAuthUI());
    updateAuthUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
