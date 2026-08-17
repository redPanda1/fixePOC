export type ReceiptAnalysisStatus = 'analyzed' | 'not_receipt' | 'unreadable' | 'error';

export type ReceiptAnalysisOutcome =
  | 'accepted'
  | 'low_confidence'
  | 'unreadable'
  | 'invalid_output'
  | 'provider_error';

export interface ReceiptAnalysisItem {
  description: string;
  quantity: string | null;
  unitCost: string | null;
  lineTotal: string;
}

export interface ReceiptAnalysisAttempt {
  modelId: string;
  outcome: ReceiptAnalysisOutcome;
  confidence?: number;
}

export interface ReceiptAnalysisError {
  code: string;
  message: string;
}

export interface ReceiptSummary {
  id: string;
  orgId: string;
  vendor: string | null;
  totalAmount: string | null;
  currency: string | null;
  receiptDate: string | null;
  analysisStatus: ReceiptAnalysisStatus;
  createdAt: string;
  originalFileName: string;
  thumbnailAccessUrl: string | null;
}

export interface ReceiptRecord extends ReceiptSummary {
  updatedAt: string;
  contentType: string;
  imageAccessUrl: string;
  confidence: number | null;
  modelId: string | null;
  items: ReceiptAnalysisItem[];
  analysisAttempts: ReceiptAnalysisAttempt[];
  analysisError: ReceiptAnalysisError | null;
}

export interface CreateReceiptRequest {
  orgId: string;
  image: {
    file_name: string;
    content_type: 'image/jpeg' | 'image/png' | 'image/webp';
    data_base64: string;
  };
}

export interface CreateReceiptResponse {
  receipt: ReceiptRecord;
}

export interface GetReceiptResponse {
  receipt: ReceiptRecord;
}

export interface ListReceiptsResponse {
  receipts: ReceiptSummary[];
}
