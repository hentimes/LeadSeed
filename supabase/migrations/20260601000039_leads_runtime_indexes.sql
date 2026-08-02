create index if not exists leads_active_user_created_at_idx
  on public.leads (user_id, created_at desc)
  where deleted_at is null;

create index if not exists leads_deleted_user_deleted_at_idx
  on public.leads (user_id, deleted_at desc, created_at desc)
  where deleted_at is not null;

create index if not exists lead_cross_exec_events_lead_created_at_idx
  on public.lead_cross_exec_events (lead_id, created_at desc);

create index if not exists send_logs_user_lead_type_idx
  on public.send_logs (user_id, lead_id, template_type);

create index if not exists send_logs_user_sent_at_idx
  on public.send_logs (user_id, sent_at desc);
