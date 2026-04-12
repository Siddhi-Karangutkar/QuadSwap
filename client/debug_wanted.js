import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Siddhi/OneDrive/Desktop/SIDDHI/My Additionals/Crazyy 30 Projects/QuadSwap Project/QuadSwap/client/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error } = await supabase.from('wanted_items').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total entries:', data.length);
        console.log('Entries:', JSON.stringify(data, null, 2));
    }
}

checkData();
