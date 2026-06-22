import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Aviso claro en consola si faltan las variables de entorno
  console.warn(
    'Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Configurálas en .env.local (local) y en Vercel (deploy).'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
