import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('template_lists').insert({ name: 'Test', color: '#ff0000', type: 'whatsapp', user_id: 'test' }).select('*');
  console.log('INSERT RESULT:', data);
  console.log('INSERT ERROR:', error);
}
test();
