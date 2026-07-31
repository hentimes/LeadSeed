-- Agregar preferencia de cliente de WhatsApp a la tabla user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS whatsapp_client_preference text DEFAULT 'web';
