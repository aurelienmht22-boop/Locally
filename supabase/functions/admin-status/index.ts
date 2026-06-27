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

    const { action, table, id, status, slug, access_code } = await req.json()

    if (!['update_status', 'mark_read'].includes(action)) {
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

    if (action === 'update_status') {
      if (!id || !status || !['candidates', 'hotels'].includes(table)) {
        return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const updates: Record<string, string> = { status }
      if (slug) updates.slug = slug
      if (access_code) updates.access_code = access_code
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH', headers: patchHeaders, body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
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
