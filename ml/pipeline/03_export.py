import json, sklearn
from pathlib import Path
from sklearn.linear_model import LogisticRegression

def export(model: LogisticRegression, feature_order, bands, out: Path, meta: dict) -> None:
    artifact = {
        "modelVersion": meta["modelVersion"],
        "trainedAt": meta["trainedAt"],
        "sklearnVersion": sklearn.__version__,
        "datasetSha256": meta["datasetSha256"],
        "holdoutAuc": meta["holdoutAuc"],
        "threshold": meta["threshold"],
        "featureOrder": feature_order,
        "timeBandLevels": bands,
        "scaler": {"mean": model.named_steps["scaler"].mean_.tolist(),
                   "scale": model.named_steps["scaler"].scale_.tolist()},
        "coef": model.named_steps["clf"].coef_[0].tolist(),
        "intercept": float(model.named_steps["clf"].intercept_[0]),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(artifact, indent=2) + "\n")
