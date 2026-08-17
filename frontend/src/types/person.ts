export type UserType = 'ADMIN' | 'USER';

export type CommunicationPreference = 'email' | 'textMessage' | 'fixeApp';

export interface Person {
  personId: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
  avatarUrl: string | null;
  communicationPreferences: CommunicationPreference[];
}
