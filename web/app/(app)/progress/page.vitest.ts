import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('progress page', () => {
  /**
   * Each section component owns its own heading (ManualRecords renders "Manual
   * records"), so the page must not render a second title above ProgressDashboard
   * - that shipped "Current records / N exercises" immediately above the
   * component's own "Current personal records / N exercises".
   */
  it('lets each section component own its heading, with no duplicate above the dashboard', () => {
    const page = read('app/(app)/progress/page.tsx');
    expect(page).toContain('<ProgressDashboard');
    expect(page).not.toContain('Current records');
    expect(page).not.toContain('native-section-title');
    // The metrics were built twice purely to render that duplicate count.
    expect(page.match(/buildProgressMetrics\(sets\)/g)).toHaveLength(1);
    expect(read('components/progress-dashboard.tsx')).toContain('Current personal records');
  });
});
