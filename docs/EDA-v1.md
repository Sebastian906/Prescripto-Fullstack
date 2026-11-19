# EDA v1 — usuarios y snapshots

## Objetivo
Medir calidad de `phone`, `gender` y `dob` antes/después de la normalización v1,
sin extraer PII y con resultados reproducibles.

## Fuente y ejecución
- Fuente por defecto: colección `users`. Opcional: `--source=appointments` (lee `userData`).
- Comando: `pnpm eda:v1 -- --source=users` (o `--source=appointments`).
- Para escribir a archivo: `--out=../docs/EDA-v1-users.md` (con `=`, no con espacio).
- Requiere `MONGODB_URI`. Recomendado: réplica de lectura o usuario read-only.
- `--limit=N` para muestras; `--json` para consumo programático.

## Métricas
- `completeness = (total - blank) / total`
- `consistency = (keep + write - blank) / (total - blank)`  (normalizable por la regla v1; `blank` es subconjunto de `keep/write`, por eso se resta)
- `accuracyProxy`:
  - `phone`: tasa E.164 (misma que consistency; no hay ground truth).
  - `gender`: tasa de enum cerrado (misma que consistency).
  - `dob`: tasa de edad plausible 0–120 sobre fechas ISO.
- `dirtyDefaults`: conteo de `0000000000`, `Not Selected`.

## Privacidad
- Solo agregados. Nunca se exportan `_id`, nombres, teléfonos ni fechas individuales.
- Supresión de celdas con conteo `< 5` (k-anonimato mínimo).
- Las distribuciones son unidimensionales (prefijo, género, década).

## Resultados (2026-11-19)

### users (5 filas)

| campo | total | blank | completeness | consistency | dirty default |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone | 5 | 3 | 0.4 | 1.0 | 0 |
| gender | 5 | 4 | 0.2 | 1.0 | 0 |
| dob | 5 | 4 | 0.2 | 1.0 | 0 |

- `dob.accuracyProxy`: 1.0
- Distribuciones (k=5): phone `{ "+57": "<5" }`; gender `{ "Unspecified": "<5", "Male": "<5" }`; dob `{ "2000s": "<5" }`.

### appointments (37 filas)

| campo | total | blank | completeness | consistency | dirty default |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone | 37 | 1 | 0.973 | 1.0 | 0 |
| gender | 37 | 7 | 0.8108 | 0.9667 | 0 |
| dob | 37 | 8 | 0.7838 | 1.0 | 0 |

- `dob.accuracyProxy`: 1.0
- Distribuciones (k=5): phone `{ "+57": 36 }`; gender `{ "Male": 29, "Unspecified": 7 }`; dob `{ "2000s": 29 }`.

### Migración v1

| colección | campo | keep antes | write antes | quarantine | keep después | write después |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| users | phone | 1 | 4 | 0 | 5 | 0 |
| users | gender | 1 | 4 | 0 | 5 | 0 |
| users | dob | 1 | 4 | 0 | 5 | 0 |
| appointments | phone | 8 | 29 | 0 | 37 | 0 |
| appointments | gender | 29 | 7 | 1 | 36 | 0 |
| appointments | dob | 30 | 7 | 0 | 37 | 0 |

- Segunda pasada: `write=0` en los seis campos.
- `keep + write + quarantine = total`; 0 pérdidas.
- 1 registro en cuarentena (`gender` fuera del enum): revisión manual. Su `_id` queda solo en el JSON local de auditoría, no en este documento.

## Decisiones de imputación (para el modelo, no para la DB)
- `phone`: se descarta como feature (identificador, no señal). No se imputa.
- `gender`: `Unspecified` se conserva como categoría; la ausencia puede ser informativa.
  Si el modelo exige una sola columna, usar moda + indicador `gender_missing` y validar con CV.
- `dob`: se deriva `age`; se imputa mediana + indicador `age_missing`. No imputar la fecha.
- No hay regresión ni hot-deck en v1: no hay ground truth y el volumen no lo justifica.

## Limitaciones
- `accuracyProxy` no mide corrección semántica, solo formato/plausibilidad.
- Los snapshots históricos reflejan el estado al momento de la cita, no el actual.
- La muestra puede no ser representativa si `--limit` es pequeño.

## Reproducción
1. `cd backend`
2. `pnpm eda:v1 -- --source=users`
3. `pnpm eda:v1 -- --source=appointments`
4. Pegar las tablas en este documento. Para archivo: `--out=../docs/EDA-v1-users.md` (con `=`).
