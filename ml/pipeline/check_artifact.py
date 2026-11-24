"""assert-based: el artefacto reproduce la probabilidad de sklearn para la misma fila."""
import json, math, sys
from pathlib import Path


def expit(z: float) -> float:
    """sigmoid con la stdlib; estable para |z| grande, donde math.exp desborda."""
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    positive = math.exp(z)
    return positive / (1.0 + positive)


def predict(artifact, row: dict) -> float:
    z = float(artifact["intercept"])
    for index, name in enumerate(artifact["featureOrder"]):
        if name.startswith("timeBand="):
            raw = 1.0 if name == f"timeBand={row['timeBand']}" else 0.0
        elif name.startswith("weekday="):
            raw = 1.0 if name == f"weekday={row['weekday']}" else 0.0
        else:
            raw = float(row[name])
        normalized = (
            raw - artifact["scaler"]["mean"][index]
        ) / artifact["scaler"]["scale"][index]
        z += artifact["coef"][index] * normalized
    return expit(z)


if __name__ == "__main__":
    art = json.loads(Path(sys.argv[1]).read_text())
    golden = json.loads(Path(sys.argv[2]).read_text())  # {"row": {...}, "expected": 0.1234}
    got = predict(art, golden["row"])
    assert abs(got - golden["expected"]) < 1e-6, f"drift python/TS: {got} != {golden['expected']}"
    print("OK", got)
