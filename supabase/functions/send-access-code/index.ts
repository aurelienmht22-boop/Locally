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

    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ error: 'Email requis' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` }

    // Cherche d'abord dans candidates, puis dans hotels
    let found: { nom: string; access_code: string; slug: string } | null = null

    const candRes = await fetch(`${url}/rest/v1/candidates?email=eq.${encodeURIComponent(email)}&status=eq.approuve&select=nom,access_code,slug`, { headers })
    const cands = await candRes.json()
    if (Array.isArray(cands) && cands.length > 0) found = cands[0]

    if (!found) {
      const hotelRes = await fetch(`${url}/rest/v1/hotels?email=eq.${encodeURIComponent(email)}&status=eq.approuve&select=nom,access_code,slug`, { headers })
      const hotels = await hotelRes.json()
      if (Array.isArray(hotels) && hotels.length > 0) found = hotels[0]
    }

    if (!found) {
      return new Response(JSON.stringify({ success: false, message: 'Aucun compte approuvé trouvé' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@mylocally.fr'

    const html = `
<div style="background:#FAF4EC;padding:40px 20px;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;">
    <div style="background:#6B1D1D;padding:28px 32px;">
      <p style="margin:0;font-size:28px;font-weight:bold;color:#FAF4EC;font-style:italic;letter-spacing:-0.5px;">locally</p>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(250,244,236,0.7);">Le meilleur de Bordeaux, à portée de main.</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#1A0A0A;font-weight:normal;">Votre code d'accès</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7A6555;line-height:1.7;">Bonjour ${found.nom}, voici votre code d'accès pour vous connecter à votre espace Locally.</p>
      <div style="background:#FAF4EC;border-left:3px solid #6B1D1D;padding:14px 18px;margin:0 0 24px;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#B0A090;">Votre code d'accès</p>
        <p style="margin:0;font-size:20px;font-weight:bold;color:#6B1D1D;letter-spacing:2px;">${found.access_code}</p>
      </div>
      <a href="https://locally-gules.vercel.app/login" style="display:block;background:#6B1D1D;color:#FAF4EC;text-decoration:none;text-align:center;padding:14px 24px;border-radius:6px;font-size:14px;font-family:Georgia,serif;letter-spacing:0.3px;">Accéder à mon espace →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#B0A090;line-height:1.6;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
    </div>
    <div style="border-top:1px solid #F0E8DE;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#B0A090;">© 2026 Locally · Bordeaux · <a href="mailto:contact@mylocally.fr" style="color:#6B1D1D;text-decoration:none;">contact@mylocally.fr</a></p>
    </div>
  </div>
</div>`

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Locally', email: senderEmail },
        to: [{ email, name: found.nom }],
        subject: "Votre code d'accès Locally",
        htmlContent: html,
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
