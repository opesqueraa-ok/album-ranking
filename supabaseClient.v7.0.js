// supabaseClient.v7.0.js
(function(){
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('Supabase URL/KEY missing. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY.');
  }
  const { createClient } = window.supabase;
  window.sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
