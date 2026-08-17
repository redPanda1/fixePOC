import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type MessageType = 'ERROR' | 'INFO' | 'SUCCESS' | 'WARNING';

interface MessageState {
  text: string;
  type: MessageType;
}

interface LoadingState {
  active: boolean;
  showBackdrop: boolean;
  backdropMessage: string | null;
}

interface StatusState {
  message: MessageState | null;
  loading: LoadingState;
}

const initialState: StatusState = {
  message: null,
  loading: {
    active: false,
    showBackdrop: false,
    backdropMessage: null,
  },
};

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    userMessage: (state, action: PayloadAction<{ message: string; type: MessageType }>) => {
      state.message = { text: action.payload.message, type: action.payload.type };
    },
    closeMessage: (state) => {
      state.message = null;
    },
    startLoading: (
      state,
      action: PayloadAction<{ showBackdrop?: boolean; backdropMessage?: string }>,
    ) => {
      state.loading = {
        active: true,
        showBackdrop: action.payload.showBackdrop ?? false,
        backdropMessage: action.payload.backdropMessage ?? null,
      };
    },
    endLoading: (state) => {
      state.loading = initialState.loading;
    },
  },
});

export const {
  userMessage: USER_MESSAGE,
  closeMessage: CLOSE_MESSAGE,
  startLoading: START_LOADING,
  endLoading: END_LOADING,
} = statusSlice.actions;
export const statusReducer = statusSlice.reducer;
