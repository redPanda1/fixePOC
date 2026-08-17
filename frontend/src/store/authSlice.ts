import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  refreshCognitoTokens,
  respondToNewPasswordChallenge,
  signInWithPassword,
} from '../apis/cognitoAuth';
import {
  fetchPersonProfile,
  fetchPersonRecord,
  updatePerson,
  type UpdatePersonPayload,
} from '../apis/endpoints';
import type { ApiError, ApiResult } from '../types/api';
import type { Person } from '../types/person';
import {
  clearStoredAuthToken,
  readStoredTokenMaterial,
  storeTokenMaterial,
  type StoredTokenMaterial,
} from '../utils/sessionStorage';

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  tokenMaterial: StoredTokenMaterial | null;
  person: Person | null;
  personStatus: AuthStatus;
  personUpdateStatus: AuthStatus;
  error: string | null;
}

const initialTokenMaterial = readStoredTokenMaterial();

const initialState: AuthState = {
  status: 'idle',
  token: initialTokenMaterial?.idToken ?? null,
  tokenMaterial: initialTokenMaterial,
  person: null,
  personStatus: 'idle',
  personUpdateStatus: 'idle',
  error: null,
};

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthenticatedResult {
  tokenMaterial: StoredTokenMaterial;
  person: Person;
}

export type LoginOutcome =
  | ({ kind: 'authenticated' } & AuthenticatedResult)
  | {
      kind: 'challenge';
      session: string;
      username: string;
      requiredAttributes: string[];
      userAttributes: Record<string, string>;
    };

async function finishAuthentication(
  tokenMaterial: StoredTokenMaterial,
): Promise<ApiResult<AuthenticatedResult>> {
  storeTokenMaterial(tokenMaterial);

  const personResult = await fetchPersonRecord(tokenMaterial.idToken);
  if (!personResult.ok) {
    clearStoredAuthToken();
    return personResult;
  }

  return { ok: true, data: { tokenMaterial, person: personResult.data } };
}

export const LOGIN_WITH_PASSWORD = createAsyncThunk<
  LoginOutcome,
  LoginCredentials,
  { rejectValue: ApiError }
>('auth/loginWithPassword', async ({ username, password }, { rejectWithValue }) => {
  const authResult = await signInWithPassword(username.trim(), password);
  if (!authResult.ok) {
    return rejectWithValue(authResult.error);
  }

  if (authResult.data.kind === 'challenge') {
    return authResult.data;
  }

  const finishResult = await finishAuthentication(authResult.data.tokenMaterial);
  if (!finishResult.ok) {
    return rejectWithValue(finishResult.error);
  }

  return { kind: 'authenticated', ...finishResult.data };
});

export const COMPLETE_NEW_PASSWORD_CHALLENGE = createAsyncThunk<
  AuthenticatedResult,
  { username: string; newPassword: string; session: string },
  { rejectValue: ApiError }
>(
  'auth/completeNewPasswordChallenge',
  async ({ username, newPassword, session }, { rejectWithValue }) => {
    const challengeResult = await respondToNewPasswordChallenge(username, newPassword, session);
    if (!challengeResult.ok) {
      return rejectWithValue(challengeResult.error);
    }

    const finishResult = await finishAuthentication(challengeResult.data);
    if (!finishResult.ok) {
      return rejectWithValue(finishResult.error);
    }

    return finishResult.data;
  },
);

export const REFRESH_SESSION = createAsyncThunk<
  StoredTokenMaterial,
  void,
  { rejectValue: ApiError }
>('auth/refreshSession', async (_, { rejectWithValue }) => {
  const tokenMaterial = readStoredTokenMaterial();
  if (!tokenMaterial?.refreshToken) {
    return rejectWithValue({
      kind: 'unauthenticated',
      status: 401,
      message: 'No saved session token was found.',
    });
  }

  const result = await refreshCognitoTokens(tokenMaterial.refreshToken);
  if (!result.ok) {
    return rejectWithValue(result.error);
  }

  storeTokenMaterial(result.data);
  return result.data;
});

export const FETCH_CURRENT_PERSON = createAsyncThunk<Person, void, { rejectValue: ApiError }>(
  'auth/fetchCurrentPerson',
  async (_, { rejectWithValue }) => {
    const personResult = await fetchPersonRecord();
    if (!personResult.ok) {
      return rejectWithValue(personResult.error);
    }
    return personResult.data;
  },
);

export const FETCH_PERSON_PROFILE = createAsyncThunk<Person, void, { rejectValue: ApiError }>(
  'auth/fetchPersonProfile',
  async (_, { rejectWithValue }) => {
    const result = await fetchPersonProfile();
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data;
  },
);

export const UPDATE_PERSON = createAsyncThunk<Person, UpdatePersonPayload, { rejectValue: ApiError }>(
  'auth/updatePerson',
  async (payload, { rejectWithValue }) => {
    const result = await updatePerson(payload);
    if (!result.ok) {
      return rejectWithValue(result.error);
    }
    return result.data;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      clearStoredAuthToken();
      state.token = null;
      state.tokenMaterial = null;
      state.person = null;
      state.personStatus = 'idle';
      state.personUpdateStatus = 'idle';
      state.status = 'idle';
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setTokenMaterial: (state, action: PayloadAction<StoredTokenMaterial>) => {
      storeTokenMaterial(action.payload);
      state.token = action.payload.idToken;
      state.tokenMaterial = action.payload;
    },
    setTokenForTest: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.tokenMaterial = {
        idToken: action.payload,
        accessToken: action.payload,
        refreshToken: action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(LOGIN_WITH_PASSWORD.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(LOGIN_WITH_PASSWORD.fulfilled, (state, action) => {
        if (action.payload.kind === 'challenge') {
          state.status = 'idle';
          state.error = null;
          return;
        }
        state.status = 'succeeded';
        state.token = action.payload.tokenMaterial.idToken;
        state.tokenMaterial = action.payload.tokenMaterial;
        state.person = action.payload.person;
        state.personStatus = 'succeeded';
        state.error = null;
      })
      .addCase(LOGIN_WITH_PASSWORD.rejected, (state, action) => {
        state.status = 'failed';
        state.token = null;
        state.tokenMaterial = null;
        state.person = null;
        state.personStatus = 'idle';
        state.error = action.payload?.message ?? action.error.message ?? 'Login failed.';
      })
      .addCase(COMPLETE_NEW_PASSWORD_CHALLENGE.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(COMPLETE_NEW_PASSWORD_CHALLENGE.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.tokenMaterial.idToken;
        state.tokenMaterial = action.payload.tokenMaterial;
        state.person = action.payload.person;
        state.personStatus = 'succeeded';
        state.error = null;
      })
      .addCase(COMPLETE_NEW_PASSWORD_CHALLENGE.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          action.payload?.message ?? action.error.message ?? 'Could not set new password.';
      })
      .addCase(REFRESH_SESSION.fulfilled, (state, action) => {
        state.token = action.payload.idToken;
        state.tokenMaterial = action.payload;
      })
      .addCase(REFRESH_SESSION.rejected, (state) => {
        clearStoredAuthToken();
        state.token = null;
        state.tokenMaterial = null;
        state.person = null;
        state.personStatus = 'idle';
        state.status = 'idle';
      })
      .addCase(FETCH_CURRENT_PERSON.pending, (state) => {
        state.personStatus = 'loading';
      })
      .addCase(FETCH_CURRENT_PERSON.fulfilled, (state, action) => {
        state.person = action.payload;
        state.personStatus = 'succeeded';
      })
      .addCase(FETCH_CURRENT_PERSON.rejected, (state) => {
        clearStoredAuthToken();
        state.token = null;
        state.tokenMaterial = null;
        state.person = null;
        state.personStatus = 'failed';
      })
      .addCase(FETCH_PERSON_PROFILE.pending, (state) => {
        state.personStatus = 'loading';
      })
      .addCase(FETCH_PERSON_PROFILE.fulfilled, (state, action) => {
        state.person = action.payload;
        state.personStatus = 'succeeded';
      })
      .addCase(FETCH_PERSON_PROFILE.rejected, (state, action) => {
        state.personStatus = 'failed';
        state.error = action.payload?.message ?? action.error.message ?? 'Profile could not be loaded.';
      })
      .addCase(UPDATE_PERSON.pending, (state) => {
        state.personUpdateStatus = 'loading';
        state.error = null;
      })
      .addCase(UPDATE_PERSON.fulfilled, (state, action) => {
        state.person = action.payload;
        state.personUpdateStatus = 'succeeded';
      })
      .addCase(UPDATE_PERSON.rejected, (state, action) => {
        state.personUpdateStatus = 'failed';
        state.error = action.payload?.message ?? action.error.message ?? 'Profile could not be saved.';
      });
  },
});

export const {
  logout: LOGOUT,
  clearAuthError: CLEAR_AUTH_ERROR,
  setTokenMaterial: SET_TOKEN_MATERIAL,
  setTokenForTest: SET_TOKEN_FOR_TEST,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
