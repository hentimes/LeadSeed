// El limite de links (null = sin limite, ej. admin) no vive aca a proposito:
// es un dato del USUARIO, no de cada link, y con cero links no habria de
// donde leerlo. Usar getMyCaptureLinksLimit() de captureLinksService.
//
// Antes era 'pb' | 'retiro' (union fija). Ahora es cualquier FormType.slug
// registrado en la tabla form_types -- un admin puede agregar tipos nuevos
// sin tocar codigo, asi que ya no hay un conjunto cerrado de valores.
export type CaptureLinkType = string;

/** Tipo de formulario registrado (pb/retiro/etc.), fuente de verdad de link_type. */
export interface FormType {
  slug: string;
  displayName: string;
  /** Patron de URL publica con el placeholder {ref}, ej. 'https://planespro.cl/pb/{ref}'. */
  urlTemplate: string;
  /** Si es true, solo un admin puede crear links de este tipo. */
  linksAdminOnly: boolean;
  isActive: boolean;
}

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
