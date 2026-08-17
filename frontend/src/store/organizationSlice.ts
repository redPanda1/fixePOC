import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchOrganization, updateOrganization, type UpdateOrganizationPayload } from '../apis/endpoints';
import type { ApiError } from '../types/api';
import type { Organization } from '../types/organization';
import { LOGOUT } from './authSlice';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface OrganizationState {
  organization: Organization | null;
  status: AsyncStatus;
  updateStatus: AsyncStatus;
  error: string | null;
}

const initialState: OrganizationState = {
  organization: null,
  status: 'idle',
  updateStatus: 'idle',
  error: null,
};

export const FETCH_ORGANIZATION = createAsyncThunk<Organization, void, { rejectValue: ApiError }>(
  'organization/fetchOrganization',
  async (_, { rejectWithValue }) => {
    const result = await fetchOrganization();
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data;
  },
);

export const UPDATE_ORGANIZATION = createAsyncThunk<
  Organization,
  UpdateOrganizationPayload,
  { rejectValue: ApiError }
>('organization/updateOrganization', async (payload, { rejectWithValue }) => {
  const result = await updateOrganization(payload);
  if (!result.ok) {
    return rejectWithValue(result.error);
  }
  return result.data;
});

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(FETCH_ORGANIZATION.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(FETCH_ORGANIZATION.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.organization = action.payload;
      })
      .addCase(FETCH_ORGANIZATION.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? 'Organization could not be loaded.';
      })
      .addCase(UPDATE_ORGANIZATION.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(UPDATE_ORGANIZATION.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.organization = action.payload;
      })
      .addCase(UPDATE_ORGANIZATION.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload?.message ?? 'Organization could not be saved.';
      })
      .addCase(LOGOUT, (state) => {
        state.organization = null;
        state.status = 'idle';
        state.updateStatus = 'idle';
        state.error = null;
      });
  },
});

export const organizationReducer = organizationSlice.reducer;
