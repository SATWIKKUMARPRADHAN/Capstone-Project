// MongoDB Initialization Script for LabGuard Database
db = db.getSiblingDB("labguard");

db.createCollection("workstations");
db.createCollection("incidents");
db.createCollection("issuereports");
db.createCollection("metriclogs");
db.createCollection("recoverylogs");
db.createCollection("examsubmissions");

db.workstations.createIndex({ workstationId: 1 }, { unique: true });
db.metriclogs.createIndex({ workstationId: 1, timestamp: -1 });
db.incidents.createIndex({ workstationId: 1, createdAt: -1 });
