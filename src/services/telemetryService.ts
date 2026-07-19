import { incrementTelemetry } from '../repositories/telemetryRepository';
import type { Page } from '../types';

export async function trackPageTime(userId: string, section: Page, seconds: number): Promise<void> {
  if (seconds <= 0) {
    return;
  }

  await incrementTelemetry(userId, section, seconds);
}
