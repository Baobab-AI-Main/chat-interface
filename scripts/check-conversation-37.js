import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function check() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const conversationId = 37;
    const userId = '4bfb2ec4-5ea9-4fad-ae1f-466e5dac28e0';

    // Get conversation data
    console.log(`📋 Checking conversation ${conversationId}...\n`);
    const convResult = await client.query(`
      SELECT 
        id,
        title,
        owner_user_id,
        participant_ids,
        created_at
      FROM chat_conversations
      WHERE id = $1;
    `, [conversationId]);

    if (convResult.rows.length === 0) {
      console.error(`❌ Conversation ${conversationId} not found!`);
      process.exit(1);
    }

    const conv = convResult.rows[0];
    console.log(`ID: ${conv.id}`);
    console.log(`Title: ${conv.title}`);
    console.log(`Owner ID: ${conv.owner_user_id}`);
    console.log(`Participant IDs: ${JSON.stringify(conv.participant_ids)}`);
    console.log(`Created: ${conv.created_at}\n`);

    // Check if user is owner
    const isOwner = conv.owner_user_id === userId;
    console.log(`User ${userId} is owner? ${isOwner}`);

    // Check if user is participant
    const isParticipant = conv.participant_ids && conv.participant_ids.includes(userId);
    console.log(`User ${userId} is participant? ${isParticipant}\n`);

    if (!isOwner && !isParticipant) {
      console.error(`❌ User is NEITHER owner NOR participant!`);
      console.error('This explains the authorization error.\n');
    } else {
      console.log(`✅ User should be authorized.\n`);
    }

    // Check messages in conversation
    console.log('--- Messages in conversation ---\n');
    const messagesResult = await client.query(`
      SELECT 
        id,
        sender_user_id,
        role,
        content,
        created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 5;
    `, [conversationId]);

    console.log(`Found ${messagesResult.rows.length} messages (showing last 5):\n`);
    messagesResult.rows.forEach(msg => {
      console.log(`  Message ${msg.id}:`);
      console.log(`    Role: ${msg.role}`);
      console.log(`    Sender: ${msg.sender_user_id || 'system'}`);
      console.log(`    Content preview: ${msg.content.substring(0, 50)}...`);
      console.log(`    Created: ${msg.created_at}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

check();
