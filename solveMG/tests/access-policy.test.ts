import { describe, expect, it } from 'vitest';
import { decideAccess, renewedAccessLimit, UNLIMITED_ACCESS } from '../src/domain/access/access-policy.js';

describe('access policy', () => {
  it('authorizes normal and two tolerated extra entries, then blocks', () => {
    const normal = decideAccess({ clientActive: true, blocked: false, accessLimit: 2, accessCount: 1, tolerance: 2, accessType: 'ENTRY' });
    const extra = decideAccess({ clientActive: true, blocked: false, accessLimit: 2, accessCount: 2, tolerance: 2, accessType: 'ENTRY' });
    const last = decideAccess({ clientActive: true, blocked: false, accessLimit: 2, accessCount: 4, tolerance: 2, accessType: 'ENTRY' });
    expect(normal.authorized).toBe(true);
    expect(extra.extra).toBe(true);
    expect(last.authorized).toBe(false);
    expect(last.blocked).toBe(true);
  });

  it('supports unlimited access and carries debt into renewal', () => {
    expect(decideAccess({ clientActive: true, blocked: false, accessLimit: UNLIMITED_ACCESS, accessCount: 300, tolerance: 0, accessType: 'ENTRY' }).authorized).toBe(true);
    expect(renewedAccessLimit(10, -2)).toBe(8);
    expect(renewedAccessLimit(-1, -2)).toBe(UNLIMITED_ACCESS);
  });

  it('allows an active client to exit without consuming an entry', () => {
    const decision = decideAccess({ clientActive: true, blocked: true, accessLimit: 1, accessCount: 4, tolerance: 0, accessType: 'EXIT' });
    expect(decision.authorized).toBe(true);
    expect(decision.nextAccessCount).toBe(4);
  });
});