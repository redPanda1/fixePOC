import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { createUser, listUsers, resetUserPassword, setUserStatus } from '../apis/endpoints';
import { LOGOUT } from './authSlice';
import type { ApiError } from '../types/api';
import type { CreateUserPayload, UserListItem } from '../types/user';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface UsersState {
  items: UserListItem[];
  listStatus: AsyncStatus;
  createStatus: AsyncStatus;
  statusUpdatingUsername: string | null;
  resetPasswordUsername: string | null;
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  listStatus: 'idle',
  createStatus: 'idle',
  statusUpdatingUsername: null,
  resetPasswordUsername: null,
  error: null,
};

export const fetchUsers = createAsyncThunk<UserListItem[], void, { rejectValue: ApiError }>(
  'users/fetchUsers',
  async (_arg, { rejectWithValue }) => {
    const result = await listUsers();
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data.users;
  },
);

export const addUser = createAsyncThunk<UserListItem, CreateUserPayload, { rejectValue: ApiError }>(
  'users/addUser',
  async (payload, { rejectWithValue }) => {
    const result = await createUser(payload);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data;
  },
);

export const updateUserStatus = createAsyncThunk<
  { username: string; enabled: boolean },
  { username: string; enabled: boolean },
  { rejectValue: ApiError }
>('users/updateUserStatus', async ({ username, enabled }, { rejectWithValue }) => {
  const result = await setUserStatus(username, enabled);
  if (!result.ok) {
    return rejectWithValue(result.error);
  }
  return result.data;
});

export const sendPasswordReset = createAsyncThunk<string, string, { rejectValue: ApiError }>(
  'users/sendPasswordReset',
  async (username, { rejectWithValue }) => {
    const result = await resetUserPassword(username);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return username;
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload?.message ?? 'Users could not be loaded';
      })
      .addCase(addUser.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.items = [action.payload, ...state.items];
      })
      .addCase(addUser.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload?.message ?? 'User could not be created';
      })
      .addCase(updateUserStatus.pending, (state, action) => {
        state.statusUpdatingUsername = action.meta.arg.username;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.statusUpdatingUsername = null;
        const item = state.items.find((user) => user.username === action.payload.username);
        if (item) {
          item.enabled = action.payload.enabled;
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.statusUpdatingUsername = null;
        state.error = action.payload?.message ?? 'User status could not be updated';
      })
      .addCase(sendPasswordReset.pending, (state, action) => {
        state.resetPasswordUsername = action.meta.arg;
      })
      .addCase(sendPasswordReset.fulfilled, (state) => {
        state.resetPasswordUsername = null;
      })
      .addCase(sendPasswordReset.rejected, (state, action) => {
        state.resetPasswordUsername = null;
        state.error = action.payload?.message ?? 'Password reset email could not be sent';
      })
      .addCase(LOGOUT, (state) => {
        state.items = [];
        state.listStatus = 'idle';
        state.createStatus = 'idle';
        state.statusUpdatingUsername = null;
        state.resetPasswordUsername = null;
        state.error = null;
      });
  },
});

export const usersReducer = usersSlice.reducer;
