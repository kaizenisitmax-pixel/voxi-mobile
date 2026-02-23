import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://blckiefpjkuytdraokwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsY2tpZWZwamt1eXRkcmFva3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDQ3MDIsImV4cCI6MjA4NzQyMDcwMn0.Wh3UkQYFQKvc-Ug5a3NGLaYakinXK9mDmB6ZK5bDT1M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
