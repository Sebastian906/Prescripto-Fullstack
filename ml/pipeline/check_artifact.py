"""assert-based: el artefacto reproduce la probabilidad de sklearn para la misma fila."""
import json, sys, numpy as np
from pathlib import Path
from scipy.special import expit  # o math.exp

def predict(artifact, row: dict) -> float:
    vec = []
    for name in artifact["featureOrder"]:
        if name.startswith("timeBand="):
            vec.append(1.0 if name == f"timeBand={row['timeBand']}" else 0.0)
        elif name.startswith("weekday="):
            vec.append(1.0 if name == f"weekday={row['weekday']}" else 0.0)
        else:
            vec.append(float(row[name]))
    x = (np.array(vec) - np.array(artifact["scaler"]["mean"])) / np.array(artifact["scaler"]["scale"])
    return float(expit(x @ np.array(artifact["coef"]) + artifact["intercept"]))

if __name__ == "__main__":
    art = json.loads(Path(sys.argv[1]).read_text())
    golden = json.loads(Path(sys.argv[2]).read_text())  # {"row": {...}, "expected": 0.1234}
    got = predict(art, golden["row"])
    assert abs(got - golden["expected"]) < 1e-6, f"drift python/TS: {got} != {golden['expected']}"
    print("OK", got)
