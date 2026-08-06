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

    const { id, adresse } = await req.json()
    if (!id || !adresse) {
      return new Response(JSON.stringify({ error: 'id et adresse requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY') ?? ''
    if (!googleKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY non configurée' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(adresse)}&key=${googleKey}`
    )
    const geoJson = await geoRes.json()

    if (geoJson.status !== 'OK' || !geoJson.results?.[0]?.geometry?.location) {
      return new Response(JSON.stringify({ error: 'Géocodage échoué', status: geoJson.status, error_message: geoJson.error_message }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const loc = geoJson.results[0].geometry.location

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/candidates?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng }),
    })

    if (!patchRes.ok) {
      const detail = await patchRes.text()
      return new Response(JSON.stringify({ error: 'Erreur écriture base', detail }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ loc }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
