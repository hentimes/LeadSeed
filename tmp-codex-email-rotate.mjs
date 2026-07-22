const fetch = global.fetch;
const BASE = 'https://pfoikdneixbvpozbtqcx.supabase.co/functions/v1';
const today = new Date();
const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
const to = new Date(from); to.setUTCDate(to.getUTCDate()+30);
const fmt = d => d.toISOString().slice(0,10);
async function getAvailability(params, origin) {
  const res = await fetch(`${BASE}/form-public-availability?${params.toString()}`, { headers: { origin, referer: origin.endsWith('/') ? origin : `${origin}/` } });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}
function pickFree(payload){ for (const day of payload.slot_grid||[]) for (const slot of day.slots||[]) if(!slot.disabled && ((slot.status||'').toLowerCase()==='free' || !slot.status)) return slot; return null; }
function buildFd({name,email,phone,slot,channel,captureRef}) {
  const fd = new FormData();
  fd.set('website',''); fd.set('form_started_at', String(Date.now()-8000)); fd.set('anti_spam_guard','honeypot+timing+rate-limit');
  fd.set('nombre', name); fd.set('name', name); fd.set('email', email); fd.set('telefono', phone); fd.set('phone', phone);
  fd.set('rango_edad','26-35'); fd.set('sistema_salud','Fonasa'); fd.set('rango_renta','$500.000 - $800.000'); fd.set('comuna','Santiago');
  fd.set('comentario', `Prueba post-key-rotate ${channel} ${new Date().toISOString()}`);
  fd.set('contacto_preferencia','agendar_reunion'); fd.set('cita_fecha_hora',slot.starts_at); fd.set('cita_slot',slot.starts_at); fd.set('cita_dia',String(slot.starts_at).slice(0,10)); fd.set('cita_estado','Confirmada');
  fd.set('servicio','Analisis Isapre Personalizado'); fd.set('sheetName','PlanesPro Leads'); fd.set('source_hostname','planespro.cl');
  if (channel === 'pb') {
    fd.set('fuente_cta','PB'); fd.set('campana',captureRef); fd.set('origen_formulario','pb'); fd.set('pagina_origen','/pb/');
    fd.set('source_channel','pb'); fd.set('source_form_variant','pb-long-form'); fd.set('source_path','/pb/'); fd.set('source_url',`https://planespro.cl/pb/?ref=${captureRef}`); fd.set('capture_ref',captureRef); fd.set('first_touch_ref',captureRef); fd.set('ref',captureRef);
  } else {
    fd.set('fuente_cta','PlanesPro'); fd.set('campana','General'); fd.set('origen_formulario','planespro-general'); fd.set('pagina_origen','/');
    fd.set('source_channel','general'); fd.set('source_form_variant','planespro-general'); fd.set('source_path','/'); fd.set('source_url','https://planespro.cl/');
  }
  return fd;
}
async function submit(fd, origin) {
  const res = await fetch(`${BASE}/form-leads`, { method: 'POST', headers: { origin, referer: origin.endsWith('/') ? origin : `${origin}/` }, body: fd });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}
async function runCase(label, channel, captureRef = '') {
  const params = new URLSearchParams({ from: fmt(from), to: fmt(to), source_channel: channel, _ts: String(Date.now()) });
  if (captureRef) params.set('ref', captureRef);
  const availability = await getAvailability(params, 'https://planespro.cl');
  const slot = pickFree(availability.json);
  if (!availability.ok || !slot) return { label, availability, submit: null };
  const fd = buildFd({ name: `Codex ${label}`, email: 'hentimes@gmail.com', phone: channel === 'pb' ? '934567832' : '934567831', slot, channel, captureRef });
  const result = await submit(fd, 'https://planespro.cl');
  return { label, availability: { status: availability.status, slot }, submit: result };
}
(async()=>{
  const results = [];
  results.push(await runCase('General External Final', 'general'));
  results.push(await runCase('PB External Final', 'pb', 'pp-e6efca41f40449c0adde9f65b3219f02'));
  console.log(JSON.stringify(results, null, 2));
})();
