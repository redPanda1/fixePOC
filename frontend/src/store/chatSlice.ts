import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { sendChatMessage } from '../apis/endpoints';
import type { ApiError } from '../types/api';

export type ChatRole = 'user' | 'assistant';
export type ChatMessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
}

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
}

const initialState: ChatState = {
  messages: [],
  sending: false,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const SEND_MESSAGE = createAsyncThunk<
  { userMessageId: string; reply: string },
  string,
  { rejectValue: { userMessageId: string; error: ApiError } }
>('chat/sendMessage', async (message, { dispatch, rejectWithValue }) => {
  const userMessageId = generateId();
  dispatch(chatSlice.actions.userMessageQueued({ id: userMessageId, content: message }));

  const result = await sendChatMessage(message);
  if (!result.ok) {
    return rejectWithValue({ userMessageId, error: result.error });
  }

  return { userMessageId, reply: result.data.reply };
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    userMessageQueued: (state, action: { payload: { id: string; content: string } }) => {
      state.messages.push({
        id: action.payload.id,
        role: 'user',
        content: action.payload.content,
        status: 'sending',
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(SEND_MESSAGE.pending, (state) => {
        state.sending = true;
      })
      .addCase(SEND_MESSAGE.fulfilled, (state, action) => {
        state.sending = false;
        const userMessage = state.messages.find((m) => m.id === action.payload.userMessageId);
        if (userMessage) userMessage.status = 'sent';
        state.messages.push({
          id: generateId(),
          role: 'assistant',
          content: action.payload.reply,
          status: 'sent',
        });
      })
      .addCase(SEND_MESSAGE.rejected, (state, action) => {
        state.sending = false;
        const userMessageId = action.payload?.userMessageId;
        const userMessage = state.messages.find((m) => m.id === userMessageId);
        if (userMessage) userMessage.status = 'failed';
      });
  },
});

export const chatReducer = chatSlice.reducer;
