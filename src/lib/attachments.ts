import { appConfig } from "../config";
import { supabase } from "./supabase";

export interface UploadChatAttachmentPayload {
  file: File;
  conversationId: string;
}

export interface UploadChatAttachmentResult {
  storagePath: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const MISSING_ENDPOINT_ERROR =
  "Attachment upload endpoint is not configured (VITE_ATTACHMENT_UPLOAD_ENDPOINT).";

function normaliseValue<T extends string>(primary?: T, fallback?: T): T {
  return (primary ?? fallback ?? "") as T;
}

export async function uploadChatAttachment(
  payload: UploadChatAttachmentPayload,
): Promise<UploadChatAttachmentResult> {
  const endpoint = appConfig.attachmentUploadEndpoint;
  if (!endpoint) {
    throw new Error(MISSING_ENDPOINT_ERROR);
  }

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("conversation_id", payload.conversationId);

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Attachment upload failed with ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  const storagePath = normaliseValue(
    data.storage_path as string | undefined,
    data.storagePath as string | undefined,
  );
  const fileUrl = normaliseValue(
    data.file_url as string | undefined,
    data.fileUrl as string | undefined,
  );
  const fileName = normaliseValue(
    data.file_name as string | undefined,
    data.fileName as string | undefined,
  );
  const mimeType = normaliseValue(
    data.mime_type as string | undefined,
    data.mimeType as string | undefined,
  );
  const fileSizeRaw = data.file_size ?? data.fileSize;
  const fileSize = typeof fileSizeRaw === "number" ? fileSizeRaw : Number(fileSizeRaw);

  if (!storagePath || !fileUrl || !fileName || !mimeType || !Number.isFinite(fileSize)) {
    throw new Error("Attachment upload response missing required fields");
  }

  return {
    storagePath,
    fileUrl,
    fileName,
    mimeType,
    fileSize,
  };
}
