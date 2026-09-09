import { incrementTelemetry } from '../repositories/telemetryRepository';
import type { Page } from '../types';

export async function trackPageTime(section: Page, seconds: number): Promise<void> {
  if (seconds <= 0) {
    return;
  }

  await incrementTelemetry(section, seconds);
}
