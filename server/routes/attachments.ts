import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Client as MinioClient } from 'minio';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB image cap
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Initialize Supabase client using service role key (server-side)
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseApiKey = supabaseServiceRoleKey || supabaseAnonKey;

const supabaseAdminClient = supabaseServiceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const minioEndpoint = process.env.MINIO_ENDPOINT ?? '';
const minioPort = Number(process.env.MINIO_PORT ?? '9000');
const minioUseSSL = String(process.env.MINIO_USE_SSL ?? 'false').toLowerCase() === 'true';
const minioAccessKey = process.env.MINIO_ACCESS_KEY ?? '';
const minioSecretKey = process.env.MINIO_SECRET_KEY ?? '';
const minioBucket = process.env.MINIO_BUCKET ?? 'chat-uploads';

const minioPublicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? minioEndpoint;
const minioPublicPort = Number(process.env.MINIO_PUBLIC_PORT ?? String(minioPort));
const minioPublicUseSSL = process.env.MINIO_PUBLIC_USE_SSL
  ? String(process.env.MINIO_PUBLIC_USE_SSL).toLowerCase() === 'true'
  : minioUseSSL;
const minioSignedUrlBase =
  process.env.MINIO_SIGNED_URL_BASE ??
  process.env.MINIO_PUBLIC_BASE_URL ??
  process.env.MINIO_PUBLIC_URL ??
  '';

if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
  console.error('Missing MinIO environment variables for attachment upload');
}

if (!supabaseUrl || !supabaseApiKey) {
  console.error('Missing Supabase environment variables for attachment upload');
}

const minioInternalClient = new MinioClient({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
});

const minioPublicClient = new MinioClient({
  endPoint: minioPublicEndpoint,
  port: minioPublicPort,
  useSSL: minioPublicUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
});

let bucketPromise: Promise<void> | null = null;

function rewriteSignedUrl(url: string): string {
  if (!minioSignedUrlBase) {
    return url;
  }

  try {
    const generated = new URL(url);
    const externalBase = new URL(minioSignedUrlBase);

    generated.protocol = externalBase.protocol;
    generated.hostname = externalBase.hostname;

    if (externalBase.port) {
      generated.port = externalBase.port;
    } else {
      generated.port = '';
    }

    return generated.toString();
  } catch (error) {
    console.error('Failed to rewrite MinIO signed URL', error);
    return url;
  }
}

async function ensureBucketExists() {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      try {
        const exists = await minioInternalClient.bucketExists(minioBucket);
        if (!exists) {
          await minioInternalClient.makeBucket(minioBucket);
          console.log(`Created MinIO bucket: ${minioBucket}`);
        }
      } catch (error) {
        bucketPromise = null;
        throw error;
      }
    })();
  }

  return bucketPromise;
}

function createSupabaseClient(accessToken: string) {
  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error('Supabase client missing configuration');
  }

  return createClient(supabaseUrl, supabaseApiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

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

      try {
        await ensureBucketExists();
      } catch (bucketError) {
        console.error('MinIO bucket unavailable', bucketError);
        return res.status(500).json({ error: 'Storage bucket is not available' });
      }

    const token = authHeader.substring(7);

    let supabase;
    try {
      supabase = createSupabaseClient(token);
    } catch (clientError) {
      console.error('Supabase client initialization failed', clientError);
      return res.status(500).json({ error: 'Supabase configuration error' });
    }

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
      .select('id, owner_user_id, participant_ids, org_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      if (convError) {
        console.error('Conversation lookup failed during upload', convError);
      }
      return res.status(403).json({ error: 'Conversation not found or access denied' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('Attachment upload conversation check', {
        userId: user.id,
        conversationId: conversation.id,
        ownerId: conversation.owner_user_id,
        participantIds: conversation.participant_ids,
      });
    }

    const orgId = conversation.org_id ?? 'default-org';

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
    const storagePath = `${orgId}/${conversation_id}/uploads/${fileName}`;

    try {
      await minioInternalClient.putObject(minioBucket, storagePath, req.file.buffer, req.file.size, {
        'Content-Type': req.file.mimetype,
      });
    } catch (uploadError) {
      console.error('MinIO upload error:', uploadError);
      const message = uploadError instanceof Error ? uploadError.message : 'Unknown MinIO upload failure';
      return res.status(500).json({ error: `Failed to upload file: ${message}` });
    }

    let signedUrl: string | null = null;
    try {
      signedUrl = await minioPublicClient.presignedGetObject(minioBucket, storagePath, 600);
      signedUrl = rewriteSignedUrl(signedUrl);
    } catch (signedUrlError) {
      console.error('MinIO signed URL error:', signedUrlError);
      const message = signedUrlError instanceof Error ? signedUrlError.message : 'Unknown MinIO signed URL failure';
      return res.status(500).json({ error: `Failed to generate signed URL: ${message}` });
    }

    res.json({
      storage_path: storagePath,
      file_url: signedUrl,
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

router.get('/:attachmentId/url', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    let supabase;
    try {
      supabase = createSupabaseClient(token);
    } catch (clientError) {
      console.error('Supabase client initialization failed', clientError);
      return res.status(500).json({ error: 'Supabase configuration error' });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const attachmentId = req.params.attachmentId;
    const { data: attachment, error: attachmentError } = await supabase
      .from('chat_message_attachments')
      .select('id, storage_path, conversation_id')
      .eq('id', attachmentId)
      .single();

    if (attachmentError || !attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, owner_user_id, participant_ids')
      .eq('id', attachment.conversation_id)
      .single();

    if (convError || !conversation) {
      if (convError) {
        console.error('Conversation lookup failed during signed URL fetch', convError);
      }
      return res.status(403).json({ error: 'Conversation not found or access denied' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('Attachment URL conversation check', {
        userId: user.id,
        conversationId: conversation.id,
        ownerId: conversation.owner_user_id,
        participantIds: conversation.participant_ids,
      });
    }

    let signedUrl: string | null = null;
    try {
      signedUrl = await minioPublicClient.presignedGetObject(minioBucket, attachment.storage_path, 600);
      signedUrl = rewriteSignedUrl(signedUrl);
    } catch (error) {
      console.error('MinIO signed URL error:', error);
      const message = error instanceof Error ? error.message : 'Unknown MinIO signed URL failure';
      return res.status(500).json({ error: `Failed to generate signed URL: ${message}` });
    }

    return res.json({ url: signedUrl });
  } catch (error) {
    console.error('Attachment signed URL error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create attachment URL',
    });
  }
});

router.post('/save', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (!supabaseAdminClient) {
      console.error('Supabase admin client is not configured');
      return res.status(500).json({ error: 'Supabase admin client unavailable' });
    }

    const token = authHeader.substring(7);
    let supabase;
    try {
      supabase = createSupabaseClient(token);
    } catch (clientError) {
      console.error('Supabase client initialization failed', clientError);
      return res.status(500).json({ error: 'Supabase configuration error' });
    }

    const {
      message_id: rawMessageId,
      conversation_id: rawConversationId,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      file_size: rawFileSize,
      file_type: rawFileType,
    } = req.body ?? {};

    const messageId = Number(rawMessageId);
    const conversationId = Number(rawConversationId);
    const fileSize = Number(rawFileSize);
    const fileType = typeof rawFileType === 'string' && rawFileType.trim().length > 0
      ? rawFileType.trim().toLowerCase()
      : 'image';

    if (!Number.isFinite(messageId) || !Number.isFinite(conversationId)) {
      return res.status(400).json({ error: 'message_id and conversation_id must be numbers' });
    }

    if (!storagePath || typeof storagePath !== 'string') {
      return res.status(400).json({ error: 'storage_path is required' });
    }

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'file_name is required' });
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({ error: 'mime_type is required' });
    }

    if (!Number.isFinite(fileSize)) {
      return res.status(400).json({ error: 'file_size must be a number' });
    }

    const allowedFileTypes = new Set(['image', 'file']);
    const normalizedFileType = allowedFileTypes.has(fileType) ? fileType : 'image';

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, owner_user_id, participant_ids')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      if (convError) {
        console.error('Conversation lookup failed during attachment save', convError);
      }
      return res.status(403).json({ error: 'Conversation not found or access denied' });
    }

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      if (messageError) {
        console.error('Message lookup failed during attachment save', messageError);
      }
      return res.status(400).json({ error: 'Message not found for conversation' });
    }

    const { data: attachmentRow, error: attachmentError } = await supabaseAdminClient
      .from('chat_message_attachments')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        file_type: normalizedFileType,
      })
      .select('id, file_name, mime_type, file_size, storage_path')
      .single();

    if (attachmentError || !attachmentRow) {
      console.error('Attachment save insert failed', attachmentError);
      return res.status(500).json({ error: 'Failed to save attachment' });
    }

    return res.json(attachmentRow);
  } catch (error) {
    console.error('Attachment save error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save attachment',
    });
  }
});

export default router;
