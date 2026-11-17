"""
LabGuard ML Microservice (Flask API)
Exposes POST /analyze for Node.js backend integration in Docker or WSL2 environments.
"""

from flask import Flask, request, jsonify
from anomaly_detector import detect_anomalies

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "engine": "scikit-learn-isolation-forest"})


@app.route("/analyze", methods=["POST"])
def analyze():
    body = request.get_json(silent=True) or {}
    records = body.get("records", [])
    contamination = float(body.get("contamination", 0.08))
    result = detect_anomalies(records, contamination=contamination)
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
