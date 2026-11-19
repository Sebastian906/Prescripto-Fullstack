import {
  DOC_SNAPSHOT_KEYS,
  USER_SNAPSHOT_KEYS,
  pickSnapshot,
} from '../appointments/schemas/appointment.schema';

describe('pickSnapshot', () => {
  const userData = {
    _id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
    image: 'ana.png',
    address: '{"line1":"a","line2":""}',
    gender: 'Female',
    dob: '1990-01-01',
    phone: '+573001234567',
    password: '$2b$10$hash',
    diagnosis: 'flu',
    observations: 'rash',
    notes: 'private',
  };

  it('copia solo las claves de usuario permitidas', () => {
    const snapshot = pickSnapshot(userData, USER_SNAPSHOT_KEYS);
    expect(Object.keys(snapshot).sort()).toEqual(
      [...USER_SNAPSHOT_KEYS].sort(),
    );
  });

  it('no incluye password, diagnosis, observations ni notes', () => {
    const snapshot = pickSnapshot(userData, USER_SNAPSHOT_KEYS);
    expect(snapshot).not.toHaveProperty('password');
    expect(snapshot).not.toHaveProperty('diagnosis');
    expect(snapshot).not.toHaveProperty('observations');
    expect(snapshot).not.toHaveProperty('notes');
  });

  it('no inventa claves ausentes', () => {
    const snapshot = pickSnapshot({ name: 'Ana' }, USER_SNAPSHOT_KEYS);
    expect(snapshot).toEqual({ name: 'Ana' });
  });

  it('devuelve {} para entradas no objeto', () => {
    expect(pickSnapshot(undefined, USER_SNAPSHOT_KEYS)).toEqual({});
    expect(
      pickSnapshot(null as unknown as Record<string, any>, USER_SNAPSHOT_KEYS),
    ).toEqual({});
  });

  it('doctor: excluye slots_booked', () => {
    const snapshot = pickSnapshot(
      { name: 'Dr', fees: 10, slots_booked: { '20_7_2025': ['10:00 AM'] } },
      DOC_SNAPSHOT_KEYS,
    );
    expect(snapshot).toEqual({ name: 'Dr', fees: 10 });
  });
});
