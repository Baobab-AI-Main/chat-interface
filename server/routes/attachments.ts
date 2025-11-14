import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    // Allowed MIME types
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Initialize Supabase client using service role key (server-side)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables for attachment upload');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * POST /api/chat/attachments/upload
 * 
 * Upload a file attachment for a chat message.
 * 
 * Expected form data:
 * - file: File object
 * - conversation_id: string (conversation ID)
 * 
 * Expected headers:
 * - Authorization: Bearer {supabase_jwt_token}
 * 
 * Response:
 * {
 *   storage_path: string,
 *   file_url: string,
 *   file_name: string,
 *   mime_type: string,
 *   file_size: number
 * }
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get form data
    const { conversation_id } = req.body;
    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, owner_user_id, participant_ids')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return res.status(403).json({ error: 'Conversation not found or access denied' });
    }

    const isOwner = conversation.owner_user_id === user.id;
    const isParticipant = conversation.participant_ids?.includes(user.id);

    if (!isOwner && !isParticipant) {
      return res.status(403).json({ error: 'You do not have access to this conversation' });
    }

    // Get org_id from conversation
    const { data: convWithOrg } = await supabase
      .from('chat_conversations')
      .select('org_id')
      .eq('id', conversation_id)
      .single();

    const org_id = convWithOrg?.org_id || 'default-org';

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const sanitizedName = path.basename(req.file.originalname, ext)
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase()
      .substring(0, 50);
    const fileUuid = uuidv4();
    const fileName = `${fileUuid}-${sanitizedName}${ext}`;

    // Build storage path: {org_id}/{conversation_id}/{message_id}/{uuid}-{safeName}
    // Note: message_id will be added when the attachment is recorded in the database
    const storagePath = `${org_id}/${conversation_id}/uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: `Failed to upload file: ${uploadError.message}` });
    }

    // Generate a signed URL for the file (10 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(storagePath, 600); // 10 minutes

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return res.status(500).json({ error: `Failed to generate signed URL: ${signedUrlError.message}` });
    }

    res.json({
      storage_path: storagePath,
      file_url: signedUrlData.signedUrl,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload attachment',
    });
  }
});

export default router;
