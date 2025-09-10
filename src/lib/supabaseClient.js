import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("SUPABASE KEY starts with:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 8));

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
