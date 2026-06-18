import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Missing Authorization header', { status: 401 })
  }

  // Client with service_role pour pouvoir supprimer auth.users
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Vérifie que le JWT est valide et récupère l'utilisateur
  const { data: { user }, error: userError } = await adminClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 1. Anonymise les transactions liées à ce client
  await adminClient
    .from('transactions')
    .update({ client_name: '[supprimé]', user_id: null })
    .eq('user_id', user.id)

  // 2. Anonymise les visites liées à ce client
  await adminClient
    .from('visits')
    .update({ client_name: '[supprimé]', user_id: null })
    .eq('user_id', user.id)

  // 3. Supprime le profil
  await adminClient
    .from('profiles')
    .delete()
    .eq('id', user.id)

  // 4. Supprime le compte auth (notifie GoTrue proprement)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
