"""Baseline gated del piloto: entrena, mide y exporta. Nunca despliega.

Lee `<dataset>.jsonl` + su `dataset_manifest.json` (ambos los emite el backend TS,
para que el filtro de consentimiento viva en la frontera con Mongo).
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry"
BANDS = ["morning", "afternoon", "evening", "night"]
NUMERIC = ["leadTimeDays", "priorCount", "priorCancelRate", "priorNoShowRate"]
FEATURE_ORDER = (
    [f"timeBand={band}" for band in BANDS]
    + [f"weekday={day}" for day in range(7)]
    + NUMERIC
)
MIN_ROWS = 200
NEURAL_ESCALATION_BELOW = 0.68


def design_matrix(frame: pd.DataFrame) -> np.ndarray:
    matrix = np.zeros((len(frame), len(FEATURE_ORDER)), dtype=float)
    bands = frame["timeBand"].to_numpy()
    weekdays = frame["weekday"].to_numpy()
    for index, band in enumerate(BANDS):
        matrix[:, index] = (bands == band).astype(float)
    offset = len(BANDS)
    for day in range(7):
        matrix[:, offset + day] = (weekdays == day).astype(float)
    offset += 7
    for index, column in enumerate(NUMERIC):
        matrix[:, offset + index] = frame[column].to_numpy(dtype=float)
    return matrix


def group_masks(frame: pd.DataFrame, seed: int) -> dict[str, pd.Series]:
    """Split por paciente: el mismo patientKey nunca cae en dos lados."""
    patients = frame["patientKey"].drop_duplicates().to_numpy()
    shuffled = np.random.default_rng(seed).permutation(patients)
    train_end = int(len(shuffled) * 0.7)
    validation_end = int(len(shuffled) * 0.85)
    train_keys = set(shuffled[:train_end])
    validation_keys = set(shuffled[train_end:validation_end])
    return {
        "train": frame["patientKey"].isin(train_keys),
        "validation": frame["patientKey"].isin(validation_keys),
        "holdout": ~frame["patientKey"].isin(train_keys | validation_keys),
    }


def scores(y_true, proba: np.ndarray, threshold: float) -> dict:
    predicted = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, predicted, labels=[0, 1]).ravel()
    return {
        "threshold": round(float(threshold), 4),
        "auc": round(float(roc_auc_score(y_true, proba)), 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "precision": round(float(precision_score(y_true, predicted, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, predicted, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, predicted, zero_division=0)), 4),
    }


def youden_threshold(y_true, proba: np.ndarray) -> float:
    fpr, tpr, thresholds = roc_curve(y_true, proba)
    index = int(np.argmax(tpr - fpr))
    threshold = float(thresholds[index])
    return threshold if np.isfinite(threshold) else 0.5


def roc_points(y_true, proba: np.ndarray, limit: int = 50) -> list[dict]:
    fpr, tpr, thresholds = roc_curve(y_true, proba)
    step = max(1, len(thresholds) // limit)
    return [
        {"threshold": None if not np.isfinite(t) else round(float(t), 4),
         "tpr": round(float(tp), 4), "fpr": round(float(fp), 4)}
        for fp, tp, t in list(zip(fpr, tpr, thresholds))[::step]
    ]


def cost_estimate(records_per_day: int = 2500) -> dict:
    """Orden de magnitud, no factura. Objetivo del issue: < 1 EUR/mes."""
    eur_per_vcpu_hour = 0.04
    lr_hours = records_per_day * 0.05 / 3_600_000
    rf_hours = records_per_day * 0.4 / 3_600_000
    lr_month = lr_hours * eur_per_vcpu_hour * 30
    rf_month = rf_hours * eur_per_vcpu_hour * 30
    return {
        "recordsPerDay": records_per_day,
        "assumptions": {
            "msPerRecordLR": 0.05,
            "msPerRecordRF": 0.4,
            "eurPerVcpuHour": eur_per_vcpu_hour,
            "daysPerMonth": 30,
        },
        "lrEurPerMonth": round(lr_month, 4),
        "rfEurPerMonth": round(rf_month, 4),
        "fitsUnderOneEuro": (lr_month + rf_month) < 1,
    }


def call_export(model, meta: dict) -> None:
    """03_export.py empieza por dígito: no es importable, se carga por ruta."""
    path = ROOT / "pipeline" / "03_export.py"
    if not path.exists():
        print(f"AVISO: {path} no existe; artefacto no exportado", file=sys.stderr)
        return
    spec = importlib.util.spec_from_file_location("export_model", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    module.export(model, FEATURE_ORDER, BANDS, REGISTRY / f"model-{meta['modelVersion']}.json", meta)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=str(REGISTRY / "dataset-v0.1.0.jsonl"))
    parser.add_argument("--version", default="v0.1.0")
    parser.add_argument("--min-auc", type=float, default=0.70)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    dataset = Path(args.dataset).resolve()
    manifest = json.loads(dataset.with_name("dataset_manifest.json").read_text())
    digest = hashlib.sha256(dataset.read_bytes()).hexdigest()
    if manifest.get("sha256") and digest != manifest["sha256"]:
        print(f"sha256 no coincide: {digest} != {manifest['sha256']}", file=sys.stderr)
        return 2

    frame = pd.read_json(dataset, lines=True)
    if len(frame) < MIN_ROWS:
        print(f"dataset demasiado pequeño: {len(frame)} < {MIN_ROWS}", file=sys.stderr)
        return 2
    if manifest.get("source") != "mongo":
        print(f"AVISO: source={manifest.get('source')} -> deployable=false forzado", file=sys.stderr)

    labels = frame["label"].astype(int).to_numpy()
    groups = frame["patientKey"].to_numpy()
    matrix = design_matrix(frame)
    masks = group_masks(frame, args.seed)

    fit_mask = masks["train"] | masks["validation"]
    matrix_fit, labels_fit, groups_fit = matrix[fit_mask.to_numpy()], labels[fit_mask.to_numpy()], groups[fit_mask.to_numpy()]
    matrix_hold, labels_hold = matrix[masks["holdout"].to_numpy()], labels[masks["holdout"].to_numpy()]
    matrix_val, labels_val = matrix[masks["validation"].to_numpy()], labels[masks["validation"].to_numpy()]

    def lr() -> Pipeline:
        return Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, C=1.0, solver="lbfgs")),
        ])

    def rf() -> RandomForestClassifier:
        return RandomForestClassifier(
            n_estimators=200, max_depth=5, min_samples_leaf=10,
            random_state=args.seed, n_jobs=-1,
        )

    models = {"logistic": lr(), "forest": rf(), "dummy": DummyClassifier(strategy="prior")}
    for name, model in models.items():
        model.fit(matrix_fit, labels_fit)
        print(f"fit {name}: {len(matrix_fit)} filas")

    # Umbral elegido en validation, aplicado una sola vez a hold-out.
    validation_proba = models["logistic"].predict_proba(matrix_val)[:, 1]
    threshold = youden_threshold(labels_val, validation_proba)

    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=args.seed)
    cv_report = {name: [] for name in models}
    for fold, (train_index, test_index) in enumerate(cv.split(matrix_fit, labels_fit, groups_fit), 1):
        for name, factory in (("logistic", lr), ("forest", rf), ("dummy", lambda: DummyClassifier(strategy="prior"))):
            model = factory().fit(matrix_fit[train_index], labels_fit[train_index])
            proba = model.predict_proba(matrix_fit[test_index])[:, 1]
            cv_report[name].append(roc_auc_score(labels_fit[test_index], proba))
        print(f"cv fold {fold}/5")

    holdout = {
        name: scores(labels_hold, model.predict_proba(matrix_hold)[:, 1], threshold)
        for name, model in models.items()
    }
    holdout["logistic"]["roc"] = roc_points(labels_hold, models["logistic"].predict_proba(matrix_hold)[:, 1])

    best_auc = max(holdout["logistic"]["auc"], holdout["forest"]["auc"])
    deployable = best_auc >= args.min_auc and manifest.get("source") == "mongo"
    cv_logistic_mean = float(np.mean(cv_report["logistic"]))

    report = {
        "modelVersion": f"{args.version}+{manifest.get('version', 'unknown')}",
        "dataset": {
            "version": manifest.get("version"),
            "sha256": digest,
            "nRows": int(len(frame)),
            "labelRate": round(float(labels.mean()), 4),
            "source": manifest.get("source"),
            "consentCoverage": manifest.get("consentCoverage"),
        },
        "splits": {
            "seed": args.seed,
            "patientLevel": True,
            "train": int(masks["train"].sum()),
            "validation": int(masks["validation"].sum()),
            "holdout": int(masks["holdout"].sum()),
        },
        "crossValidation": {
            name: {
                "aucMean": round(float(np.mean(values)), 4),
                "aucStd": round(float(np.std(values)), 4),
                "folds": [round(float(value), 4) for value in values],
            }
            for name, values in cv_report.items()
        },
        "holdout": holdout,
        "cost": cost_estimate(),
        "deployable": bool(deployable),
        "decisionReason": (
            f"hold-out AUC {best_auc:.4f} >= {args.min_auc} sobre dataset 'mongo'"
            if deployable
            else f"hold-out AUC {best_auc:.4f} < {args.min_auc} o source != mongo"
        ),
        "neuralNetEscalationAllowed": cv_logistic_mean < NEURAL_ESCALATION_BELOW,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "signOff": {"approvedBy": None, "approvedAt": None, "signature": None},
    }

    REGISTRY.mkdir(parents=True, exist_ok=True)
    (REGISTRY / "metrics.json").write_text(json.dumps(report, indent=2) + "\n")

    golden_row = frame[masks["holdout"]].iloc[0]
    golden = {
        "row": {key: golden_row[key] for key in ["timeBand", "weekday", *NUMERIC]},
        "expected": round(float(models["logistic"].predict_proba(matrix_hold)[0, 1]), 10),
    }
    (REGISTRY / "golden.json").write_text(
        # weekday/leadTimeDays llegan como numpy.int64: no son serializables por defecto.
        json.dumps(golden, indent=2, default=lambda value: value.item()) + "\n"
    )

    call_export(models["logistic"], {
        "modelVersion": f"model-{args.version}",
        "trainedAt": report["generatedAt"],
        "datasetSha256": digest,
        "holdoutAuc": holdout["logistic"]["auc"],
        "threshold": round(threshold, 4),
    })

    print(json.dumps({key: report[key] for key in ("crossValidation", "holdout", "cost", "deployable", "decisionReason")}, indent=2))
    if not deployable:
        print("RESULTADO: deployable=false. El issue permanece deferred.")
    return 0 if deployable else 3


if __name__ == "__main__":
    raise SystemExit(main())
