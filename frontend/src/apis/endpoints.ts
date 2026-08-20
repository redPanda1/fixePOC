import axios from 'axios';

import type {
  AddMessageRequest,
  CreateThreadRequest,
  ListPickerReceiptsResponse,
  ListThreadsResponse,
  RenderVerdictRequest,
  SelectOptionRequest,
  SetThreadStatusRequest,
  SimulateAgentRequest,
  ThreadResponse,
} from '../types/actionQueue';
import type { Organization, OrganizationSummary } from '../types/organization';
import type { CommunicationPreference, Person } from '../types/person';
import type {
  CreateReceiptRequest,
  CreateReceiptResponse,
  GetReceiptResponse,
  ListReceiptsResponse,
} from '../types/receipts';
import type { CreateUserPayload, UserListItem } from '../types/user';
import { apiRequest } from './apiClient';

export function fetchPersonRecord(token?: string) {
  return apiRequest<Person>('/login', token ? { token } : undefined);
}

export function fetchPersonProfile(token?: string) {
  return apiRequest<Person>('/person', token ? { method: 'GET', token } : { method: 'GET' });
}

export interface UpdatePersonPayload {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  communicationPreferences?: CommunicationPreference[];
  phoneNumber?: string | null;
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

export interface ListOrganizationsResponse {
  organizations: OrganizationSummary[];
}

export function listOrganizations() {
  return apiRequest<ListOrganizationsResponse>('/organizations', { method: 'GET' });
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
  file: Blob,
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

export function createThread(payload: CreateThreadRequest) {
  return apiRequest<ThreadResponse>('/action-queue/threads', { method: 'POST', body: payload });
}

export function listThreads() {
  return apiRequest<ListThreadsResponse>('/action-queue/threads', { method: 'GET' });
}

export function getThread(threadId: string) {
  return apiRequest<ThreadResponse>(`/action-queue/threads/${threadId}`, { method: 'GET' });
}

export function addMessage(threadId: string, payload: AddMessageRequest) {
  return apiRequest<ThreadResponse>(`/action-queue/threads/${threadId}/messages`, {
    method: 'POST',
    body: payload,
  });
}

export function selectOption(threadId: string, messageId: string, payload: SelectOptionRequest) {
  return apiRequest<ThreadResponse>(`/action-queue/threads/${threadId}/messages/${messageId}/select`, {
    method: 'POST',
    body: payload,
  });
}

export function setThreadStatus(threadId: string, payload: SetThreadStatusRequest) {
  return apiRequest<ThreadResponse>(`/action-queue/threads/${threadId}/status`, {
    method: 'POST',
    body: payload,
  });
}

export function renderVerdict(threadId: string, payload: RenderVerdictRequest) {
  return apiRequest<ThreadResponse>(`/action-queue/threads/${threadId}/verdict`, {
    method: 'POST',
    body: payload,
  });
}

export interface CreateChatImageUploadUrlPayload {
  orgId: string;
  contentType: string;
}

export interface ChatImageUploadUrlResponse {
  upload_url: string;
  key: string;
  expires_in: number;
}

export function createChatImageUploadUrl(payload: CreateChatImageUploadUrlPayload) {
  return apiRequest<ChatImageUploadUrlResponse>('/action-queue/chat-images/upload-url', {
    method: 'POST',
    body: payload,
  });
}

export function simulateAgent(payload: SimulateAgentRequest) {
  return apiRequest<ThreadResponse>('/action-queue/simulate-agent', { method: 'POST', body: payload });
}

export function listOrgReceipts(orgId: string) {
  return apiRequest<ListPickerReceiptsResponse>(
    `/action-queue/receipts?orgId=${encodeURIComponent(orgId)}`,
    { method: 'GET' },
  );
}

export interface ListUsersResponse {
  users: UserListItem[];
}

export function listUsers() {
  return apiRequest<ListUsersResponse>('/users', { method: 'GET' });
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<UserListItem>('/users', { method: 'POST', body: payload });
}

export function setUserStatus(username: string, enabled: boolean) {
  return apiRequest<{ username: string; enabled: boolean }>(
    `/users/${encodeURIComponent(username)}/status`,
    { method: 'PUT', body: { enabled } },
  );
}

export function resetUserPassword(username: string) {
  return apiRequest<{ message: string }>(
    `/users/${encodeURIComponent(username)}/reset-password`,
    { method: 'POST' },
  );
}
