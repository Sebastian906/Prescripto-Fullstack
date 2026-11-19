# EDA v1 — usuarios y snapshots

## Objetivo
Medir calidad de `phone`, `gender` y `dob` antes/después de la normalización v1,
sin extraer PII y con resultados reproducibles.

## Fuente y ejecución
- Fuente por defecto: colección `users`. Opcional: `--source=appointments` (lee `userData`).
- Comando: `pnpm eda:v1 --source=users` (o `--source=appointments`).
- Para escribir a archivo: `--out=../docs/EDA-v1-users.md`.
- Requiere `MONGODB_URI`. Recomendado: réplica de lectura o usuario read-only.
- `--limit=N` para muestras; `--json` para consumo programático.

## Métricas
- `completeness = (total - blank) / total`
- `consistency = (keep + write - blank) / (total - blank)`
  - Los valores `blank` están incluidos en `keep`/`write` y se cuentan aparte.
  - En `gender`, `Unspecified` es una categoría válida pero sigue contando como `blank`; queda excluida de consistency por diseño. Un género vacío se escribe como `Unspecified`.
- `dob.accuracyProxy`: tasa de edad plausible 0–120 sobre fechas ISO. `phone` y `gender` no publican `accuracyProxy`.
- `dirtyDefaults`: conteo de `0000000000`, `Not Selected`.

## Privacidad
- Solo agregados. Nunca se exportan `_id`, nombres, teléfonos ni fechas individuales.
- Si alguna celda de una distribución tiene conteo `< 5`, se omite la distribución completa (`null`); no se publican celdas suprimidas.
- Las distribuciones son unidimensionales (prefijo, género, década).

## Resultados (2026-11-19)

### users (5 filas)

| campo | total | blank | completeness | consistency | dirty default |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone | 5 | 3 | 0.4 | 1.0 | 0 |
| gender | 5 | 4 | 0.2 | 1.0 | 0 |
| dob | 5 | 4 | 0.2 | 1.0 | 0 |

- `dob.accuracyProxy`: 1.0
- Distribuciones (k=5): phone `null`; gender `null`; dob `null` (alguna celda <5).

### appointments (37 filas)

| campo | total | blank | completeness | consistency | dirty default |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone | 37 | 1 | 0.973 | 1.0 | 0 |
| gender | 37 | 8 | 0.7838 | 1.0 | 0 |
| dob | 37 | 8 | 0.7838 | 1.0 | 0 |

- `dob.accuracyProxy`: 1.0
- Distribuciones (k=5): phone `{ "+57": 36 }`; gender `{ "Male": 29, "Unspecified": 8 }`; dob `{ "2000s": 29 }`.

### Migración v1

| colección | campo | keep antes | write antes | quarantine | keep después | write después |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| users | phone | 1 | 4 | 0 | 5 | 0 |
| users | gender | 1 | 4 | 0 | 5 | 0 |
| users | dob | 1 | 4 | 0 | 5 | 0 |
| appointments | phone | 8 | 29 | 0 | 37 | 0 |
| appointments | gender | 29 | 8 | 0 | 37 | 0 |
| appointments | dob | 30 | 7 | 0 | 37 | 0 |

- La fila de `appointments.gender` refleja la política corregida: el género vacío se escribe como `Unspecified`. Dry-run actual: `write=1`; tras aplicar: `write=0`.
- `keep + write + quarantine = total`; 0 pérdidas.
- 0 registros en cuarentena con la política corregida.

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
2. `pnpm eda:v1 --source=users`
3. `pnpm eda:v1 --source=appointments`
4. Pegar las tablas en este documento. Para archivo: `--out=../docs/EDA-v1-users.md`.
