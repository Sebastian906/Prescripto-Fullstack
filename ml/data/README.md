# ml/data — local data, NOT versioned

Everything in this directory is gitignored except the READMEs.

Spanish version: [`README-ES.md`](./README-ES.md).

## KaggleV2-May-2016.csv — "Medical Appointment No-Shows"
- Source: Kaggle, `joniarroba/noshowappointments`
- License: CC BY-SA 4.0 (verify on the dataset page before redistributing)
- 110,527 rows · 14 columns
- sha256: `9132d3e7d0246617df9041d3764f20ad6f08e7b0d9f0997fa254fc5e52eda27d`

**Does not count toward the F-04 trigger.** The trigger counts real
`appointments` in Mongo (`isSynthetic: {$ne: true}`), currently **37**. These
110,527 rows come from another country and another system.

Mapping to the pilot features:
  PatientId      → patientKey = sha256(PatientId)[0:12]
  ScheduledDay   → date (booking creation) → leadTimeDays
  AppointmentDay → scheduledDay
  No-show        → label 1 (Yes). Note: inverted relative to `isCompleted`.
  ScheduledDay   → timeBand, weekday
  priorCount / priorCancelRate / priorNoShowRate → derived per PatientId in
  chronological order.

Forbidden as features: `Gender`, `Neighbourhood`, `Age` (see `ml/README-ES.md`).
This dataset ships them; drop them explicitly.

## synthea/
- Source: Synthea (MITRE), Apache 2.0 · 100% synthetic data
- Use: volume and shape at 100k+. It has no real no-show label, so **any AUC
  computed here is meaningless**.

## Verify the file
    # Linux/macOS
    sha256sum data/KaggleV2-May-2016.csv
    # Windows PowerShell
    Get-FileHash -Algorithm SHA256 data\KaggleV2-May-2016.csv