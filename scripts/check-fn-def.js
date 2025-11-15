import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  const result = await sql`
    SELECT pg_get_functiondef('save_chat_attachment'::regprocedure) as def
  `;
  console.log(result[0].def);
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await sql.end();
}
