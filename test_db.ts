import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data, error } = await supabase.from('lembretes_automacoes').select('*').limit(1);
  console.log("lembretes_automacoes", error ? error : data);
}
main();
