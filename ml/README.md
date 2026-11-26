# ml/ — Python: experimentation and model ownership

This package is **Python only**. No `.ts`, no `package.json`, nothing that needs
Node: the pilot's TypeScript lives in `backend/src/ml-serving/`.

Spanish version: [`README-ES.md`](./README-ES.md).

## Boundary with the backend

| Direction | Contract |
| --- | --- |
| backend → ml | `registry/dataset-v0.1.0.jsonl` + `registry/dataset-v0.1.0.manifest.json` (pseudonymized IDs, bands, label; zero PHI) |
| ml → backend | `registry/model-v0.1.0.json` (coef/intercept/scaler/featureOrder/threshold) + `registry/metrics.json` + `registry/golden.json` |

The manifest sits next to the dataset under the same stem
(`<dataset>.manifest.json`), so two builds with different `--out` do not
overwrite each other.

`golden.json` is the anti-drift guard: `pipeline/check_artifact.py` (Python) and
`backend/src/ml-serving/score.spec.ts` (TS) must return the same probability.
The artifact is written only when a run is deployable; the golden file is always
written, smoke tests included.

## Setup

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate        # Windows; on Linux: source .venv/bin/activate
pip install -r requirements-dev.txt   # runtime + jupyterlab
```

Regenerate the lock from a clean environment, without Jupyter, keeping the
platform markers:

```bash
python -m venv .venv-lock
.venv-lock/Scripts/activate
pip install pip-tools
pip-compile --output-file requirements.lock.txt requirements.txt
```

`.venv/`, `data/` and `models/` are gitignored — except the READMEs inside
`data/` (`data/*`, `!data/README.md`, `!data/README-ES.md`). Under `registry/`,
only datasets are ignored (`*.jsonl`, `*.manifest.json`); the artifact, the
metrics and golden.json are versioned.

## Run

```bash
## 1. Backend produces the dataset (requires gates G1/G2/G3 green)
cd ../backend && pnpm ml:dataset

## 2. Train + export the artifact
cd ../ml
python pipeline/02_train.py --dataset registry/dataset-v0.1.0.jsonl --version v0.1.0

## 3. Verify Python/TS parity of the artifact
python pipeline/check_artifact.py registry/model-v0.1.0.json registry/golden.json
```

## Local data (never versioned)
data/ holds local datasets only. See `data/README.md` (./data/README.md) for
provenance, hashes, license and the column mapping. Those rows are external or
synthetic: they never count toward the F-04 trigger and can never produce
a deployable artifact.

## Rules
- deployable: true only if the logistic hold-out AUC >= 0.70, source == "mongo" and consent coverage >= 95%.
- The human signature lives in metrics.json > signOff; without it the backend does not score.
- Using Gender, Neighbourhood, Age or any free text as a feature is forbidden (the old notebook did; fixed in 02_train.py).
- Neural nets only if neuralNetEscalationAllowed: true (LR CV AUC < 0.68).
- F-04 (feature store) stays in icebox: see `docs/ARCHITECTURE.md`.
