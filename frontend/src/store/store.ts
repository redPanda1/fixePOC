import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { configureApiClient } from '../apis/apiClient';
import { refreshCognitoTokens } from '../apis/cognitoAuth';
import { readStoredTokenMaterial, storeTokenMaterial } from '../utils/sessionStorage';
import { actionQueueReducer } from './actionQueueSlice';
import { authReducer, LOGOUT, SET_TOKEN_MATERIAL } from './authSlice';
import { chatReducer } from './chatSlice';
import { organizationReducer } from './organizationSlice';
import { receiptsReducer } from './receiptsSlice';
import { statusReducer, USER_MESSAGE } from './statusSlice';

const appReducer = combineReducers({
  actionQueue: actionQueueReducer,
  auth: authReducer,
  chat: chatReducer,
  organization: organizationReducer,
  receipts: receiptsReducer,
  status: statusReducer,
});

export type RootState = ReturnType<typeof appReducer>;

const rootReducer: typeof appReducer = (state, action) => {
  if (LOGOUT.match(action)) {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type AppDispatch = typeof store.dispatch;

let refreshInFlight: Promise<string | null> | null = null;

async function refreshApiClientToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const tokenMaterial = readStoredTokenMaterial();
    if (!tokenMaterial?.refreshToken) {
      return null;
    }

    const result = await refreshCognitoTokens(tokenMaterial.refreshToken);
    if (!result.ok) {
      return null;
    }

    storeTokenMaterial(result.data);
    store.dispatch(SET_TOKEN_MATERIAL(result.data));
    return result.data.idToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

configureApiClient({
  getToken: () => store.getState().auth.token,
  refreshToken: refreshApiClientToken,
  onUnauthenticated: () => {
    store.dispatch(LOGOUT());
    store.dispatch(
      USER_MESSAGE({
        message: 'Your session expired. Sign in again to continue.',
        type: 'WARNING',
      }),
    );
  },
});
