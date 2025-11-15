import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function checkConsistency() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const user1 = '1a78b40c-326b-4f58-bc7b-0f81235d4d81';
    const user2 = '4bfb2ec4-5ea9-4fad-ae1f-466e5dac28e0';

    console.log('📋 Checking all conversations...\n');
    console.log(`User 1: ${user1}`);
    console.log(`User 2: ${user2}\n`);

    // Get all conversations
    const convResult = await client.query(`
      SELECT 
        id,
        title,
        owner_user_id,
        participant_ids,
        created_at
      FROM chat_conversations
      WHERE owner_user_id IN ($1, $2)
         OR (participant_ids @> $3::uuid[] OR participant_ids @> $4::uuid[])
      ORDER BY created_at DESC;
    `, [user1, user2, [user1], [user2]]);

    console.log(`Found ${convResult.rows.length} conversations involving these users:\n`);
    
    convResult.rows.forEach((conv, idx) => {
      console.log(`${idx + 1}. Conversation ${conv.id}: "${conv.title}"`);
      console.log(`   Owner: ${conv.owner_user_id}`);
      console.log(`   Participants: ${JSON.stringify(conv.participant_ids)}`);
      console.log(`   Created: ${conv.created_at}\n`);
    });

    // Check for mismatches
    console.log('--- Analysis ---\n');
    const problematic = convResult.rows.filter(conv => {
      const isOwnedByUser1 = conv.owner_user_id === user1;
      const isOwnedByUser2 = conv.owner_user_id === user2;
      const user1IsParticipant = conv.participant_ids?.includes(user1);
      const user2IsParticipant = conv.participant_ids?.includes(user2);
      
      // Flag if owner is not in participants
      if ((isOwnedByUser1 && !user1IsParticipant) || (isOwnedByUser2 && !user2IsParticipant)) {
        return true;
      }
      
      return false;
    });

    if (problematic.length > 0) {
      console.error(`❌ Found ${problematic.length} conversations where owner is not in participants:\n`);
      problematic.forEach(conv => {
        console.error(`  - Conversation ${conv.id}: Owner ${conv.owner_user_id} not in ${JSON.stringify(conv.participant_ids)}`);
      });
    } else {
      console.log('✅ All conversations have owner in participants list\n');
    }

    // Check for duplicate users
    console.log('--- Checking for duplicate user IDs in participants ---\n');
    const duplicates = convResult.rows.filter(conv => {
      if (!conv.participant_ids) return false;
      const seen = new Set();
      for (const id of conv.participant_ids) {
        if (seen.has(id)) return true;
        seen.add(id);
      }
      return false;
    });

    if (duplicates.length > 0) {
      console.error(`❌ Found ${duplicates.length} conversations with duplicate user IDs:\n`);
      duplicates.forEach(conv => {
        console.error(`  - Conversation ${conv.id}: ${JSON.stringify(conv.participant_ids)}`);
      });
    } else {
      console.log('✅ No duplicate user IDs found in any conversation\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkConsistency();
