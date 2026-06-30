const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, partner_id, item_id, payload } = await req.json()

    if (!['update', 'delete'].includes(action) || !partner_id || !item_id) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const getHeaders = { 'apikey': key, 'Authorization': `Bearer ${key}` }

    // Verify partner is an approved candidate
    const partnerRes = await fetch(
      `${url}/rest/v1/candidates?id=eq.${encodeURIComponent(partner_id)}&status=eq.approuve&select=id`,
      { headers: getHeaders }
    )
    const partners = await partnerRes.json()
    if (!Array.isArray(partners) || partners.length === 0) {
      return new Response(JSON.stringify({ error: 'Partenaire non autorisé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify item belongs to this partner
    const itemRes = await fetch(
      `${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(item_id)}&partner_id=eq.${encodeURIComponent(partner_id)}&select=id`,
      { headers: getHeaders }
    )
    const items = await itemRes.json()
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Item non autorisé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      // Only allow known fields to prevent partner_id reassignment
      const safePayload: Record<string, unknown> = {}
      if (payload?.nom !== undefined) safePayload.nom = payload.nom
      if (payload?.description !== undefined) safePayload.description = payload.description
      if (payload?.prix !== undefined) safePayload.prix = payload.prix
      if (payload?.photo_url !== undefined) safePayload.photo_url = payload.photo_url
      if (payload?.duree !== undefined) safePayload.duree = payload.duree

      const res = await fetch(`${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(item_id)}`, {
        method: 'PATCH',
        headers: { ...getHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(safePayload),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    else if (action === 'delete') {
      const res = await fetch(`${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(item_id)}`, {
        method: 'DELETE',
        headers: { ...getHeaders, 'Prefer': 'return=minimal' },
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
