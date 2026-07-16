import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'internal_messages' });
  console.log('RPC Error:', error);
  
  // Try inserting a fake message with context_req_id to see what error we get from the driver
  const { data: d2, error: e2 } = await supabase.from('internal_messages').insert({
    sender_id: '11111111-1111-1111-1111-111111111111',
    receiver_id: '22222222-2222-2222-2222-222222222222',
    message: 'test',
    context_req_id: '33333333-3333-3333-3333-333333333333'
  });
  console.log('Insert Error:', e2);
}

checkSchema();
