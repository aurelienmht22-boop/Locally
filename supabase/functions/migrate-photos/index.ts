const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
}

const BUCKET = 'locally-photos'

async function uploadBase64(storageUrl: string, key: string, path: string, dataUri: string): Promise<{ url: string | null; detail: string }> {
  const match = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!match) return { url: null, detail: 'regex_no_match: data URI ne correspond pas au format attendu' }

  const mimeType = match[1]
  const base64Data = match[2]

  let bytes: Uint8Array
  try {
    const binaryStr = atob(base64Data)
    bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  } catch (e) {
    return { url: null, detail: `atob_failed: ${String(e)}` }
  }

  const uploadUrl = `${storageUrl}/storage/v1/object/${BUCKET}/${path}`
  let res: Response
  try {
    res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: bytes,
    })
  } catch (e) {
    return { url: null, detail: `fetch_failed: ${String(e)} url=${uploadUrl}` }
  }

  if (!res.ok) {
    const body = await res.text()
    return { url: null, detail: `storage_error: status=${res.status} url=${uploadUrl} mime=${mimeType} size=${bytes.length} body=${body}` }
  }
  return { url: `${storageUrl}/storage/v1/object/public/${BUCKET}/${path}`, detail: 'ok' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const secret = Deno.env.get('LOCALLY_SECRET') ?? ''
    if (!secret || req.headers.get('x-locally-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeaders = { 'apikey': key, 'Authorization': `Bearer ${key}` }

    const report = {
      candidates: { migrated: 0, skipped: 0, errors: [] as string[] },
      menu_items: { migrated: 0, skipped: 0, errors: [] as string[] },
    }

    // ── CANDIDATES ────────────────────────────────────────────────────────────
    // Fetch IDs of candidates that still have base64 photos
    const candIdsRes = await fetch(
      `${url}/rest/v1/candidates?photo_url=like.data%3A*&select=id`,
      { headers: authHeaders }
    )
    const candIds: Array<{ id: string }> = await candIdsRes.json()

    for (const { id } of candIds) {
      try {
        // Fetch photo_url one row at a time to avoid memory spikes
        const rowRes = await fetch(
          `${url}/rest/v1/candidates?id=eq.${encodeURIComponent(id)}&select=photo_url&limit=1`,
          { headers: authHeaders }
        )
        const [row] = await rowRes.json()
        if (!row?.photo_url?.startsWith('data:')) { report.candidates.skipped++; continue }

        const ext = row.photo_url.includes('png') ? 'png' : row.photo_url.includes('webp') ? 'webp' : 'jpg'
        const path = `partners/${id}/photo.${ext}`
        const { url: publicUrl, detail: upDetail } = await uploadBase64(url, key, path, row.photo_url)

        if (!publicUrl) { report.candidates.errors.push(`Upload échoué candidate ${id}: ${upDetail}`); continue }

        const patchRes = await fetch(`${url}/rest/v1/candidates?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...authHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ photo_url: publicUrl }),
        })
        if (!patchRes.ok) {
          report.candidates.errors.push(`PATCH échoué pour candidate ${id}: ${await patchRes.text()}`)
          continue
        }
        report.candidates.migrated++
      } catch (e) {
        report.candidates.errors.push(`Erreur candidate ${id}: ${String(e)}`)
      }
    }

    // ── MENU ITEMS ────────────────────────────────────────────────────────────
    const itemIdsRes = await fetch(
      `${url}/rest/v1/menu_items?photo_url=like.data%3A*&select=id,partner_id`,
      { headers: authHeaders }
    )
    const itemIds: Array<{ id: string; partner_id: string }> = await itemIdsRes.json()

    for (const { id, partner_id } of itemIds) {
      try {
        const rowRes = await fetch(
          `${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(id)}&select=photo_url&limit=1`,
          { headers: authHeaders }
        )
        const [row] = await rowRes.json()
        if (!row?.photo_url?.startsWith('data:')) { report.menu_items.skipped++; continue }

        const ext = row.photo_url.includes('png') ? 'png' : row.photo_url.includes('webp') ? 'webp' : 'jpg'
        const path = `menu/${partner_id}/${id}.${ext}`
        const { url: publicUrl, detail: upDetail } = await uploadBase64(url, key, path, row.photo_url)

        if (!publicUrl) { report.menu_items.errors.push(`Upload échoué menu_item ${id}: ${upDetail}`); continue }

        const patchRes = await fetch(`${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...authHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ photo_url: publicUrl }),
        })
        if (!patchRes.ok) {
          report.menu_items.errors.push(`PATCH échoué pour menu_item ${id}: ${await patchRes.text()}`)
          continue
        }
        report.menu_items.migrated++
      } catch (e) {
        report.menu_items.errors.push(`Erreur menu_item ${id}: ${String(e)}`)
      }
    }

    return new Response(JSON.stringify({ success: true, report }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
