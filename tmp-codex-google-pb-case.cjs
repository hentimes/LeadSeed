const { createClient } = require('./node_modules/@supabase/supabase-js');
const url = 'https://pfoikdneixbvpozbtqcx.supabase.co';
const key = 'IEBO-5qlcLhLOM7F2VqS9ic6HoNlVfp76yYbDFhubv8';
const supabase = createClient(url, key);
(async () => {
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id,user_id,name,email,phone,created_at,metadata')
    .filter('metadata->>capture_ref', 'eq', 'pp-e6efca41f40449c0adde9f65b3219f02')
    .order('created_at', { ascending: false })
    .limit(5);
  if (leadsError) {
    console.error(JSON.stringify({ stage: 'leads', error: leadsError }, null, 2));
    process.exit(1);
  }
  const leadIds = (leads || []).map((lead) => lead.id);
  const { data: appointments, error: appointmentsError } = leadIds.length
    ? await supabase
        .from('appointments')
        .select('id,lead_id,user_id,status,start_time,google_sync_status,google_sync_error,google_event_id,meet_link,created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
    : { data: [], error: null };
  if (appointmentsError) {
    console.error(JSON.stringify({ stage: 'appointments', error: appointmentsError }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ leads, appointments }, null, 2));
})();
