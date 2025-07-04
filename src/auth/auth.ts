import { supabase } from '../utils/supabase';

supabase.auth.onAuthStateChange((event, session) => {
  if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
    // The user is signed in, close this tab.
    // The onAuthStateChange listener in the sidepanel will handle updating the UI.
    setTimeout(() => {
      window.close();
    }, 1000);
  }
}); 