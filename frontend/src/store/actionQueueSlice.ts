import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addMessage,
  createThread,
  getThread,
  listOrgReceipts,
  listThreads,
  renderVerdict,
  selectOption,
  setThreadStatus,
  simulateAgent,
} from '../apis/endpoints';
import type { ApiError } from '../types/api';
import type {
  AddMessageRequest,
  CreateThreadRequest,
  PickerReceipt,
  RenderVerdictRequest,
  SetThreadStatusRequest,
  SimulateAgentRequest,
  ThreadDetail,
  ThreadSummary,
} from '../types/actionQueue';
import { LOGOUT } from './authSlice';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ActionQueueState {
  items: ThreadSummary[];
  listStatus: AsyncStatus;
  current: ThreadDetail | null;
  detailStatus: AsyncStatus;
  createStatus: AsyncStatus;
  actionStatus: AsyncStatus;
  pickerReceipts: PickerReceipt[];
  pickerReceiptsStatus: AsyncStatus;
  error: string | null;
}

const initialState: ActionQueueState = {
  items: [],
  listStatus: 'idle',
  current: null,
  detailStatus: 'idle',
  createStatus: 'idle',
  actionStatus: 'idle',
  pickerReceipts: [],
  pickerReceiptsStatus: 'idle',
  error: null,
};

export const fetchThreads = createAsyncThunk<ThreadSummary[], void, { rejectValue: ApiError }>(
  'actionQueue/fetchThreads',
  async (_arg, { rejectWithValue }) => {
    const result = await listThreads();
    if (!result.ok) return rejectWithValue(result.error);
    return result.data.threads;
  },
);

export const fetchThreadDetail = createAsyncThunk<ThreadDetail, string, { rejectValue: ApiError }>(
  'actionQueue/fetchThreadDetail',
  async (threadId, { rejectWithValue }) => {
    const result = await getThread(threadId);
    if (!result.ok) return rejectWithValue(result.error);
    return result.data.thread;
  },
);

export const createNewThread = createAsyncThunk<ThreadDetail, CreateThreadRequest, { rejectValue: ApiError }>(
  'actionQueue/createNewThread',
  async (payload, { rejectWithValue }) => {
    const result = await createThread(payload);
    if (!result.ok) return rejectWithValue(result.error);
    return result.data.thread;
  },
);

export const postMessage = createAsyncThunk<
  ThreadDetail,
  { threadId: string; payload: AddMessageRequest },
  { rejectValue: ApiError }
>('actionQueue/postMessage', async ({ threadId, payload }, { rejectWithValue }) => {
  const result = await addMessage(threadId, payload);
  if (!result.ok) return rejectWithValue(result.error);
  return result.data.thread;
});

export const selectThreadOption = createAsyncThunk<
  ThreadDetail,
  { threadId: string; messageId: string; optionId: string },
  { rejectValue: ApiError }
>('actionQueue/selectThreadOption', async ({ threadId, messageId, optionId }, { rejectWithValue }) => {
  const result = await selectOption(threadId, messageId, { optionId });
  if (!result.ok) return rejectWithValue(result.error);
  return result.data.thread;
});

export const transitionThreadStatus = createAsyncThunk<
  ThreadDetail,
  { threadId: string; payload: SetThreadStatusRequest },
  { rejectValue: ApiError }
>('actionQueue/transitionThreadStatus', async ({ threadId, payload }, { rejectWithValue }) => {
  const result = await setThreadStatus(threadId, payload);
  if (!result.ok) return rejectWithValue(result.error);
  return result.data.thread;
});

export const postVerdict = createAsyncThunk<
  ThreadDetail,
  { threadId: string; payload: RenderVerdictRequest },
  { rejectValue: ApiError }
>('actionQueue/postVerdict', async ({ threadId, payload }, { rejectWithValue }) => {
  const result = await renderVerdict(threadId, payload);
  if (!result.ok) return rejectWithValue(result.error);
  return result.data.thread;
});

export const runSimulateAgent = createAsyncThunk<ThreadDetail, SimulateAgentRequest, { rejectValue: ApiError }>(
  'actionQueue/runSimulateAgent',
  async (payload, { rejectWithValue }) => {
    const result = await simulateAgent(payload);
    if (!result.ok) return rejectWithValue(result.error);
    return result.data.thread;
  },
);

export const fetchPickerReceipts = createAsyncThunk<PickerReceipt[], string, { rejectValue: ApiError }>(
  'actionQueue/fetchPickerReceipts',
  async (orgId, { rejectWithValue }) => {
    const result = await listOrgReceipts(orgId);
    if (!result.ok) return rejectWithValue(result.error);
    return result.data.receipts;
  },
);

const actionQueueSlice = createSlice({
  name: 'actionQueue',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload?.message ?? 'Threads could not be loaded';
      })
      .addCase(fetchThreadDetail.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchThreadDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchThreadDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error = action.payload?.message ?? 'Thread could not be loaded';
      })
      .addCase(createNewThread.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createNewThread.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.current = action.payload;
      })
      .addCase(createNewThread.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload?.message ?? 'Thread could not be created';
      })
      .addCase(fetchPickerReceipts.pending, (state) => {
        state.pickerReceiptsStatus = 'loading';
      })
      .addCase(fetchPickerReceipts.fulfilled, (state, action) => {
        state.pickerReceiptsStatus = 'succeeded';
        state.pickerReceipts = action.payload;
      })
      .addCase(fetchPickerReceipts.rejected, (state, action) => {
        state.pickerReceiptsStatus = 'failed';
        state.error = action.payload?.message ?? 'Receipts could not be loaded';
      })
      .addCase(LOGOUT, (state) => {
        state.items = [];
        state.listStatus = 'idle';
        state.current = null;
        state.detailStatus = 'idle';
        state.pickerReceipts = [];
        state.pickerReceiptsStatus = 'idle';
        state.error = null;
      });

    // Every thread-mutating action follows the same pending/fulfilled/rejected shape
    // against `actionStatus` and replaces `current` with the server's fresh state.
    for (const thunk of [postMessage, selectThreadOption, transitionThreadStatus, postVerdict, runSimulateAgent]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.actionStatus = 'loading';
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.actionStatus = 'succeeded';
          state.current = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.actionStatus = 'failed';
          state.error = action.payload?.message ?? 'That action could not be completed';
        });
    }
  },
});

export const actionQueueReducer = actionQueueSlice.reducer;
