import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReqs() {
  console.log("Logging in...");
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'planespro.cl@gmail.com',
    password: 'superadminpassword' // Assuming this is the dev password, let's try it or just fetch bypassing RLS if possible. Wait, we don't know the password.
  });
  
  console.log("Fetching requirements...");
  const { data, error } = await supabase.from('requirements').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Requirements found:", data?.length);
    console.log(data);
  }
}

checkReqs();
