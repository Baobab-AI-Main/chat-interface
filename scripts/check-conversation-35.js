import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  try {
    console.log('🔍 Checking conversation 35 data...\n');

    const result = await sql`
      SELECT 
        id,
        owner_user_id,
        participant_ids,
        title,
        created_at
      FROM chat_conversations 
      WHERE id = 35
    `;

    if (result.length === 0) {
      console.log('❌ Conversation 35 not found!');
      return;
    }

    const conv = result[0];
    console.log('✅ Conversation found!\n');
    console.log('ID:', conv.id);
    console.log('Title:', conv.title);
    console.log('Owner ID:', conv.owner_user_id);
    console.log('Owner ID is NULL?:', conv.owner_user_id === null);
    console.log('Participant IDs:', conv.participant_ids);
    console.log('Participant IDs is empty array?:', Array.isArray(conv.participant_ids) && conv.participant_ids.length === 0);
    console.log('Created At:', conv.created_at);

    console.log('\n--- Analysis ---\n');

    if (conv.owner_user_id === null) {
      console.log('❌ PROBLEM: owner_user_id is NULL!');
      console.log('   This means the function check "p_user_id != v_owner" will always be true');
      console.log('   And the authorization will fail');
    } else {
      console.log('✅ owner_user_id is set:', conv.owner_user_id);
    }

    if (!Array.isArray(conv.participant_ids)) {
      console.log('❌ PROBLEM: participant_ids is not an array');
    } else if (conv.participant_ids.length === 0) {
      console.log('⚠️  WARNING: participant_ids is empty array');
    } else {
      console.log('✅ participant_ids has', conv.participant_ids.length, 'participants');
    }

    // Get messages in this conversation
    console.log('\n--- Messages in Conversation 35 ---\n');
    const msgs = await sql`
      SELECT id, sender_user_id, role, created_at FROM chat_messages WHERE conversation_id = 35 LIMIT 3
    `;

    console.log(`Found ${msgs.length} messages (showing first 3):`);
    msgs.forEach((msg, i) => {
      console.log(`  ${i+1}. Message ${msg.id} from ${msg.sender_user_id} (${msg.role})`);
    });

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}

main();
