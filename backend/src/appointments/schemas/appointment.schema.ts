import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

export const CLINICAL_FIELD_KEYS = [
  'diagnosis',
  'notes',
  'clinicalNotes',
  'prescription',
  'treatment',
  'symptoms',
  'observations',
] as const;

export const CLINICAL_APPOINTMENT_FILTERS = CLINICAL_FIELD_KEYS.flatMap(
  (key) => [
    { [`userData.${key}`]: { $exists: true } },
    { [`docData.${key}`]: { $exists: true } },
  ],
);

export const CLINICAL_UNSET_PATHS = Object.fromEntries(
  CLINICAL_FIELD_KEYS.flatMap((key) => [
    [`userData.${key}`, ''] as const,
    [`docData.${key}`, ''] as const,
  ]),
) as Record<string, string>;

export function stripClinicalFields(
  value: Record<string, any> | null | undefined,
): Record<string, any> {
  const clean: Record<string, any> = { ...(value ?? {}) };
  for (const key of CLINICAL_FIELD_KEYS) delete clean[key];
  return clean;
}

/** Claves que el cliente puede ver de un usuario en su cita. */
export const USER_SNAPSHOT_KEYS = [
  '_id',
  'name',
  'email',
  'image',
  'address',
  'gender',
  'dob',
  'phone',
] as const;

/** Claves que el cliente puede ver de un doctor en su cita. */
export const DOC_SNAPSHOT_KEYS = [
  '_id',
  'name',
  'email',
  'image',
  'speciality',
  'degree',
  'experience',
  'about',
  'available',
  'fees',
  'address',
] as const;

/** Whitelist pura: copia solo las claves pedidas. No recursiva. */
export function pickSnapshot(
  raw: Record<string, any> | undefined,
  keys: readonly string[],
): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  return keys.reduce<Record<string, any>>((snapshot, key) => {
    if (key in raw) snapshot[key] = raw[key];
    return snapshot;
  }, {});
}

@Schema({ minimize: false })
export class Appointment {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  docId!: string;

  @Prop({ required: true })
  slotDate!: string;

  @Prop({ required: true })
  slotTime!: string;

  @Prop({ required: true, type: Object })
  userData!: Record<string, any>;

  @Prop({ required: true, type: Object })
  docData!: Record<string, any>;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: Date.now })
  date!: number;

  @Prop({ default: false })
  cancelled!: boolean;

  @Prop({ default: '' })
  cancellationReason!: string;

  // Denormalized mirror of Payment.status === 'paid'. Source of truth lives
  // in the `payments` collection (appointmentId unique). Kept for reports,
  // admin/doctor dashboards and MyAppointments.jsx which still read it.
  @Prop({ default: false })
  payment!: boolean;

  @Prop({ default: false })
  isCompleted!: boolean;

  // Epoch ms del cancel. Null en docs legacy: el label `cancelled < 24h` no es
  // derivable sin él (ver src/ml-serving/features/feature-engineering.ts).
  @Prop({ type: Number, default: null })
  cancelledAt!: number | null;

  // Marca filas de scripts/seed-appointments.ts; el dataset las excluye por defecto.
  @Prop({ default: false })
  isSynthetic!: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.pre('validate', function (this: AppointmentDocument) {
  if (this.userData) {
    this.userData = pickSnapshot(this.userData, USER_SNAPSHOT_KEYS);
  }
  if (this.docData) {
    this.docData = pickSnapshot(this.docData, DOC_SNAPSHOT_KEYS);
  }
});

AppointmentSchema.index({ userId: 1, date: -1 });
AppointmentSchema.index({ docId: 1, slotDate: 1 });
AppointmentSchema.index({ slotDate: 1, slotTime: 1 });
