import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  try {
    console.log('🔍 Checking deployed function version...\n');

    // Get the function source code
    const result = await sql`
      SELECT 
        routine_name,
        routine_definition,
        routine_schema
      FROM information_schema.routines 
      WHERE routine_name = 'save_chat_attachment'
        AND routine_schema = 'public'
    `;

    if (result.length === 0) {
      console.log('❌ Function not found!');
      return;
    }

    const fn = result[0];
    console.log('✅ Function found!\n');
    console.log('Schema:', fn.routine_schema);
    console.log('Name:', fn.routine_name);
    console.log('\n--- Function Definition ---\n');
    console.log(fn.routine_definition);
    console.log('\n--- Analysis ---\n');

    // Check if it has the correct logic
    if (fn.routine_definition.includes('p_user_id != v_owner AND NOT (v_participants IS NOT NULL AND p_user_id = ANY(v_participants))')) {
      console.log('✅ CORRECT: Function has the NEW authorization logic');
    } else if (fn.routine_definition.includes('IS DISTINCT FROM v_owner AND (v_participants IS NULL OR NOT p_user_id = ANY(v_participants))')) {
      console.log('❌ OLD VERSION: Function has the buggy authorization logic');
    } else {
      console.log('❓ UNKNOWN: Cannot determine which version is deployed');
      console.log('\nSearching for authorization check...');
      const lines = fn.routine_definition.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('p_user_id') && line.includes('v_owner')) {
          console.log(`  Line ${idx}: ${line.trim()}`);
        }
      });
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}

main();
