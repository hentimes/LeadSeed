import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UPLOAD_BUCKET = 'planespro-form-uploads'

const DEFAULT_ORIGIN = 'https://planespro.cl'

/**
 * Origenes web permitidos. Misma lista que el resto de funciones del proyecto.
 *
 * No incluye la extension: su origen es `chrome-extension://<id>` y el id
 * cambia entre la version empaquetada y la cargada sin empaquetar en
 * desarrollo, asi que no puede escribirse aca de forma fija.
 */
const allowedOrigins = new Set([
  'https://planespro.cl',
  'https://www.planespro.cl',
  'https://form.planespro.cl',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
])

/**
 * Ids de extension autorizados, separados por coma, via secreto de Supabase.
 *
 * Si el secreto no esta configurado se acepta cualquier `chrome-extension://`.
 * Es deliberado: este endpoint es el que usa el CRM para leer los adjuntos de
 * un lead, y endurecerlo antes de configurar el secreto dejaria la descarga de
 * PDFs rota. Configurar `ALLOWED_EXTENSION_IDS` cierra ese margen.
 */
const allowedExtensionIds = new Set(
  (Deno.env.get('ALLOWED_EXTENSION_IDS') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
)

function isAllowedExtensionOrigin(origin: string): boolean {
  if (!origin.startsWith('chrome-extension://')) return false
  if (allowedExtensionIds.size === 0) return true

  return allowedExtensionIds.has(origin.slice('chrome-extension://'.length))
}

/**
 * Antes se reflejaba cualquier `Origin` recibido. Se cambia a allowlist para
 * alinear esta funcion con el resto del proyecto, que ya la usaba.
 *
 * El impacto real del reflejo era acotado, porque el endpoint exige
 * `Authorization: Bearer` y valida la propiedad del lead, asi que un sitio
 * cualquiera no podia obtener el token del usuario. Aun asi era la unica
 * funcion que se salia del estandar.
 */
function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && (allowedOrigins.has(origin) || isAllowedExtensionOrigin(origin))
      ? origin
      : DEFAULT_ORIGIN

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
}

async function resolveRequestPayload(request: Request) {
  if (request.method === 'GET') {
    const url = new URL(request.url)
    return {
      token: '',
      path: url.searchParams.get('path')?.trim() || '',
      download: url.searchParams.get('download') === '1',
    }
  }

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    return {
      token: typeof body?.access_token === 'string' ? body.access_token.trim() : '',
      path: typeof body?.path === 'string' ? body.path.trim() : '',
      download: body?.download === true || body?.download === '1',
    }
  }

  const formData = await request.formData()
  return {
    token: String(formData.get('access_token') || '').trim(),
    path: String(formData.get('path') || '').trim(),
    download: String(formData.get('download') || '').trim() === '1',
  }
}

function buildContentDisposition(fileName: string, download: boolean) {
  const safeFileName = fileName.replace(/["\\]/g, '_')
  const encodedFileName = encodeURIComponent(fileName)
  const mode = download ? 'attachment' : 'inline'
  return `${mode}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = request.headers.get('authorization') || ''
    const authToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    const payload = await resolveRequestPayload(request)
    const token = authToken || payload.token

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const path = payload.path

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // IDOR: hasta aca solo se comprobaba que el token fuera de ALGUN usuario
    // valido, no que la ruta pedida perteneciera a un lead suyo. Con
    // service_role la descarga de storage salta cualquier RLS, asi que sin
    // este chequeo cualquier usuario autenticado podia pedir el PDF de
    // cualquier lead con solo adivinar o filtrar la ruta.
    //
    // finalizeAttachmentForLead guarda la ruta final en leads.metadata.pdf_path
    // (unica por lead, verificado en produccion), asi que sirve para resolver
    // el dueño sin depender del formato del nombre de archivo.
    const { data: ownerLead, error: ownerError } = await supabase
      .from('leads')
      .select('user_id')
      .eq('metadata->>pdf_path', path)
      .maybeSingle()

    if (ownerError || !ownerLead) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    let isAuthorized = ownerLead.user_id === userData.user.id

    if (!isAuthorized) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle()
      isAuthorized = requesterProfile?.role === 'admin'
    }

    if (!isAuthorized) {
      // Mismo 404 que "no existe": no hay que confirmarle a quien no es dueño
      // que el archivo si existe pero pertenece a otro.
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).download(path)

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const fileName = path.split('/').pop() || 'documento.pdf'

    return new Response(data.stream(), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': data.type || 'application/pdf',
        'Content-Disposition': buildContentDisposition(fileName, payload.download),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
