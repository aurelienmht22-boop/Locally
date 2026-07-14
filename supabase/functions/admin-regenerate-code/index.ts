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

    const { table, id } = await req.json()
    if (!id || !['candidates', 'hotels'].includes(table)) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const getHeaders = { 'apikey': key, 'Authorization': `Bearer ${key}` }
    const patchHeaders = {
      'apikey': key, 'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    }

    // Fetch email + nom
    const infoRes = await fetch(
      `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=email,nom`,
      { headers: getHeaders }
    )
    const infoArr = await infoRes.json()
    const info = Array.isArray(infoArr) && infoArr.length > 0 ? infoArr[0] : null

    if (!info?.email) {
      return new Response(JSON.stringify({ error: 'Compte introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate new code + hash + update DB
    const plainCode = generateCode()
    const hash = await bcrypt.hash(plainCode, 10)

    const patchRes = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ access_code: hash }),
    })
    if (!patchRes.ok) {
      const err = await patchRes.text()
      return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send email with new plain code
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
      <h2 style="margin:0 0 12px;font-size:20px;color:#1A0A0A;font-weight:normal;">Votre code d'accès a été régénéré</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7A6555;line-height:1.7;">Bonjour ${info.nom}, voici votre nouveau code d'accès Locally. L'ancien code a été désactivé.</p>
      <div style="background:#FAF4EC;border-left:3px solid #6B1D1D;padding:14px 18px;margin:0 0 24px;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#B0A090;">Votre code d'accès</p>
        <p style="margin:0;font-size:20px;font-weight:bold;color:#6B1D1D;letter-spacing:2px;">${plainCode}</p>
      </div>
      <a href="https://www.mylocally.fr/login" style="display:block;background:#6B1D1D;color:#FAF4EC;text-decoration:none;text-align:center;padding:14px 24px;border-radius:6px;font-size:14px;font-family:Georgia,serif;letter-spacing:0.3px;">Accéder à mon espace →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#B0A090;line-height:1.6;">Si vous n'avez pas demandé ce changement, contactez-nous immédiatement.</p>
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
        to: [{ email: info.email, name: info.nom }],
        subject: "Votre nouveau code d'accès Locally",
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
