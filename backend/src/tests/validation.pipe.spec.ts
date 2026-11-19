import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BookAppointmentDto } from '../appointments/dto/book-appointment.dto';
import { UpdateProfileUserDto } from '../users/dto/update-profile.dto';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { SuggestSlotDto } from '../scheduling/dto/suggest-slot.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const badId = {
  docId: 'not-an-objectid',
  slotDate: '20_7_2025',
  slotTime: '10:00 am',
};

it('book: docId no-ObjectId → errores', async () => {
  expect(
    await validate(plainToInstance(BookAppointmentDto, badId)),
  ).not.toHaveLength(0);
});
it('book: propiedad desconocida → pipe lanza 400', async () => {
  await expect(
    pipe.transform(
      { ...badId, docId: '64f1a2b3c4d5e6f7a8b9c0d1', hack: 1 },
      { type: 'body', metatype: BookAppointmentDto },
    ),
  ).rejects.toThrow();
});

// --- Register ---
const badEmail = {
  name: 'Test',
  email: 'not-an-email',
  password: 'Password123',
};
const shortPass = { name: 'Test', email: 'a@b.com', password: '123' };

it('register: email inválido → errores', async () => {
  expect(
    await validate(plainToInstance(RegisterUserDto, badEmail)),
  ).not.toHaveLength(0);
});
it('register: password corto → errores', async () => {
  expect(
    await validate(plainToInstance(RegisterUserDto, shortPass)),
  ).not.toHaveLength(0);
});
it('register: payload válido → sin errores', async () => {
  expect(
    await validate(
      plainToInstance(RegisterUserDto, {
        name: 'Test',
        email: 'a@b.com',
        password: 'Password123',
      }),
    ),
  ).toHaveLength(0);
});

// --- SuggestSlot ---
const badPriority = {
  docId: '64f1a2b3c4d5e6f7a8b9c0d1',
  preferredDates: ['15/7/2025'],
  priorityLevel: 'invalid',
};
const emptyDates = {
  docId: '64f1a2b3c4d5e6f7a8b9c0d1',
  preferredDates: [],
  priorityLevel: 'normal',
};
const negGap = {
  docId: '64f1a2b3c4d5e6f7a8b9c0d1',
  preferredDates: ['15/7/2025'],
  priorityLevel: 'normal',
  minGapMinutes: -5,
};

it('suggest: priorityLevel inválido → errores', async () => {
  expect(
    await validate(plainToInstance(SuggestSlotDto, badPriority)),
  ).not.toHaveLength(0);
});
it('suggest: preferredDates vacío → errores', async () => {
  expect(
    await validate(plainToInstance(SuggestSlotDto, emptyDates)),
  ).not.toHaveLength(0);
});
it('suggest: minGapMinutes negativo → errores', async () => {
  expect(
    await validate(plainToInstance(SuggestSlotDto, negGap)),
  ).not.toHaveLength(0);
});
it('suggest: payload válido → sin errores', async () => {
  expect(
    await validate(
      plainToInstance(SuggestSlotDto, {
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        preferredDates: ['15/7/2025'],
        priorityLevel: 'normal',
      }),
    ),
  ).toHaveLength(0);
});

// --- BookAppointment slotDate formato ---
const badDate = {
  docId: '64f1a2b3c4d5e6f7a8b9c0d1',
  slotDate: '2025-07-20',
  slotTime: '10:00 AM',
};

it('book: slotDate formato inválido → errores', async () => {
  expect(
    await validate(plainToInstance(BookAppointmentDto, badDate)),
  ).not.toHaveLength(0);
});

// --- forbidNonWhitelisted via pipe (ya tienes 1 de book, agrega 1 de suggest) ---
it('suggest: propiedad desconocida → pipe lanza 400', async () => {
  await expect(
    pipe.transform(
      {
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        preferredDates: ['15/7/2025'],
        priorityLevel: 'normal',
        extra: true,
      },
      { type: 'body', metatype: SuggestSlotDto },
    ),
  ).rejects.toThrow();
});

// --- BookAppointment payload válido ---
it('book: payload válido → sin errores', async () => {
  expect(
    await validate(
      plainToInstance(BookAppointmentDto, {
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        slotDate: '20_7_2025',
        slotTime: '10:00 AM',
      }),
    ),
  ).toHaveLength(0);
});

it('book: userData con clave clínica → 400', async () => {
  await expect(
    pipe.transform(
      {
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        slotDate: '20_7_2025',
        slotTime: '10:00 AM',
        userData: { diagnosis: 'flu' },
      },
      { type: 'body', metatype: BookAppointmentDto },
    ),
  ).rejects.toThrow();
});

it('book: diagnosis en la raíz → 400', async () => {
  await expect(
    pipe.transform(
      {
        docId: '64f1a2b3c4d5e6f7a8b9c0d1',
        slotDate: '20_7_2025',
        slotTime: '10:00 AM',
        diagnosis: 'flu',
      },
      { type: 'body', metatype: BookAppointmentDto },
    ),
  ).rejects.toThrow();
});

it('profile: normaliza phone/gender/dob antes de validar', async () => {
  const dto = plainToInstance(UpdateProfileUserDto, {
    name: 'Test',
    phone: '3001234567',
    address: '{"line1":"a","line2":""}',
    dob: '01/01/1990',
    gender: 'Not Selected',
  });

  expect(await validate(dto)).toHaveLength(0);
  expect(dto.phone).toBe('+573001234567');
  expect(dto.dob).toBe('1990-01-01');
  expect(dto.gender).toBe('Unspecified');
});

it('profile: teléfono no normalizable → errores', async () => {
  const dto = plainToInstance(UpdateProfileUserDto, {
    name: 'Test',
    phone: '0000000000',
    address: '{"line1":"a","line2":""}',
    dob: '1990-01-01',
    gender: 'Male',
  });

  expect(await validate(dto)).not.toHaveLength(0);
});
