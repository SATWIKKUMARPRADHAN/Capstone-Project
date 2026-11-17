"""
LabGuard Data Science Module: Isolation Forest Anomaly Detector
Trains and evaluates an unsupervised IsolationForest model using Scikit-learn
on historical workstation telemetry (CPU %, RAM %, Disk %, Exam App Latency ms).
"""

import json
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


FEATURE_COLUMNS = ["cpuPercent", "memoryPercent", "diskPercent", "examLatencyMs"]


def detect_anomalies(records: list[dict], contamination: float = 0.08) -> dict:
    if not records:
        return {"total": 0, "anomaliesFound": 0, "results": []}

    df = pd.DataFrame(records)
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLUMNS].astype(float).fillna(0.0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=100,
        contamination=min(max(float(contamination), 0.01), 0.45),
        random_state=42,
    )
    preds = model.fit_predict(X_scaled)
    # decision_function: higher is normal, negative is anomalous
    raw_scores = model.decision_function(X_scaled)

    # Normalize score to [0, 1] where 1.0 is highest anomaly severity
    min_s, max_s = float(np.min(raw_scores)), float(np.max(raw_scores))
    span = (max_s - min_s) if (max_s - min_s) > 1e-6 else 1.0

    results = []
    for idx, row in df.iterrows():
        is_anomaly = int(preds[idx]) == -1
        severity_score = round(float((max_s - raw_scores[idx]) / span), 4)

        # Identify dominant contributing feature via z-score magnitude
        z_vec = np.abs(X_scaled[idx])
        top_feature = FEATURE_COLUMNS[int(np.argmax(z_vec))]

        results.append(
            {
                "id": row.get("id", f"row-{idx}"),
                "workstationId": row.get("workstationId", "UNKNOWN"),
                "timestamp": row.get("timestamp", ""),
                "cpuPercent": float(row["cpuPercent"]),
                "memoryPercent": float(row["memoryPercent"]),
                "diskPercent": float(row["diskPercent"]),
                "examLatencyMs": float(row["examLatencyMs"]),
                "isAnomaly": is_anomaly,
                "anomalyScore": severity_score,
                "dominantFeature": top_feature,
            }
        )

    return {
        "model": "sklearn.ensemble.IsolationForest",
        "contamination": contamination,
        "total": len(results),
        "anomaliesFound": sum(1 for r in results if r["isAnomaly"]),
        "results": results,
    }


if __name__ == "__main__":
    raw_input = sys.stdin.read().strip()
    if raw_input:
        payload = json.loads(raw_input)
        output = detect_anomalies(
            payload.get("records", []),
            payload.get("contamination", 0.08),
        )
        print(json.dumps(output))
    else:
        df_sample = pd.read_csv("sample_telemetry.csv")
        output = detect_anomalies(df_sample.to_dict(orient="records"))
        print(json.dumps({"summary": {k: output[k] for k in ["model", "total", "anomaliesFound"]}}, indent=2))
