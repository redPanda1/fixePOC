import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { createReceipt, deleteReceipt, getReceipt, listReceipts } from '../apis/endpoints';
import { LOGOUT } from './authSlice';
import type { ApiError } from '../types/api';
import type { CreateReceiptRequest, ReceiptRecord, ReceiptSummary } from '../types/receipts';
import { clearStoredReceipts, readStoredReceipts, storeReceipts } from '../utils/sessionStorage';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ReceiptsState {
  items: ReceiptSummary[];
  listStatus: AsyncStatus;
  current: ReceiptRecord | null;
  detailStatus: AsyncStatus;
  uploadStatus: AsyncStatus;
  deletingId: string | null;
  error: string | null;
}

const initialState: ReceiptsState = {
  items: readStoredReceipts() ?? [],
  listStatus: 'idle',
  current: null,
  detailStatus: 'idle',
  uploadStatus: 'idle',
  deletingId: null,
  error: null,
};

export const fetchReceipts = createAsyncThunk<ReceiptSummary[], void, { rejectValue: ApiError }>(
  'receipts/fetchReceipts',
  async (_arg, { rejectWithValue }) => {
    const result = await listReceipts();
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data.receipts;
  },
);

export const fetchReceiptDetail = createAsyncThunk<ReceiptRecord, string, { rejectValue: ApiError }>(
  'receipts/fetchReceiptDetail',
  async (id, { rejectWithValue }) => {
    const result = await getReceipt(id);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data.receipt;
  },
);

export const uploadReceipt = createAsyncThunk<ReceiptRecord, CreateReceiptRequest, { rejectValue: ApiError }>(
  'receipts/uploadReceipt',
  async (payload, { rejectWithValue }) => {
    const result = await createReceipt(payload);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data.receipt;
  },
);

export const removeReceipt = createAsyncThunk<string, string, { rejectValue: ApiError }>(
  'receipts/removeReceipt',
  async (id, { rejectWithValue }) => {
    const result = await deleteReceipt(id);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return id;
  },
);

const receiptsSlice = createSlice({
  name: 'receipts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceipts.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(fetchReceipts.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.items = action.payload;
        storeReceipts(action.payload);
      })
      .addCase(fetchReceipts.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload?.message ?? 'Receipts could not be loaded';
      })
      .addCase(uploadReceipt.pending, (state) => {
        state.uploadStatus = 'loading';
        state.error = null;
      })
      .addCase(uploadReceipt.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        state.current = action.payload;
        state.detailStatus = 'succeeded';
        state.items = [
          {
            id: action.payload.id,
            vendor: action.payload.vendor,
            totalAmount: action.payload.totalAmount,
            currency: action.payload.currency,
            receiptDate: action.payload.receiptDate,
            analysisStatus: action.payload.analysisStatus,
            createdAt: action.payload.createdAt,
            originalFileName: action.payload.originalFileName,
            thumbnailAccessUrl: action.payload.thumbnailAccessUrl,
          },
          ...state.items,
        ];
        storeReceipts(state.items);
      })
      .addCase(uploadReceipt.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.error = action.payload?.message ?? 'Receipt could not be uploaded';
      })
      .addCase(fetchReceiptDetail.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchReceiptDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchReceiptDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error = action.payload?.message ?? 'Receipt could not be loaded';
      })
      .addCase(removeReceipt.pending, (state, action) => {
        state.deletingId = action.meta.arg;
      })
      .addCase(removeReceipt.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((item) => item.id !== action.payload);
        storeReceipts(state.items);
        if (state.current?.id === action.payload) {
          state.current = null;
        }
      })
      .addCase(removeReceipt.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload?.message ?? 'Receipt could not be deleted';
      })
      .addCase(LOGOUT, (state) => {
        clearStoredReceipts();
        state.items = [];
        state.listStatus = 'idle';
      });
  },
});

export const receiptsReducer = receiptsSlice.reducer;
