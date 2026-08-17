export interface Organization {
  orgId: string;
  name: string;
  avatarUrl: string | null;
}

export interface OrganizationSummary {
  orgId: string;
  name: string;
}
