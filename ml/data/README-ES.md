# ml/data — datos locales, NO versionados

Todo este directorio está ignorado salvo este README.

## KaggleV2-May-2016.csv — "Medical Appointment No-Shows"
- Fuente: Kaggle, `joniarroba/noshowappointments`
- Licencia: CC BY-SA 4.0 (verificar en la página del dataset antes de redistribuir)
- 110.527 filas · 14 columnas
- sha256: 9132d3e7d0246617df9041d3764f20ad6f08e7b0d9f0997fa254fc5e52eda27d

**No cuenta para el trigger F-04.** El trigger cuenta `appointments` reales en
Mongo (`isSynthetic: {$ne:true}`), hoy **37**. Estas 110.527 filas son datos
externos de otro país y otro sistema.

Mapeo a las features del piloto:
  PatientId     → patientKey = sha256(PatientId)[0:12]
  ScheduledDay  → date (creación de la reserva) → leadTimeDays
  AppointmentDay→ scheduledDay
  No-show       → label 1 (Yes). Ojo: invertido respecto a `isCompleted`.
  ScheduledDay  → timeBand, weekday
  priorCount / priorCancelRate / priorNoShowRate → derivadas por PatientId en
  orden cronológico.

Prohibido como feature: `Gender`, `Neighbourhood`, `Age` (ver ml/README-ES.md).
Este dataset los trae; hay que descartarlos explícitamente.

## synthea/
- Fuente: Synthea (MITRE), Apache 2.0 · datos 100% sintéticos
- Uso: volumen y forma a 100k+. No tiene label real de no-show, así que
  **ninguna AUC calculada aquí es interpretable**.

## Verificar el archivo
    # Linux/macOS
    sha256sum data/KaggleV2-May-2016.csv
    # Windows PowerShell
    Get-FileHash -Algorithm SHA256 data\KaggleV2-May-2016.csv