const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
}

const VALID_ACTIONS = ['fetch_cands', 'fetch_partners', 'fetch_hotels', 'fetch_visits', 'fetch_stats', 'fetch_orders', 'fetch_badges', 'fetch_analyses', 'open_partner', 'open_hotel', 'open_hotel_stats', 'fetch_full_stats']

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

    const { action, id, slug, date_from, limit: limitCount } = await req.json()

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

    else if (action === 'fetch_analyses') {
      const path = limitCount
        ? `analyses?select=*&order=created_at.desc&limit=${limitCount}`
        : `analyses?select=*&order=created_at.desc`
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

    else if (action === 'open_hotel_stats') {
      if (!slug) return new Response(JSON.stringify({ error: 'slug requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      const enc = encodeURIComponent(slug)
      const [qrTotal, qrScanned, lastVisitArr, recentVisits] = await Promise.all([
        sbCount(url, key, `visits?select=id&hotel_slug=eq.${enc}`),
        sbCount(url, key, `visits?select=id&hotel_slug=eq.${enc}&scanned=eq.true`),
        sbGet(url, key, `visits?select=created_at&hotel_slug=eq.${enc}&order=created_at.desc&limit=1`),
        sbGet(url, key, `visits?select=client_name,created_at,partner_id,candidates(nom)&hotel_slug=eq.${enc}&order=created_at.desc&limit=5`),
      ])
      const lastVisit = (lastVisitArr as Array<{created_at: string}>)[0]?.created_at ?? null
      result = { qrTotal, qrScanned, lastVisit, recentVisits }
    }

    else if (action === 'fetch_full_stats') {
      const [hotelsRaw, partnersRaw, visitsRaw, txnsRaw] = await Promise.all([
        sbGet(url, key, 'hotels?select=*&status=eq.approuve&order=nom.asc'),
        sbGet(url, key, 'candidates?select=*&status=eq.approuve&order=nom.asc'),
        sbGet(url, key, 'visits?select=id,partner_id,hotel_slug,scanned,created_at&limit=5000'),
        sbGet(url, key, 'transactions?select=partner_id,hotel_slug,montant_client,commission_locally,commission_hotel&limit=5000'),
      ])

      type HotelAgg = { qr_total: number; qr_scanned: number; last_activity: string | null; commission_total: number }
      type PartnerAgg = { visites: number; ca_total: number; commission_locally: number }

      const hotelAgg: Record<string, HotelAgg> = {}
      for (const h of hotelsRaw as Array<{ slug?: string }>) {
        if (h.slug) hotelAgg[h.slug] = { qr_total: 0, qr_scanned: 0, last_activity: null, commission_total: 0 }
      }
      for (const v of visitsRaw as Array<{ hotel_slug?: string; scanned: boolean; created_at: string }>) {
        const s = v.hotel_slug
        if (s && hotelAgg[s]) {
          hotelAgg[s].qr_total++
          if (v.scanned) hotelAgg[s].qr_scanned++
          if (!hotelAgg[s].last_activity || v.created_at > hotelAgg[s].last_activity!) hotelAgg[s].last_activity = v.created_at
        }
      }
      for (const t of txnsRaw as Array<{ hotel_slug?: string; commission_hotel?: number }>) {
        const s = t.hotel_slug
        if (s && hotelAgg[s]) hotelAgg[s].commission_total += Number(t.commission_hotel || 0)
      }

      const partnerAgg: Record<string, PartnerAgg> = {}
      for (const p of partnersRaw as Array<{ id: string }>) {
        partnerAgg[p.id] = { visites: 0, ca_total: 0, commission_locally: 0 }
      }
      for (const v of visitsRaw as Array<{ partner_id?: string }>) {
        const pid = v.partner_id
        if (pid && partnerAgg[pid]) partnerAgg[pid].visites++
      }
      for (const t of txnsRaw as Array<{ partner_id?: string; montant_client?: number; commission_locally?: number }>) {
        const pid = t.partner_id
        if (pid && partnerAgg[pid]) {
          partnerAgg[pid].ca_total += Number(t.montant_client || 0)
          partnerAgg[pid].commission_locally += Number(t.commission_locally || 0)
        }
      }

      const hotels = stripCode(hotelsRaw).map((h) => {
        const rh = h as Record<string, unknown>
        const agg = (rh.slug ? hotelAgg[rh.slug as string] : null) ?? { qr_total: 0, qr_scanned: 0, last_activity: null, commission_total: 0 }
        const taux_conversion = agg.qr_total > 0 ? Math.round(agg.qr_scanned / agg.qr_total * 100) : 0
        return { ...rh, ...agg, taux_conversion }
      })
      const partners = stripCode(partnersRaw).map((p) => {
        const rp = p as Record<string, unknown>
        return { ...rp, ...(partnerAgg[rp.id as string] ?? { visites: 0, ca_total: 0, commission_locally: 0 }) }
      })

      result = { hotels, partners }
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
