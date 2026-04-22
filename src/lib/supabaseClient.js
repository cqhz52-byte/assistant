import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

const supabase =
  supabaseConfigured
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

const supabaseConfigMessage = supabaseConfigured
  ? ''
  : '未检测到 Supabase 环境变量，当前将自动回退到本地演示模式。'

export { supabase, supabaseConfigured, supabaseConfigMessage }
