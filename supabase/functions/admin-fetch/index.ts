const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
}

const VALID_ACTIONS = ['fetch_cands', 'fetch_partners', 'fetch_hotels', 'fetch_visits', 'fetch_stats', 'fetch_orders', 'fetch_badges', 'open_partner', 'open_hotel']

async function sbGet(url: string, key: string, path: string): Promise<unknown[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Supabase GET error ${res.status}: ${await res.text()}`)
  return await res.json()
}

function stripCode(items: unknown[]): unknown[] {
  return items.map(r => { const { access_code: _ac, ...rest } = r as Record<string, unknown>; return rest })
}

async function sbCount(url: string, key: string, path: string): Promise<number> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: 'HEAD',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact' },
  })
  return parseInt(res.headers.get('Content-Range')?.split('/')[1] ?? '0')
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

    const { action, id, date_from } = await req.json()

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Action inconnue' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    let result: unknown

    if (action === 'fetch_cands') {
      const data = stripCode(await sbGet(url, key, 'candidates?select=*&order=created_at.desc'))
      result = { data }
    }

    else if (action === 'fetch_partners') {
      const [raw, msgs] = await Promise.all([
        sbGet(url, key, 'candidates?select=*&status=eq.approuve&order=created_at.desc'),
        sbGet(url, key, 'messages?select=partner_id&status=eq.non_lu&partner_id=not.is.null'),
      ])
      result = { data: stripCode(raw), msgs }
    }

    else if (action === 'fetch_hotels') {
      const [raw, msgs] = await Promise.all([
        sbGet(url, key, 'hotels?select=*&order=created_at.desc'),
        sbGet(url, key, 'messages?select=hotel_slug&status=eq.non_lu&hotel_slug=not.is.null'),
      ])
      result = { data: stripCode(raw), msgs }
    }

    else if (action === 'fetch_visits') {
      const data = await sbGet(url, key, 'visits?select=*&order=created_at.desc&limit=500')
      result = { data }
    }

    else if (action === 'fetch_stats') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const from30 = thirtyDaysAgo.toISOString()
      const [txnsAll, clientCount, qrTotal, qrScanned, partnerActiveCount, txns30, allCands] = await Promise.all([
        sbGet(url, key, 'transactions?select=montant_client,montant_reduction,partner_id,created_at'),
        sbCount(url, key, 'profiles?select=id'),
        sbCount(url, key, 'visits?select=id'),
        sbCount(url, key, 'visits?select=id&scanned=eq.true'),
        sbCount(url, key, 'candidates?select=id&status=eq.approuve'),
        sbGet(url, key, `transactions?select=montant_client,created_at&created_at=gte.${from30}`),
        sbGet(url, key, 'candidates?select=id,nom&status=eq.approuve'),
      ])
      result = { txnsAll, clientCount, qrTotal, qrScanned, partnerActiveCount, txns30, allCands }
    }

    else if (action === 'fetch_orders') {
      const path = date_from
        ? `orders?select=*&created_at=gt.${encodeURIComponent(date_from)}&order=created_at.asc`
        : `orders?select=*&order=created_at.desc`
      const data = await sbGet(url, key, path)
      result = { data }
    }

    else if (action === 'fetch_badges') {
      const [partnerMsgCount, hotelMsgCount] = await Promise.all([
        sbCount(url, key, 'messages?select=id&status=eq.non_lu&partner_id=not.is.null'),
        sbCount(url, key, 'messages?select=id&status=eq.non_lu&hotel_slug=not.is.null'),
      ])
      result = { partnerMsgCount, hotelMsgCount }
    }

    else if (action === 'open_partner') {
      if (!id) return new Response(JSON.stringify({ error: 'id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      const [visits, msgs] = await Promise.all([
        sbGet(url, key, `visits?select=*&partner_id=eq.${encodeURIComponent(id)}&order=created_at.desc`),
        sbGet(url, key, `messages?select=*&partner_id=eq.${encodeURIComponent(id)}&order=created_at.desc`),
      ])
      result = { visits, msgs }
    }

    else if (action === 'open_hotel') {
      if (!id) return new Response(JSON.stringify({ error: 'id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      const msgs = await sbGet(url, key, `messages?select=*&hotel_slug=eq.${encodeURIComponent(id)}&order=created_at.desc`)
      result = { msgs }
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
