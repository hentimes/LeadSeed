-- Query permanente
-- Dominio: admin / rpc
-- Objetivo: permitir transferencias administrativas de leads y templates entre usuarios

CREATE OR REPLACE FUNCTION public.admin_transfer_leads(target_user_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET user_id = target_user_id,
      updated_at = now()
  WHERE id = ANY(lead_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transfer_templates(target_user_id uuid, template_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.templates
  SET user_id = target_user_id
  WHERE id = ANY(template_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_transfer_leads(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_templates(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
