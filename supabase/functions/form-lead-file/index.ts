import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UPLOAD_BUCKET = 'planespro-form-uploads'

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && origin.startsWith('chrome-extension://')
    ? origin
    : (origin || 'http://localhost:5173')

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
