import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, nom, access_code, slug, type } = await req.json()

    if (!email || !nom || !access_code || !slug) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const loginUrl = `https://mylocally.fr/${type === 'hotel' ? 'hotel' : 'partner'}/${slug}`

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

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': Deno.env.get('BREVO_API_KEY') ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Locally',
          email: Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@mylocally.fr',
        },
        to: [{ email, name: nom }],
        subject: `✓ Bienvenue sur Locally — ${nom}`,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Brevo error:', err)
      return new Response(JSON.stringify({ error: 'Échec envoi email', detail: err }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-approval-email error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
