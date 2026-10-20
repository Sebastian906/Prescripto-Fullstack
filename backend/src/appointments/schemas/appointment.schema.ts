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

  @Prop({ default: false })
  payment!: boolean;

  @Prop({ default: false })
  isCompleted!: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.pre('validate', function (this: AppointmentDocument) {
  this.userData = stripClinicalFields(this.userData);
  this.docData = stripClinicalFields(this.docData);
});

AppointmentSchema.index({ userId: 1, date: -1 });
AppointmentSchema.index({ docId: 1, slotDate: 1 });
AppointmentSchema.index({ slotDate: 1, slotTime: 1 });
