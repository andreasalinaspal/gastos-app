import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ewczxeqkwwrugxxiqxar.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8UGBBJJ9WdOUwU7HAu1mgQ_D6GygoWE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
