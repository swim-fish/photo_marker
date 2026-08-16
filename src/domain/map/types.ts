import type { Wgs84Coordinate } from '../coordinates/types';

export type MapProviderId = 'nlsc-emap5';
export type MapNetworkConsentStatus = 'unknown' | 'granted' | 'revoked';

export type MapNetworkConsent = Readonly<{
  policyVersion: number;
  status: MapNetworkConsentStatus;
  providerId: MapProviderId;
  grantedAt: string | null;
  revokedAt: string | null;
}>;

export type MapPreviewStatus =
  'closed' | 'consentRequired' | 'loading' | 'open' | 'offline' | 'providerError';

export type MapPreviewState = Readonly<{
  status: MapPreviewStatus;
  photoId: string | null;
  center: Wgs84Coordinate | null;
  onlineIndicatorVisible: boolean;
  providerId: MapProviderId | null;
}>;
