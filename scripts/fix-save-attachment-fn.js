import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  try {
    console.log('🔧 Dropping and recreating function save_chat_attachment...\n');

    // Drop the old function
    await sql`DROP FUNCTION IF EXISTS public.save_chat_attachment`;
    console.log('✅ Old function dropped\n');

    // Create the corrected function
    await sql`
      CREATE FUNCTION public.save_chat_attachment(
        p_message_id INTEGER,
        p_conversation_id INTEGER,
        p_file_name TEXT,
        p_file_type TEXT,
        p_mime_type TEXT,
        p_file_size BIGINT,
        p_storage_path TEXT,
        p_user_id UUID
      )
      RETURNS TABLE (
        id UUID,
        file_name TEXT,
        mime_type TEXT,
        file_size BIGINT,
        storage_path TEXT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
        v_owner UUID;
        v_participants UUID[];
        v_msg INTEGER;
      BEGIN
        -- verify message belongs to conversation
        SELECT m.id INTO v_msg
        FROM chat_messages m
        WHERE m.id = p_message_id AND m.conversation_id = p_conversation_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Message % does not belong to conversation %', p_message_id, p_conversation_id
            USING ERRCODE = '22023';
        END IF;

        -- verify conversation exists and user is owner/participant
        SELECT c.owner_user_id, c.participant_ids
          INTO v_owner, v_participants
        FROM chat_conversations c
        WHERE c.id = p_conversation_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Conversation % not found', p_conversation_id
            USING ERRCODE = '22023';
        END IF;

        -- CORRECTED: Allow if user is owner OR in participants array
        IF p_user_id != v_owner AND NOT (v_participants IS NOT NULL AND p_user_id = ANY(v_participants)) THEN
          RAISE EXCEPTION 'User % not authorized for conversation %', p_user_id, p_conversation_id
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
          INSERT INTO chat_message_attachments (
            message_id, conversation_id, file_name, file_type, mime_type, file_size, storage_path
          ) VALUES (
            p_message_id, p_conversation_id, p_file_name, p_file_type, p_mime_type, p_file_size, p_storage_path
          )
          RETURNING id, file_name, mime_type, file_size, storage_path;
      END;
      $$;
    `;

    console.log('✅ Function recreated with corrected logic\n');

    // Grant permissions
    await sql`GRANT EXECUTE ON FUNCTION public.save_chat_attachment(INTEGER, INTEGER, TEXT, TEXT, TEXT, BIGINT, TEXT, UUID) TO authenticated;`;
    console.log('✅ Execute permission granted to authenticated role\n');

    console.log('✅ All done!');
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
