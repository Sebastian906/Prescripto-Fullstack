import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BookAppointmentDto } from '../appointments/dto/book-appointment.dto';
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
