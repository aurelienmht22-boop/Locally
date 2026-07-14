const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-locally-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 0. Vérification du secret partagé
    const secret = Deno.env.get('LOCALLY_SECRET') ?? ''
    if (!secret || req.headers.get('x-locally-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Lecture du body
    let body: { email?: string; nom?: string; access_code?: string; slug?: string; type?: string }
    try {
      body = await req.json()
      console.log('[1] Body reçu:', JSON.stringify(body))
    } catch (e) {
      console.error('[1] Erreur lecture body:', e)
      return new Response(JSON.stringify({ error: 'Body JSON invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, nom, access_code, slug, type } = body

    // 2. Validation paramètres
    if (!email || !nom || !access_code || !slug) {
      console.error('[2] Paramètres manquants:', { email: !!email, nom: !!nom, access_code: !!access_code, slug: !!slug })
      return new Response(JSON.stringify({ error: 'Paramètres manquants', received: { email, nom, access_code, slug } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('[2] Paramètres OK:', { email, nom, slug, type })

    // 3. Lecture secrets
    const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@mylocally.fr'
    console.log('[3] Secrets — BREVO_API_KEY présent:', apiKey.length > 0, '| BREVO_SENDER_EMAIL:', senderEmail)
    if (!apiKey) {
      console.error('[3] BREVO_API_KEY manquant ou vide')
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Construction payload
    const loginUrl = `https://www.mylocally.fr/${type === 'hotel' ? 'hotel' : 'partner'}/${slug}`
    const html = `
<div style="background:#FAF4EC;padding:40px 20px;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;">
    <div style="background:#6B1D1D;padding:28px 32px;">
      <p style="margin:0;font-size:28px;font-weight:bold;color:#FAF4EC;font-style:italic;letter-spacing:-0.5px;">locally</p>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(250,244,236,0.7);">Le meilleur de Bordeaux, à portée de main.</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#1A0A0A;font-weight:normal;">Votre candidature est acceptée !</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7A6555;line-height:1.7;">Bonjour, votre établissement <strong>${nom}</strong> a été approuvé sur Locally. Vous pouvez dès maintenant accéder à votre espace partenaire.</p>
      <div style="background:#FAF4EC;border-left:3px solid #6B1D1D;padding:14px 18px;margin:0 0 24px;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#B0A090;">Votre code d'accès</p>
        <p style="margin:0;font-size:20px;font-weight:bold;color:#6B1D1D;letter-spacing:2px;">${access_code}</p>
      </div>
      <a href="${loginUrl}" style="display:block;background:#6B1D1D;color:#FAF4EC;text-decoration:none;text-align:center;padding:14px 24px;border-radius:6px;font-size:14px;font-family:Georgia,serif;letter-spacing:0.3px;">Accéder à mon espace partenaire →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#B0A090;line-height:1.6;">Conservez ce code, il vous servira à vous connecter à votre espace.</p>
    </div>
    <div style="border-top:1px solid #F0E8DE;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#B0A090;">© 2026 Locally · Bordeaux · <a href="mailto:contact@mylocally.fr" style="color:#6B1D1D;text-decoration:none;">contact@mylocally.fr</a></p>
    </div>
  </div>
</div>`

    const brevoPayload = {
      sender: { name: 'Locally', email: senderEmail },
      to: [{ email, name: nom }],
      subject: `✓ Bienvenue sur Locally — ${nom}`,
      htmlContent: html,
    }
    console.log('[4] Payload Brevo — to:', email, '| subject:', brevoPayload.subject)

    // 5. Appel Brevo API
    console.log('[5] Envoi vers api.brevo.com...')
    let res: Response
    try {
      res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      })
    } catch (e) {
      console.error('[5] Erreur fetch Brevo:', e)
      return new Response(JSON.stringify({ error: 'Erreur réseau Brevo', detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Réponse Brevo
    const resText = await res.text()
    console.log('[6] Brevo réponse — status:', res.status, '| body:', resText)

    if (!res.ok) {
      console.error('[6] Brevo KO:', res.status, resText)
      return new Response(JSON.stringify({ error: 'Échec envoi email', status: res.status, detail: resText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[6] Email envoyé avec succès')
    return new Response(JSON.stringify({ success: true, brevo: resText }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('[catch] Erreur inattendue:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
