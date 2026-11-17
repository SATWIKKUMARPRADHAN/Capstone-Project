#!/usr/bin/env bash
# Nagios Event Handler Script -> Sends Real-Time JSON Alert to LabGuard Node.js Backend
# Triggered automatically by Nagios when service state changes to WARNING/CRITICAL/OK

HOSTNAME="$1"
SERVICEDESC="$2"
SERVICESTATE="$3"
STATETYPE="$4"
ATTEMPT="$5"
OUTPUT="$6"

BACKEND_URL="${LABGUARD_BACKEND_URL:-http://localhost:3000/api/nagios/webhook}"

# Only trigger recovery webhook on HARD states or OK recovery verification
if [[ "$STATETYPE" == "HARD" || "$SERVICESTATE" == "OK" ]]; then
  PAYLOAD=$(cat <<EOF
{
  "workstationId": "$HOSTNAME",
  "service": "$SERVICEDESC",
  "state": "$SERVICESTATE",
  "stateType": "$STATETYPE",
  "attempt": "$ATTEMPT",
  "output": "$OUTPUT",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
  curl -s -X POST "$BACKEND_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    --max-time 5 >/dev/null 2>&1
fi

exit 0
