export interface UserListItem {
  username: string;
  email: string;
  personId: string | null;
  orgId: string | null;
  orgName: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  enabled: boolean;
  cognitoStatus: string | null;
  createdAt: string | null;
  hasPersonRecord: boolean;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  orgId?: string;
  newOrganizationName?: string;
}
