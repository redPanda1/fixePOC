export interface Organization {
  orgId: string;
  name: string;
  avatarUrl: string | null;
  defaultAmId: string | null;
}

export interface OrganizationSummary {
  orgId: string;
  name: string;
  defaultAmId: string | null;
}
