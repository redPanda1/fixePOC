import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchOrganization,
  listOrganizations,
  updateOrganization,
  type UpdateOrganizationPayload,
} from '../apis/endpoints';
import type { ApiError } from '../types/api';
import type { Organization, OrganizationSummary } from '../types/organization';
import { LOGOUT } from './authSlice';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface OrganizationState {
  organization: Organization | null;
  status: AsyncStatus;
  updateStatus: AsyncStatus;
  organizations: OrganizationSummary[];
  listStatus: AsyncStatus;
  error: string | null;
}

const initialState: OrganizationState = {
  organization: null,
  status: 'idle',
  updateStatus: 'idle',
  organizations: [],
  listStatus: 'idle',
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

export const LIST_ORGANIZATIONS = createAsyncThunk<OrganizationSummary[], void, { rejectValue: ApiError }>(
  'organization/listOrganizations',
  async (_, { rejectWithValue }) => {
    const result = await listOrganizations();
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data.organizations;
  },
);

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
      .addCase(LIST_ORGANIZATIONS.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(LIST_ORGANIZATIONS.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.organizations = action.payload;
      })
      .addCase(LIST_ORGANIZATIONS.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload?.message ?? 'Organizations could not be loaded.';
      })
      .addCase(LOGOUT, (state) => {
        state.organization = null;
        state.status = 'idle';
        state.updateStatus = 'idle';
        state.organizations = [];
        state.listStatus = 'idle';
        state.error = null;
      });
  },
});

export const organizationReducer = organizationSlice.reducer;
