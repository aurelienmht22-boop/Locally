const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'locally-photos'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { partner_id, entity, image_base64 } = await req.json()

    if (!partner_id || !entity || !image_base64) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants (partner_id, entity, image_base64)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!['candidate', 'menu_item'].includes(entity)) {
      return new Response(JSON.stringify({ error: 'entity doit être "candidate" ou "menu_item"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeaders = { 'apikey': key, 'Authorization': `Bearer ${key}` }

    // Verify partner exists and is approved
    const partnerRes = await fetch(
      `${url}/rest/v1/candidates?id=eq.${encodeURIComponent(partner_id)}&status=eq.approuve&select=id`,
      { headers: authHeaders }
    )
    const partners = await partnerRes.json()
    if (!Array.isArray(partners) || partners.length === 0) {
      return new Response(JSON.stringify({ error: 'Partenaire non autorisé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse data URI  →  data:image/jpeg;base64,/9j/4AAQ...
    const match = image_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
    if (!match) {
      return new Response(JSON.stringify({ error: 'Format base64 invalide — attendu: data:<mime>;base64,<data>' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const mimeType = match[1]
    const base64Data = match[2]
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'

    // Decode base64 → binary
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    // Build storage path
    // candidate profile: always same path → overwrites on re-upload
    // menu item: timestamp → unique per upload (no item_id needed)
    const path = entity === 'candidate'
      ? `partners/${partner_id}/photo.${ext}`
      : `menu/${partner_id}/${Date.now()}.${ext}`

    // Upload to Supabase Storage via service role
    const uploadRes = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: bytes,
    })

    if (!uploadRes.ok) {
      const detail = await uploadRes.text()
      return new Response(JSON.stringify({ error: 'Erreur upload Storage', detail }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
