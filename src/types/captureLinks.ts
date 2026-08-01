export interface CaptureLink {
  id: number;
  refCode: string;
  label: string;
  campaignName: string;
  isDefault: boolean;
  isActive: boolean;
  statsConfig: Record<string, unknown>;
  totalLeads: number;
  closedLeads: number;
  closeRatePct: number;
  captureLinksLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureLinkStats {
  captureLinkId: number;
  refCode: string;
  linkName: string;
  campaignName: string;
  totalLeads: number;
  closedLeads: number;
  closeRatePct: number;
  ageRange: string;
  incomeRange: string;
  region: string;
  healthSystem: string;
  healthProvider: string;
  leadsCount: number;
}

export interface CaptureLinkInput {
  label: string;
  campaignName?: string;
  isActive?: boolean;
  isDefault?: boolean;
  statsConfig?: Record<string, unknown>;
}
