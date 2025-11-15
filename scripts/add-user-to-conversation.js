import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function addUserToConversation() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const conversationId = 37;
    const userId = '4bfb2ec4-5ea9-4fad-ae1f-466e5dac28e0';

    console.log(`Adding user ${userId} to conversation ${conversationId}...\n`);

    // Get current conversation
    const convResult = await client.query(`
      SELECT 
        id,
        participant_ids
      FROM chat_conversations
      WHERE id = $1;
    `, [conversationId]);

    if (convResult.rows.length === 0) {
      console.error(`❌ Conversation ${conversationId} not found!`);
      process.exit(1);
    }

    const conv = convResult.rows[0];
    let participants = conv.participant_ids || [];

    console.log(`Current participants: ${JSON.stringify(participants)}`);

    // Add user if not already present
    if (!participants.includes(userId)) {
      participants = [...participants, userId];
      console.log(`New participants: ${JSON.stringify(participants)}\n`);

      // Update conversation
      const updateResult = await client.query(`
        UPDATE chat_conversations
        SET participant_ids = $1
        WHERE id = $2
        RETURNING id, participant_ids;
      `, [participants, conversationId]);

      console.log('✅ User added to conversation!\n');
      console.log('Updated conversation:');
      console.log(`  ID: ${updateResult.rows[0].id}`);
      console.log(`  Participants: ${JSON.stringify(updateResult.rows[0].participant_ids)}`);
    } else {
      console.log(`✅ User is already a participant.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addUserToConversation();
