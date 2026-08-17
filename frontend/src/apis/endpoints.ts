import axios from 'axios';

import type { Organization } from '../types/organization';
import type { Person } from '../types/person';
import type {
  CreateReceiptRequest,
  CreateReceiptResponse,
  GetReceiptResponse,
  ListReceiptsResponse,
} from '../types/receipts';
import { apiRequest } from './apiClient';

export function fetchPersonRecord(token?: string) {
  return apiRequest<Person>('/login', token ? { token } : undefined);
}

export function fetchPersonProfile() {
  return apiRequest<Person>('/person', { method: 'GET' });
}

export interface UpdatePersonPayload {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export function updatePerson(payload: UpdatePersonPayload) {
  return apiRequest<Person>('/person', { method: 'PUT', body: payload });
}

export function fetchOrganization() {
  return apiRequest<Organization>('/organization', { method: 'GET' });
}

export interface UpdateOrganizationPayload {
  name: string;
  avatarUrl?: string;
}

export function updateOrganization(payload: UpdateOrganizationPayload) {
  return apiRequest<Organization>('/organization', { method: 'PUT', body: payload });
}

export interface CreateAvatarUploadUrlPayload {
  target: 'person' | 'organization';
  contentType: string;
}

export interface AvatarUploadUrlResponse {
  upload_url: string;
  file_url: string;
  headers: Record<string, string>;
  expires_in: number;
}

export function createAvatarUploadUrl(payload: CreateAvatarUploadUrlPayload) {
  return apiRequest<AvatarUploadUrlResponse>('/avatars/upload-url', {
    method: 'POST',
    body: payload,
  });
}

// Presigned S3 URLs are absolute and unauthenticated, so this deliberately bypasses
// axiosApiClient (which would prefix apiBaseUrl and attach a Bearer token).
export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
): Promise<void> {
  await axios.put(uploadUrl, file, { headers });
}

export interface SendChatMessageResponse {
  reply: string;
}

export function sendChatMessage(message: string) {
  return apiRequest<SendChatMessageResponse>('/chat', {
    method: 'POST',
    body: { message },
  });
}

export function createReceipt(payload: CreateReceiptRequest) {
  return apiRequest<CreateReceiptResponse>('/receipts', {
    method: 'POST',
    body: payload,
  });
}

export function listReceipts() {
  return apiRequest<ListReceiptsResponse>('/receipts', { method: 'GET' });
}

export function getReceipt(id: string) {
  return apiRequest<GetReceiptResponse>(`/receipts/${id}`, { method: 'GET' });
}

export function deleteReceipt(id: string) {
  return apiRequest<void>(`/receipts/${id}`, { method: 'DELETE' });
}
