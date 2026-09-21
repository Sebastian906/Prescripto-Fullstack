import {
  getJwtSecrets,
  isPreviousAccepted,
} from '../shared/utils/jwt-secrets.util';

const cfg = (m: Record<string, string>) => ({
  get: (k: string, fb?: any) => m[k] ?? fb,
});

describe('jwt-secrets.util', () => {
  it('prefers CURRENT, falls back to legacy JWT_SECRET', () => {
    expect(getJwtSecrets(cfg({ JWT_SECRET: 'old' })).current).toBe('old');
    expect(
      getJwtSecrets(cfg({ JWT_SECRET: 'old', JWT_SECRET_CURRENT: 'new' }))
        .current,
    ).toBe('new');
  });
  it('accepts previous before deadline, rejects after', () => {
    const s = getJwtSecrets(
      cfg({
        JWT_SECRET_CURRENT: 'new',
        JWT_SECRET_PREVIOUS: 'old',
        JWT_ROTATION_DEADLINE: '2026-09-19T00:00:00.000Z',
      }),
    );
    expect(isPreviousAccepted(s, new Date('2026-09-18T00:00:00.000Z'))).toBe(
      true,
    );
    expect(isPreviousAccepted(s, new Date('2026-09-20T00:00:00.000Z'))).toBe(
      false,
    );
  });
  it('rejects previous when unconfigured or deadline absent (fail closed)', () => {
    expect(isPreviousAccepted(getJwtSecrets(cfg({ JWT_SECRET: 'x' })))).toBe(
      false,
    );
    expect(
      isPreviousAccepted(
        getJwtSecrets(cfg({ JWT_SECRET: 'x', JWT_SECRET_PREVIOUS: 'o' })),
      ),
    ).toBe(false);
  });
  it('rejects previous on malformed deadline (fail closed)', () => {
    const s = getJwtSecrets(
      cfg({
        JWT_SECRET: 'x',
        JWT_SECRET_PREVIOUS: 'o',
        JWT_ROTATION_DEADLINE: 'nope',
      }),
    );
    expect(s.deadline).toBeUndefined();
    expect(isPreviousAccepted(s)).toBe(false);
  });
});
