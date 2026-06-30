// @ts-ignore
import bcrypt from "npm:bcryptjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
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

    const { action, table, id, status, slug, new_code } = await req.json()

    if (!['update_status', 'mark_read', 'change_code'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Action inconnue' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
