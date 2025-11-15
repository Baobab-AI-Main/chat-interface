import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgres://postgres:035hhjpjl3e1gcyspm8m76zngc01voqc@switchback.proxy.rlwy.net:17675/postgres';

async function fixFunction() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Drop the old function
    console.log('Dropping old function...');
    await client.query('DROP FUNCTION IF EXISTS save_chat_attachment(INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, TEXT, UUID) CASCADE;');
    console.log('✅ Old function dropped\n');

    // Create the corrected function with UUID parameter for user_id (users.id)
    console.log('Creating corrected function...');
    const createSQL = `
CREATE FUNCTION save_chat_attachment(
  p_message_id INTEGER,
  p_conversation_id INTEGER,
  p_file_name TEXT,
  p_file_type TEXT,
  p_mime_type TEXT,
  p_file_size INTEGER,
  p_storage_path TEXT,
  p_user_id UUID
)
RETURNS TABLE (id UUID, file_name TEXT, mime_type TEXT, file_size BIGINT, storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- Allow if user is owner OR in participants array
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
      RETURNING chat_message_attachments.id, chat_message_attachments.file_name, 
                chat_message_attachments.mime_type, chat_message_attachments.file_size, 
                chat_message_attachments.storage_path;
  END;
$$;
    `;

    await client.query(createSQL);
    console.log('✅ New corrected function created successfully!\n');

    console.log('🎉 Function deployment complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixFunction();
