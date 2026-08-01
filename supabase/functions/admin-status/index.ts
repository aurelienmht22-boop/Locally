// @ts-ignore
import bcrypt from "npm:bcryptjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret, x-admin-token',
}

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b: number) => CHARSET[b % CHARSET.length])
  return chars.slice(0, 4).join('') + '-' + chars.slice(4).join('')
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

    const { action, table, id, status, slug, new_code, content, orders_count, date_from, date_to, hotel_slug, commission_active, commission_pct, type } = await req.json()

    if (!['update_status', 'mark_read', 'change_code', 'insert_analysis', 'create_qr_code', 'assign_qr_code', 'update_hotel_commission', 'admin_impersonate'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Action inconnue' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (action !== 'change_code') {
      const adminToken = req.headers.get('x-admin-token') ?? ''
      const tokenRes = await fetch(
        `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(adminToken)}&expires_at=gt.${new Date().toISOString()}&select=token&limit=1`,
        { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
      )
      const tokenRows = await tokenRes.json()
      if (!Array.isArray(tokenRows) || tokenRows.length === 0) {
        return new Response(JSON.stringify({ error: 'Session admin expirée ou invalide' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    const patchHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    }
    const getHeaders = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }

    if (action === 'update_status') {
      if (!id || !status || !['candidates', 'hotels'].includes(table)) {
        return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const updates: Record<string, unknown> = { status }
      if (slug) updates.slug = slug

      let plainCode: string | undefined

      if (status === 'approuve') {
        plainCode = generateCode()
        updates.access_code = await bcrypt.hash(plainCode, 10)
        updates.visible = false

        // Fetch email + nom for approval email
        const infoRes = await fetch(
          `${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=email,nom,slug`,
          { headers: getHeaders }
        )
        const infoArr = await infoRes.json()
        const info = Array.isArray(infoArr) && infoArr.length > 0 ? infoArr[0] : null

        if (info?.email) {
          const finalSlug = (slug || info.slug || '') as string
          const emailType = table === 'hotels' ? 'hotel' : 'partenaire'
          fetch(`${supabaseUrl}/functions/v1/send-approval-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'x-locally-secret': secret,
            },
            body: JSON.stringify({ email: info.email, nom: info.nom, access_code: plainCode, slug: finalSlug, type: emailType }),
          }).catch(() => {})
        }
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: patchHeaders, body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ success: true, ...(plainCode ? { plain_code: plainCode } : {}) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    else if (action === 'mark_read') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'id requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ status: 'lu' }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'change_code') {
      if (!new_code || !['candidates', 'hotels'].includes(table)) {
        return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!id && !slug) {
        return new Response(JSON.stringify({ error: 'id ou slug requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const hash = await bcrypt.hash(new_code as string, 10)
      const filter = id
        ? `id=eq.${encodeURIComponent(id)}`
        : `slug=eq.${encodeURIComponent(slug)}`
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}`, {
        method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ access_code: hash }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'insert_analysis') {
      if (!content) {
        return new Response(JSON.stringify({ error: 'content requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/analyses`, {
        method: 'POST',
        headers: patchHeaders,
        body: JSON.stringify({ content, orders_count, date_from, date_to }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'create_qr_code') {
      const qrCharset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
      const qrBytes = new Uint8Array(8)
      crypto.getRandomValues(qrBytes)
      const code = Array.from(qrBytes, (b: number) => qrCharset[b % qrCharset.length]).join('')
      const postHeaders = {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/qr_codes`, {
        method: 'POST', headers: postHeaders, body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const rows = await res.json()
      const qr_code = Array.isArray(rows) ? rows[0] : rows
      return new Response(JSON.stringify({ success: true, qr_code }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'assign_qr_code') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'id requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/qr_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: patchHeaders,
        body: JSON.stringify({ hotel_slug: hotel_slug ?? null }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'update_hotel_commission') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'id requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/hotels?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: patchHeaders,
        body: JSON.stringify({ commission_active: commission_active ?? true, commission_pct: commission_pct ?? 1 }),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    else if (action === 'admin_impersonate') {
      if (!id || !type) {
        return new Response(JSON.stringify({ error: 'id et type requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const entityTable = type === 'hotel' ? 'hotels' : 'candidates'
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${entityTable}?id=eq.${encodeURIComponent(id)}&select=slug,status`,
        { headers: getHeaders }
      )
      const rows = await res.json()
      const entity = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
      if (!entity || entity.status !== 'approuve') {
        return new Response(JSON.stringify({ error: 'Entité non approuvée' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ slug: entity.slug }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
