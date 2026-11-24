# ml/ — Python: experimentación y propiedad del modelo

Este paquete es **Python only**. No se añaden aquí `.ts`, `package.json` ni nada
que requiera Node: el TypeScript del piloto vive en `backend/src/ml-serving/`.

## Frontera con el backend

| Dirección | Contrato |
| --- | --- |
| backend → ml | `registry/dataset-v0.1.0.jsonl` + `registry/dataset-v0.1.0.manifest.json` (IDs pseudonimizados, bandas, label; cero PHI) |
| ml → backend | `registry/model-v0.1.0.json` (coef/intercept/scaler/featureOrder/threshold) + `registry/metrics.json` + `registry/golden.json` |

El manifest acompaña al dataset con su mismo nombre (`<dataset>.manifest.json`):
así dos builds con `--out` distintos no se pisan.

`golden.json` es el guard anti-drift: `pipeline/check_artifact.py` (Python) y
`backend/src/ml-serving/score.spec.ts` (TS) deben dar la misma probabilidad. El
artefacto solo se escribe cuando el run es desplegable; el golden se escribe
siempre, también en los smoke tests.

## Setup

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate        # Windows; en Linux: source .venv/bin/activate
pip install -r requirements-dev.txt   # runtime + jupyterlab
```

Regenerar el lock desde un entorno limpio, sin Jupyter y conservando los
marcadores de plataforma:

```bash
python -m venv .venv-lock
.venv-lock/Scripts/activate
pip install pip-tools
pip-compile --output-file requirements.lock.txt requirements.txt
```

`.venv/`, `data/` y `models/` están ignorados por `.gitignore`. De `registry/`
solo se ignoran los datasets (`*.jsonl` y `*.manifest.json`); el artefacto, las
métricas y el `golden.json` sí se versionan.

## Ejecución

```bash
# 1. Backend produce el dataset (requiere gates G1/G2/G3 verdes)
cd ../backend && pnpm ml:dataset

# 2. Entrenar + exportar artefacto
cd ../ml
python pipeline/02_train.py --dataset registry/dataset-v0.1.0.jsonl --version v0.1.0

# 3. Verificar paridad Python/TS del artefacto
python pipeline/check_artifact.py registry/model-v0.1.0.json registry/golden.json
```

## Reglas

- `deployable: true` solo si el hold-out AUC de la logística >= 0.70, `source == "mongo"` y cobertura de consentimiento >= 95%.
- La firma humana va en `metrics.json > signOff`; sin ella el backend no puntúa.
- Prohibido usar Gender, Neighbourhood, Age ni cualquier texto libre como feature (el notebook antiguo los usaba: corregido en `02_train.py`).
- Redes neuronales solo si `neuralNetEscalationAllowed: true` (LR CV AUC < 0.68).
