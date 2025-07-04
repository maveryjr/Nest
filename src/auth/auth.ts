import { supabase } from '../utils/supabase';

console.log('Auth page script loaded.');

// This function handles the session and closes the window
const handleSession = (session) => {
  if (session) {
    console.log('Session detected, closing window.');
    // The main onAuthStateChange listener in the sidepanel will handle the UI update.
    window.close();
  } else {
    console.log('No session found.');
  }
};

// Listen for future auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth event: ${event}`);
  if (event === 'SIGNED_IN') {
    handleSession(session);
  }
});

// Also check for the session immediately on load, in case the event has already fired
supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('Initial session check complete.');
  handleSession(session);
}); 