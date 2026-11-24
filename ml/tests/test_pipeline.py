"""Smoke test del pipeline: fixture sintético -> 02_train.py -> check_artifact.py.

Trabaja sobre una copia temporal de `pipeline/` para no tocar `registry/` real.
"""

import hashlib
import json
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ML = Path(__file__).resolve().parents[1]
BANDS = ["morning", "afternoon", "evening", "night"]
PATIENTS = 64
PER_PATIENT = 5


def write_fixture(registry: Path, source: str, consent: float) -> Path:
    rng = random.Random(7)
    rows = []
    for index in range(PATIENTS * PER_PATIENT):
        lead = rng.randrange(0, 15)
        label = int(lead >= 5)
        if rng.random() < 0.1:  # ruido para que no sea separable trivialmente
            label = 1 - label
        rows.append(
            {
                "timeBand": BANDS[index % len(BANDS)],
                "weekday": index % 7,
                "leadTimeDays": lead,
                "priorCount": index % 6,
                "priorCancelRate": round((index % 5) / 10, 2),
                "priorNoShowRate": round((index % 3) / 10, 2),
                "label": label,
                "patientKey": f"p{index // PER_PATIENT:03d}",
            }
        )
    dataset = registry / "dataset-ci.jsonl"
    dataset.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    (registry / f"{dataset.stem}.manifest.json").write_text(
        json.dumps(
            {
                "source": source,
                "sha256": hashlib.sha256(dataset.read_bytes()).hexdigest(),
                "nRows": len(rows),
                "consentCoverage": consent,
            }
        ),
        encoding="utf-8",
    )
    return dataset


class PipelineTest(unittest.TestCase):
    def run_pipeline(
        self, source: str, consent: float
    ) -> tuple[Path, Path, subprocess.CompletedProcess]:
        root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, root, True)
        shutil.copytree(ML / "pipeline", root / "pipeline")
        registry = root / "registry"
        registry.mkdir()
        dataset = write_fixture(registry, source, consent)
        result = subprocess.run(
            [
                sys.executable,
                str(root / "pipeline" / "02_train.py"),
                "--dataset",
                str(dataset),
                "--version",
                "ci",
            ],
            capture_output=True,
            text=True,
        )
        return root, registry, result

    def metrics(self, registry: Path) -> dict:
        return json.loads((registry / "metrics.json").read_text(encoding="utf-8"))

    def test_fixture_source_never_exports(self) -> None:
        _, registry, result = self.run_pipeline("fixture", 1.0)
        # 3 = entrenó pero no es desplegable (justo lo esperado sin datos reales).
        self.assertIn(result.returncode, (0, 3), result.stderr)
        self.assertIs(self.metrics(registry)["deployable"], False)
        self.assertGreater(self.metrics(registry)["holdout"]["logistic"]["auc"], 0.6)
        # el golden se escribe igual: el check sigue disponible para smoke tests
        self.assertTrue((registry / "golden.json").exists())
        self.assertEqual(list(registry.glob("model-*.json")), [])

    def test_low_consent_blocks_deploy(self) -> None:
        _, registry, result = self.run_pipeline("mongo", 0.4)
        self.assertIn(result.returncode, (0, 3), result.stderr)
        self.assertIs(self.metrics(registry)["deployable"], False)
        self.assertEqual(list(registry.glob("model-*.json")), [])

    def test_deployable_run_exports_and_golden_matches(self) -> None:
        root, registry, result = self.run_pipeline("mongo", 1.0)
        self.assertEqual(result.returncode, 0, result.stderr)
        artifacts = list(registry.glob("model-*.json"))
        self.assertEqual(len(artifacts), 1, artifacts)
        check = subprocess.run(
            [
                sys.executable,
                str(root / "pipeline" / "check_artifact.py"),
                str(artifacts[0]),
                str(registry / "golden.json"),
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(check.returncode, 0, check.stderr)


if __name__ == "__main__":
    unittest.main()
