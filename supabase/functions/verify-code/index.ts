// @ts-ignore
import bcrypt from "npm:bcryptjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
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

    const { email, slug, code, type } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

    let found: Record<string, unknown> | null = null
    let foundType: 'partner' | 'hotel' = 'partner'

    if (slug) {
      // Slug-based lookup (PartnerView / HotelView — slug known from URL)
      const table = type === 'hotel' ? 'hotels' : 'candidates'
      const res = await fetch(
        `${url}/rest/v1/${table}?slug=eq.${encodeURIComponent(slug)}&status=eq.approuve&select=*`,
        { headers }
      )
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        found = rows[0] as Record<string, unknown>
        foundType = type === 'hotel' ? 'hotel' : 'partner'
      }
    } else if (email) {
      // Email-based lookup (LoginView — searches candidates then hotels)
      const candRes = await fetch(
        `${url}/rest/v1/candidates?email=eq.${encodeURIComponent(email)}&status=eq.approuve&select=*`,
        { headers }
      )
      const cands = await candRes.json()
      if (Array.isArray(cands) && cands.length > 0) {
        found = cands[0] as Record<string, unknown>
        foundType = 'partner'
      } else {
        const hotelRes = await fetch(
          `${url}/rest/v1/hotels?email=eq.${encodeURIComponent(email)}&status=eq.approuve&select=*`,
          { headers }
        )
        const hotels = await hotelRes.json()
        if (Array.isArray(hotels) && hotels.length > 0) {
          found = hotels[0] as Record<string, unknown>
          foundType = 'hotel'
        }
      }
    }

    if (!found) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hash = found.access_code as string
    const valid = hash ? await bcrypt.compare(code as string, hash) : false

    if (!valid) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Never return the hash to the client
    const { access_code: _ac, ...data } = found
    return new Response(JSON.stringify({ valid: true, type: foundType, data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
