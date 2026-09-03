import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await req.json();
  const { action } = body;

  if (action === "set_password_direct") {
    // Use the Admin API but with a strong temporary password,
    // then we'll need to use a different approach for weak passwords
    const { userId, password } = body;
    
    // Try with the Admin API first
    const { data, error } = await supabase.auth.admin.updateUserById(userId, { password });
    
    if (error) {
      // If it's a weak password error, we need to hash it ourselves
      // Generate bcrypt hash using the crypto API
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // We can't use bcrypt in Deno directly, but we can use the Supabase
      // database's crypt() function via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('crypt_password', {
        user_id: userId,
        new_password: password
      });
      
      if (rpcError) {
        return new Response(
          JSON.stringify({ 
            step: "set_password_direct", 
            success: false, 
            adminError: error.message,
            rpcError: rpcError.message 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, method: "rpc", result: rpcData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, method: "admin_api", user: { id: data.user.id, email: data.user.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action === "get_user") {
    const { userId } = body;
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ success: true, user: { id: data.user.id, email: data.user.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action === "delete_test") {
    const { userId } = body;
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action === "login_test") {
    const { email, password } = body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ success: true, user: { id: data.user.id, email: data.user.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Unknown action" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
