# ml/ — Python: experimentación y propiedad del modelo

Este paquete es **Python only**. No se añaden aquí `.ts`, `package.json` ni nada
que requiera Node: el TypeScript del piloto vive en `backend/src/ml-serving/`.

## Frontera con el backend

| Dirección | Contrato |
| --- | --- |
| backend → ml | `registry/dataset-v0.1.0.jsonl` + `registry/dataset_manifest.json` (IDs pseudonimizados, bandas, label; cero PHI) |
| ml → backend | `registry/model-v0.1.0.json` (coef/intercept/scaler/featureOrder/threshold) + `registry/metrics.json` + `registry/golden.json` |

`golden.json` es el guard anti-drift: `pipeline/check_artifact.py` (Python) y
`backend/src/ml-serving/score.spec.ts` (TS) deben dar la misma probabilidad.

## Setup

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate        # Windows; en Linux: source .venv/bin/activate
pip install -r requirements.txt
pip freeze > requirements.lock.txt   # repetibilidad: usar el lock, no el rango
.venv/, data/ y models/ están ignorados por .gitignore. registry/ no
se ignora: ahí van dataset versionado, métricas, model card y artefacto.
Ejecución
# 1. Backend produce el dataset (requiere gates G1/G2/G3 verdes)
cd ../backend && pnpm ml:dataset

# 2. Entrenar + exportar artefacto
cd ../ml
python pipeline/02_train.py --dataset registry/dataset-v0.1.0.jsonl --version v0.1.0

# 3. Verificar paridad Python/TS del artefacto
python pipeline/check_artifact.py registry/model-v0.1.0.json registry/golden.json
Reglas
- deployable: true solo si hold-out AUC >= 0.70 y source == "mongo".
- La firma humana va en metrics.json > signOff; sin ella el backend no puntúa.
- Prohibido usar Gender, Neighbourhood, Age ni cualquier texto libre como
feature (el notebook antiguo los usaba: corregido en 02_train.py).
- Redes neuronales solo si neuralNetEscalationAllowed: true (LR CV AUC < 0.68).