import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function verify() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get function definition
    const result = await client.query(`
      SELECT 
        p.proname as name,
        pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
        pg_catalog.pg_get_functiondef(p.oid) as definition
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'save_chat_attachment' AND n.nspname = 'public';
    `);

    if (result.rows.length === 0) {
      console.error('❌ Function not found!');
      process.exit(1);
    }

    const fn = result.rows[0];
    console.log(`Function: ${fn.name}(${fn.args})\n`);
    console.log('Definition:');
    console.log('─'.repeat(80));
    console.log(fn.definition);
    console.log('─'.repeat(80));

    // Verify return type is correct
    if (fn.definition.includes('RETURNS TABLE')) {
      console.log('\n✅ Has correct RETURNS TABLE clause');
    }
    
    if (fn.definition.includes('id UUID')) {
      console.log('✅ id return type is UUID');
    }
    
    if (fn.definition.includes('SECURITY DEFINER')) {
      console.log('✅ Has SECURITY DEFINER');
    }

    // Test the function one more time
    console.log('\n\n🧪 Testing function call...\n');
    try {
      const testResult = await client.query(`
        SELECT * FROM save_chat_attachment(
          199,  -- p_message_id
          35,   -- p_conversation_id
          'test.jpg',  -- p_file_name
          'image',     -- p_file_type
          'image/jpeg', -- p_mime_type
          1024, -- p_file_size
          'test-path/file.jpg', -- p_storage_path
          '1a78b40c-326b-4f58-bc7b-0f81235d4d81'::uuid -- p_user_id
        );
      `);

      console.log('✅ Function call succeeded!');
      console.log('Result:', testResult.rows[0]);
    } catch (fnError) {
      console.error('❌ Function call failed:', fnError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
