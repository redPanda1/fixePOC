export type ThreadEntryType = 'question' | 'action' | 'agent_proposal';

export type ThreadStatus =
  | 'created'
  | 'read'
  | 'in_progress'
  | 'waiting_on_customer'
  | 'waiting_on_internal'
  | 'complete'
  | 'archived';

export type MessageType = 'user' | 'system';

export type ProposalVerdict = 'approved' | 'rejected' | 'modified';

export type ThreadEventType =
  | 'created'
  | 'status_change'
  | 'assigned'
  | 'message_added'
  | 'option_selected'
  | 'verdict_rendered';

export interface MessageOption {
  id: string;
  label: string;
  value: string;
}

export interface ResolvedReference {
  type: 'receipt' | 'link';
  url: string | null;
  thumbnailUrl?: string | null;
  label: string | null;
  receiptId?: string;
}

export interface ReferenceInput {
  type: 'receipt' | 'link';
  receiptId?: string;
  personId?: string;
  url?: string;
  label?: string;
}

export interface ThreadMessage {
  messageId: string;
  author: string;
  authorName: string;
  messageType: MessageType;
  content: string;
  references: ResolvedReference[];
  options: MessageOption[];
  selectedOptionId: string | null;
  selectedById: string | null;
  selectedByName: string | null;
  selectedAt: string | null;
  createdAt: string;
}

export interface ThreadEvent {
  eventId: string;
  actorId: string;
  actorName: string;
  eventType: ThreadEventType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}

export interface ProposedAction {
  type: string;
  checkNumber: string;
  date: string;
  amount: number;
  vendor: string;
  proposedAccount: string;
  currentAccount: string;
}

export interface AgentProposal {
  proposedAction: ProposedAction;
  confidence: number;
  evidence: ResolvedReference[];
  verdict: ProposalVerdict | null;
  verdictById: string | null;
  verdictByName: string | null;
  verdictAt: string | null;
  verdictNote: string | null;
  editedAction: ProposedAction | null;
}

export interface ThreadSummary {
  threadId: string;
  entryType: ThreadEntryType;
  orgId: string;
  createdById: string;
  assignedToId: string;
  status: ThreadStatus;
  subject: string;
  lastMessagePreview: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadDetail extends ThreadSummary {
  readAt: string | null;
  archivedAt: string | null;
  createdByName: string;
  assignedToName: string;
  proposal: AgentProposal | null;
  messages: ThreadMessage[];
  events: ThreadEvent[];
}

export interface PickerReceipt {
  receiptId: string;
  personId: string;
  vendor: string | null;
  totalAmount: string | null;
  currency: string | null;
  receiptDate: string | null;
  originalFileName: string;
  thumbnailAccessUrl: string | null;
}

export interface CreateThreadRequest {
  orgId: string;
  assignedToId: string;
  subject: string;
  body: string;
  entryType?: 'question' | 'action';
  references?: ReferenceInput[];
  options?: MessageOption[];
}

export interface AddMessageRequest {
  content: string;
  references?: ReferenceInput[];
  options?: MessageOption[];
}

export interface SelectOptionRequest {
  optionId: string;
}

export interface SetThreadStatusRequest {
  status: ThreadStatus;
}

export interface RenderVerdictRequest {
  verdict: ProposalVerdict;
  verdictNote?: string;
  editedAction?: ProposedAction;
}

export interface SimulateAgentRequest {
  orgId: string;
}

export interface ThreadResponse {
  thread: ThreadDetail;
}

export interface ListThreadsResponse {
  threads: ThreadSummary[];
}

export interface ListPickerReceiptsResponse {
  receipts: PickerReceipt[];
}
