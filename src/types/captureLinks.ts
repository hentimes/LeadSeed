// El limite de links (null = sin limite, ej. admin) no vive aca a proposito:
// es un dato del USUARIO, no de cada link, y con cero links no habria de
// donde leerlo. Usar getMyCaptureLinksLimit() de captureLinksService.
export type CaptureLinkType = 'pb' | 'retiro';

export interface CaptureLink {
  id: number;
  refCode: string;
  label: string;
  campaignName: string;
  linkType: CaptureLinkType;
  isDefault: boolean;
  isActive: boolean;
  statsConfig: Record<string, unknown>;
  totalLeads: number;
  closedLeads: number;
  closeRatePct: number;
  visits: number;
  step1Completions: number;
  step2Completions: number;
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
  linkType?: CaptureLinkType;
  isActive?: boolean;
  isDefault?: boolean;
  statsConfig?: Record<string, unknown>;
}
