-- Query permanente
-- Dominio: planespro / storage
-- Objetivo: permitir a usuarios autenticados del CRM leer adjuntos privados de PlanesPro mediante URLs firmadas

DROP POLICY IF EXISTS "Authenticated users can read PlanesPro uploads" ON storage.objects;

CREATE POLICY "Authenticated users can read PlanesPro uploads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'planespro-form-uploads'
  AND auth.role() = 'authenticated'
);
