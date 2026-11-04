import { RELEASES } from './release-notes';
import { APP_VERSION } from './version.generated';

const semver = /^(\d+)\.(\d+)\.(\d+)$/;
const parts = (v: string) => semver.exec(v)!.slice(1).map(Number);

describe('release notes', () => {
  it('has a note for the version in package.json', () => {
    // Bumped the version? Add what changed to release-notes.ts, then run `npm run changelog`.
    expect(RELEASES[0]?.version).toBe(APP_VERSION);
  });

  it('lists releases newest first, each with a real version, date and notes', () => {
    RELEASES.forEach((release, i) => {
      expect(release.version).toMatch(semver);
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.notes.length).toBeGreaterThan(0);
      const next = RELEASES[i + 1];
      if (!next) return;
      const [a, b] = [parts(release.version), parts(next.version)];
      const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
      expect(newer, `${release.version} should come before ${next.version}`).toBeGreaterThan(0);
      expect(release.date >= next.date).toBe(true);
    });
  });
});
