const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
}

function extractPlaceId(url: string): string | null {
  let m = url.match(/[?&]place_?id=(ChIJ[^&]+)/i)
  if (m) return decodeURIComponent(m[1])
  m = url.match(/\/place\/[^/]+\/(ChIJ[^/?#]+)/)
  if (m) return m[1]
  m = url.match(/!1s(ChIJ[^!]+)/)
  if (m) return decodeURIComponent(m[1])
  return null
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

    const { review_url, nom, adresse } = await req.json()
    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY') ?? ''
    if (!googleKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY non configurée' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Étape 1 : extraire le place_id depuis l'URL de review
    let placeId: string | null = review_url ? extractPlaceId(review_url) : null

    // Étape 2 : si pas de place_id, Text Search par nom + adresse
    if (!placeId && nom) {
      const query = encodeURIComponent([nom, adresse].filter(Boolean).join(' '))
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${googleKey}`
      )
      const searchData = await searchRes.json()
      placeId = searchData.results?.[0]?.place_id ?? null
    }

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'place_id introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Étape 3 : Places Details → rating + user_ratings_total
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total&key=${googleKey}`
    )
    const detailsData = await detailsRes.json()

    if (detailsData.result?.rating == null) {
      return new Response(JSON.stringify({ error: 'Pas de note disponible' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      rating: detailsData.result.rating,
      total: detailsData.result.user_ratings_total ?? 0,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
