import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import type { ApiError, ApiResult } from '../types/api';
import { appConfig } from '../utils/env';
import type { StoredTokenMaterial } from '../utils/sessionStorage';

const client = new CognitoIdentityProviderClient({
  region: appConfig.awsRegion,
});

function unexpectedError(error: unknown, fallback: string): ApiError {
  return {
    kind: 'unexpected',
    status: null,
    message: error instanceof Error ? error.message : fallback,
    details: error instanceof Error ? { name: error.name, message: error.message } : undefined,
  };
}

const VALIDATION_EXCEPTIONS = new Set([
  'CodeMismatchException',
  'ExpiredCodeException',
  'InvalidPasswordException',
  'InvalidParameterException',
]);

function mapCognitoError(error: unknown, fallback: string): ApiError {
  const name = error instanceof Error ? error.name : undefined;
  const details = error instanceof Error ? { name: error.name, message: error.message } : undefined;

  if (name === 'NotAuthorizedException') {
    return {
      kind: 'unauthenticated',
      status: 401,
      message: error instanceof Error ? error.message : fallback,
      details,
    };
  }

  if (name && VALIDATION_EXCEPTIONS.has(name)) {
    return {
      kind: 'validation',
      status: 400,
      message: error instanceof Error ? error.message : fallback,
      details,
    };
  }

  if (name === 'LimitExceededException' || name === 'TooManyRequestsException') {
    return {
      kind: 'unexpected',
      status: 429,
      message: 'Too many attempts. Please wait a few minutes and try again.',
      details,
    };
  }

  return unexpectedError(error, fallback);
}

export type SignInOutcome =
  | { kind: 'authenticated'; tokenMaterial: StoredTokenMaterial }
  | {
      kind: 'challenge';
      session: string;
      username: string;
      requiredAttributes: string[];
      userAttributes: Record<string, string>;
    };

export async function signInWithPassword(
  username: string,
  password: string,
): Promise<ApiResult<SignInOutcome>> {
  try {
    const response = await client.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: appConfig.cognitoClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      }),
    );

    if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      if (!response.Session) {
        return {
          ok: false,
          error: {
            kind: 'unauthenticated',
            status: 401,
            message: 'Cognito did not return a challenge session.',
          },
        };
      }

      const challengeParameters = response.ChallengeParameters ?? {};
      let requiredAttributes: string[] = [];
      let userAttributes: Record<string, string> = {};
      try {
        requiredAttributes = JSON.parse(
          challengeParameters.requiredAttributes ?? '[]',
        ) as string[];
      } catch {
        requiredAttributes = [];
      }
      try {
        userAttributes = JSON.parse(challengeParameters.userAttributes ?? '{}') as Record<
          string,
          string
        >;
      } catch {
        userAttributes = {};
      }

      return {
        ok: true,
        data: {
          kind: 'challenge',
          session: response.Session,
          username,
          requiredAttributes,
          userAttributes,
        },
      };
    }

    const result = response.AuthenticationResult;
    if (!result?.IdToken || !result.AccessToken || !result.RefreshToken) {
      return {
        ok: false,
        error: {
          kind: 'unauthenticated',
          status: 401,
          message: 'Cognito did not return authentication tokens.',
        },
      };
    }

    return {
      ok: true,
      data: {
        kind: 'authenticated',
        tokenMaterial: {
          idToken: result.IdToken,
          accessToken: result.AccessToken,
          refreshToken: result.RefreshToken,
        },
      },
    };
  } catch (error) {
    return { ok: false, error: mapCognitoError(error, 'Sign in failed.') };
  }
}

export async function respondToNewPasswordChallenge(
  username: string,
  newPassword: string,
  session: string,
): Promise<ApiResult<StoredTokenMaterial>> {
  try {
    const response = await client.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: appConfig.cognitoClientId,
        Session: session,
        // This user pool has no required signup attributes today (ChallengeParameters
        // .requiredAttributes is always "[]"). If that ever changes, additional
        // `userAttributes.<name>` keys collected from the form would need to be added here.
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: newPassword,
        },
      }),
    );

    const result = response.AuthenticationResult;
    if (!result?.IdToken || !result.AccessToken || !result.RefreshToken) {
      return {
        ok: false,
        error: {
          kind: 'unauthenticated',
          status: 401,
          message: 'Cognito did not return authentication tokens.',
        },
      };
    }

    return {
      ok: true,
      data: {
        idToken: result.IdToken,
        accessToken: result.AccessToken,
        refreshToken: result.RefreshToken,
      },
    };
  } catch (error) {
    return { ok: false, error: mapCognitoError(error, 'Could not set new password.') };
  }
}

export async function requestPasswordReset(username: string): Promise<ApiResult<void>> {
  try {
    await client.send(
      new ForgotPasswordCommand({
        ClientId: appConfig.cognitoClientId,
        Username: username,
      }),
    );
    // PreventUserExistenceErrors is enabled on this user pool, so Cognito returns a
    // success-shaped response here regardless of whether the username exists. There is
    // no UserNotFoundException to special-case — any thrown error below is a genuine
    // failure (bad client id, throttling, network).
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapCognitoError(error, 'Could not request a password reset.') };
  }
}

export async function confirmPasswordReset(
  username: string,
  code: string,
  newPassword: string,
): Promise<ApiResult<void>> {
  try {
    await client.send(
      new ConfirmForgotPasswordCommand({
        ClientId: appConfig.cognitoClientId,
        Username: username,
        ConfirmationCode: code,
        Password: newPassword,
      }),
    );
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapCognitoError(error, 'Could not reset password.') };
  }
}

export async function refreshCognitoTokens(
  refreshToken: string,
): Promise<ApiResult<StoredTokenMaterial>> {
  try {
    const response = await client.send(
      new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: appConfig.cognitoClientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }),
    );

    const result = response.AuthenticationResult;
    if (!result?.IdToken || !result.AccessToken) {
      return {
        ok: false,
        error: {
          kind: 'unauthenticated',
          status: 401,
          message: 'Cognito did not return refreshed tokens.',
        },
      };
    }

    return {
      ok: true,
      data: {
        idToken: result.IdToken,
        accessToken: result.AccessToken,
        // REFRESH_TOKEN_AUTH does not issue a new refresh token; keep reusing the current one.
        refreshToken: result.RefreshToken ?? refreshToken,
      },
    };
  } catch (error) {
    return { ok: false, error: unexpectedError(error, 'Session refresh failed.') };
  }
}
