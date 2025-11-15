import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function check() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get users table schema
    console.log('📋 Users table schema:\n');
    const schemaResult = await client.query(`
      SELECT 
        column_name, 
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    schemaResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | nullable: ${col.is_nullable}`);
    });

    // Get foreign key constraints on chat_conversations
    console.log('\n📋 Foreign key constraints on chat_conversations:\n');
    const fkResult = await client.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.table_name = kcu.table_name AND tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'chat_conversations' AND tc.constraint_type = 'FOREIGN KEY';
    `);

    fkResult.rows.forEach(fk => {
      console.log(`  ${fk.constraint_name}`);
      console.log(`    Column: ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}\n`);
    });

    // Get sample users data
    console.log('📋 Sample users data:\n');
    const usersResult = await client.query(`
      SELECT 
        id,
        email,
        user_id,
        role
      FROM users
      LIMIT 5;
    `);

    console.log('Sample users:');
    usersResult.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ID (table pk): ${user.id}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     user_id (auth): ${user.user_id}`);
      console.log(`     Role: ${user.role}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

check();
