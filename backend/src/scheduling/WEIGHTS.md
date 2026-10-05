# Pesos del sugeridor de slots — `scheduling.service.ts`

> Fuente: **PILOTO n=200, PENDIENTE_F-02**. Fecha: 2026-10-05.
> Sin F-02 EDA en el repo: valores congelados por intuición previa.
> Golden: `src/tests/scheduling.golden.spec.ts` (G01–G30).
> Contrato frontend: `frontend/src/hooks/useSlotSuggestions.js` (solo POST `preferredDates`, sin greedy cliente).

## 1. Tabla de constantes

| Nombre | Valor | Unidad | Origen | n | Fecha |
|---|---|---|---|---|---|
| `WEIGHT_LOAD` | `-2` | puntos / cita ocupada del día | intuición heredada, PILOTO | 200 | 2026-10-05 |
| `WEIGHT_GAP` | `1` | puntos / bloque 30min libre, cap 4 (=120min) | intuición heredada, PILOTO | 200 | 2026-10-05 |
| `WEIGHT_MORNING` | `1` | puntos si `parseHour < 13` | heurística, sesga mañanas (conocido) | 200 | 2026-10-05 |
| `URGENCY_BONUS.urgent` | `10` | puntos base | intuición heredada, PILOTO | 200 | 2026-10-05 |
| `URGENCY_BONUS.normal` | `5` | puntos base | intuición heredada, PILOTO | 200 | 2026-10-05 |
| `URGENCY_BONUS.flexible` | `0` | puntos base | intuición heredada, PILOTO | 200 | 2026-10-05 |

Fórmula (`computeScore`): `URGENCY_BONUS[level] + WEIGHT_LOAD*dayLoad + WEIGHT_GAP*min(gap/30,4) + (hora<13 ? WEIGHT_MORNING : 0)`.

## 2. Justificación por peso

- `WEIGHT_LOAD=-2`: cada cita del día resta 2; con día lleno (22) resta 44 y hunde cualquier slot. Sin datos de no-show: pendiente F-02.
- `WEIGHT_GAP=1` cap 4: premia huecos hasta 120min; más allá no suma (techo `min(gap/30,4)` + fallback `computeGap→120`). Sin datos: pendiente F-02.
- `WEIGHT_MORNING=1`: bonus fijo pre-13:00. **Sesgo conocido**: en día vacío el top-3 siempre son slots de mañana. Se conserva por compatibilidad hasta F-02; no ampliar ni condicionar por franja sin dataset.
- `URGENCY 10/5/0`: desplazamiento base por prioridad, no cambia el orden relativo dentro del mismo día/nivel.

## 3. Umbral `isIdeal`

`isIdeal = suggestions.length>0 && suggestions[0].score >= URGENCY_BONUS[level]`.
Equivale a `(WEIGHT_LOAD*load + WEIGHT_GAP*min(gap/30,4) + morning) >= 0`: **invariante al `priorityLevel`**. Se elige así para que "ideal" mida disponibilidad real (carga+hueco+franja), no la urgencia declarada. Anclado por G02/G07/G12; cambiarlo rompe el golden a propósito.

## 4. Calibración pendiente (F-02)

`TODO(F-02)`: recalibrar contra no-show rate por banda horaria (mañana/tarde/noche) con n, fecha y dataset citados aquí. Hasta entonces no tocar valores ni añadir heurísticas (knight/beam → C-06).

## 5. Complejidad

`O(d·s·log s) ≈ O(d)` con `s≈22` (`generateDaySlots` 10:00–21:00 cada 30min). Sin cambios.