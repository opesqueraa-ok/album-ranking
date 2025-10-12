// auth.v7.0.js
(function(){
  const $=s=>document.querySelector(s);

  async function promptSignIn(){
    const email = prompt('Enter your email to sign in:');
    if(!email) return;
    const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin }});
    if(error){ alert('Sign-in failed: '+error.message); return; }
    alert('Check your email for the magic link.');
  }

  async function signOut(){
    await sb.auth.signOut();
  }

  function setAuthUI(session){
    const u = session?.user || null;
    const status = $('#authStatus');
    const btnIn = $('#btnSignIn');
    const btnOut = $('#btnSignOut');
    if(u){
      status.style.display='inline';
      status.textContent = u.email || (u.identities?.[0]?.identity_data?.email) || 'Signed in';
      btnIn.style.display='none';
      btnOut.style.display='inline-block';
    }else{
      status.style.display='none';
      status.textContent='';
      btnIn.style.display='inline-block';
      btnOut.style.display='none';
    }
  }

  function bind(){
    const inBtn = $('#btnSignIn'); if(inBtn && !inBtn._b){ inBtn._b=true; inBtn.addEventListener('click', promptSignIn); }
    const outBtn = $('#btnSignOut'); if(outBtn && !outBtn._b){ outBtn._b=true; outBtn.addEventListener('click', signOut); }

    sb.auth.getSession().then(({ data })=> setAuthUI(data.session));
    sb.auth.onAuthStateChange((_evt, session)=> setAuthUI(session));
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})();
