import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify the user sending the request is authenticated
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Optional: Add admin role check here if you have one
        // e.g., if (user.email !== 'admin@expensemate.com') throw new Error('Not Admin');

        // 2. Parse Subject and HTML Body from the request
        const { subject, htmlBody } = await req.json()

        if (!subject || !htmlBody) {
            return new Response(JSON.stringify({ error: 'Subject and htmlBody are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Get all user emails using the service role key to bypass RLS
        // Wait, we can use the RPC function we just created! Or just query auth.users if we use SERVICE_ROLE.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

        if (usersError) {
            throw usersError
        }

        const emails = usersData.users.map((u) => u.email).filter(Boolean) as string[]

        if (emails.length === 0) {
            return new Response(JSON.stringify({ message: 'No users found to email.' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 4. Send Email via Resend
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

        if (!RESEND_API_KEY) {
            throw new Error('Missing RESEND_API_KEY environment variable.')
        }

        // Resend docs recommend batching or sending to BCC if there are many users.
        // We will use BCC so they don't see each other's emails.
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'ExpenseMate Admin <onboarding@resend.dev>', // Replace with your verified domain
                to: [emails[0]], // Resend requires at least one 'to'
                bcc: emails.slice(1), // Put the rest in bcc
                subject: subject,
                html: htmlBody,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(`Resend Error: ${JSON.stringify(data)}`)
        }

        return new Response(JSON.stringify({ success: true, message: `Sent to ${emails.length} users.`, data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
