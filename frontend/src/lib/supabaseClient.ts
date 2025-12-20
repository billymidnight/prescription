import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (import.meta.env.DEV) {
    console.log('Supabase URL:', SUPABASE_URL ? '[set]' : '[MISSING]')
    console.log('Supabase ANON KEY:', SUPABASE_ANON ? '[set]' : '[MISSING]')
}

if (!SUPABASE_URL || !SUPABASE_ANON) {
    if (import.meta.env.DEV) {
        throw new Error('Missing Supabase configuration')
    }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// Helper function to get patient image URL from Supabase Storage
export const getPatientImageUrl = (filename: string | null): string | null => {
    if (!filename) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/patient_images/${filename}`;
}

export default supabase
