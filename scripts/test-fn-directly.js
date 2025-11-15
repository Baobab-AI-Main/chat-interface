import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const connectionString = process.env.DATABASE_URL;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const sql = postgres(connectionString);
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  try {
    console.log('🔍 Checking conversation 35...\n');

    // Get conversation 35
    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', 35)
      .single();

    if (!conv) {
      console.log('❌ Conversation 35 not found');
      return;
    }

    console.log('Conversation 35:');
    console.log('  ID:', conv.id);
    console.log('  Owner:', conv.owner_user_id);
    console.log('  Participants:', conv.participant_ids);
    console.log('\n');

    // Get a message in that conversation
    const { data: msg } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', 35)
      .limit(1)
      .single();

    if (!msg) {
      console.log('❌ No message found in conversation 35');
      return;
    }

    console.log('Message in conversation:');
    console.log('  ID:', msg.id);
    console.log('  Sender:', msg.sender_user_id);
    console.log('\n');

    // Test the function
    console.log('🧪 Testing save_chat_attachment function...\n');
    console.log(`Input parameters:`);
    console.log(`  message_id: ${msg.id}`);
    console.log(`  conversation_id: ${conv.id}`);
    console.log(`  user_id: ${conv.owner_user_id}`);
    console.log(`  file_name: test.png`);
    console.log('\n');

    try {
      const result = await sql`
        SELECT * FROM save_chat_attachment(
          ${msg.id}::INTEGER,
          ${conv.id}::INTEGER,
          ${'test.png'}::TEXT,
          ${'image'}::TEXT,
          ${'image/png'}::TEXT,
          ${1024}::BIGINT,
          ${'test-path/test.png'}::TEXT,
          ${conv.owner_user_id}::UUID
        )
      `;
      
      console.log('✅ Function succeeded!');
      console.log('Result:', result[0]);
    } catch (fnError) {
      console.error('❌ Function failed:', fnError.message);
      console.error('Error code:', fnError.code);
      console.error('Error detail:', fnError.detail);
    }

  } catch (e) {
    console.error('❌ Test failed:', e.message);
  } finally {
    await sql.end();
  }
}

main();
