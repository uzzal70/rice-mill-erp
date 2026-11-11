# 54. AI-READY ARCHITECTURE

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Prepares an enterprise machine learning feature store, data extraction pipelines, model registry, and prediction contracts across 9 strategic milling domains without fabricating fake AI predictions. Actors: Mill Owners, Chief Data/AI Officers, Data Scientists, Operations Research Engineers.
- **Preconditions and source documents**: Extracts normalized ML feature vectors directly from validated operational ERP tables across 9 domains:
  1. `DEMAND_FORECASTING`: Sales history, seasonality index, customer segments, product grades.
  2. `RICE_PRICE_PREDICTION`: Realized sales rates, trading volumes, inflation factors, days since harvest.
  3. `PADDY_PRICE_PREDICTION`: Procurement rates, arrival volumes, moisture deductions, broker commissions.
  4. `PRODUCTION_FORECAST`: Milling throughput, batch run hours, variety recovery rates, ambient humidity.
  5. `PROFIT_FORECAST`: Quarterly revenue, raw material costs, operating expenses, fuel consumption.
  6. `SUPPLIER_QUALITY_SCORE`: Moisture rejection frequencies, net deductions, on-time arrivals.
  7. `CUSTOMER_RISK_SCORE`: Days Sales Outstanding (DSO), payment default history, credit utilization.
  8. `ANOMALY_DETECTION`: Multivariate weighbridge tickets (gross/tare/net ratio), milling variance, fuel consumption per ton.
  9. `STOCK_PREDICTION`: Inventory depletion velocities, safety buffers, stockout probabilities.
- **Strict Compliance Directive**: *"Do not implement fake AI. Only implement real AI when a proper model/data source is available."* If no active trained model or external endpoint is registered, the system returns `NO_ACTIVE_MODEL` with the extracted dataset feature vector and schema, preventing synthetic mock values.
- **States and transitions**: Model states: `REGISTERED` $\to$ `TRAINING` $\to$ `ACTIVE` $\to$ `DEPRECATED`.
- **Approval, posting, cancellation, correction/reversal**: Model deployments are explicitly audited with version stamps and deactivation controls.
- **Company/factory/location and ownership scope**: Multi-tenant isolation by `companyId`.

## 2. Database entities
- `AiModelRegistry`:
  - `id`, `companyId`, `domain`, `modelName`, `version`, `framework` (`ONNX`, `PYTORCH`, `TENSORFLOW`, `SCIKIT_LEARN`, `EXTERNAL_API`), `status`, `endpointUrl`, `artifactUri`, `inputSchema`, `outputSchema`, `performanceMetric`, `isActive`, `deployedAt`.
- `AiPredictionLog`:
  - `id`, `companyId`, `modelId`, `domain`, `inputFeatures`, `predictionOutput`, `confidenceScore`, `latencyMs`, `feedbackActual`, `wasAccurate`, `createdAt`.
- `AiFeatureDataset`:
  - `id`, `companyId`, `domain`, `datasetName`, `recordCount`, `featureSchema`, `dataSnapshot`, `exportedById`, `createdAt`.
- Migration: `0039_ai_ready_architecture`.

## 3. Relationships
- Parent/child: Scoped to `Company`.
- Feature extraction binds to Sales Orders (#27), Purchase Orders (#17), Production Batches (#26), Weighbridge Tickets (#21), General Ledger Accounts (#40), and Stock Movements (#23).

## 4. Calculations
- **Dataset Extraction & Feature Vectors**:
  - `DEMAND_FORECASTING`: $[ \text{weekOfYear}, \text{category}, \text{volumeKg}, \text{unitRateBDT}, \text{seasonalOffset} ]$.
  - `RECOVERY_RATE`: $\frac{\text{Rice Output KG}}{\text{Paddy Input KG}} \times 100$.
  - `TARE_RATIO`: $\frac{\text{Tare Weight}}{\text{Gross Weight}} \times 100$.
  - `DEPLETION_VELOCITY`: $\frac{\Delta \text{Stock KG}}{\Delta t_{\text{days}}}$.
- **Accuracy Feedback & Drift Evaluation**: Compares `predictionOutput` against recorded `feedbackActual` to calculate model precision and drift over time.

## 5. Accounting impact
- Reads GL accounts for receivables, revenues, and costs to build datasets. Predictions do not auto-post journal entries without human review.

## 6. Inventory impact
- Extracts depletion vectors to project stockout dates and optimize reorder quantities.

## 7. API
- `GET /ai-ready/overview?companyId=<id>`: Overview of all 9 domains with active model status and dataset counts.
- `POST /ai-ready/extract`: Extracts live feature dataset and creates `AiFeatureDataset` snapshot.
- `POST /ai-ready/models`: Registers new AI model with framework, version, and endpoint.
- `GET /ai-ready/models?companyId=<id>&domain=<optional>`: Lists registered models.
- `POST /ai-ready/predict`: Executes inference if active model exists, or returns `NO_ACTIVE_MODEL` contract.
- `POST /ai-ready/feedback`: Records actual outcome for evaluation.

## 8. Permissions
- `reports:READ`: Query overview, models, and predict.
- `reports:UPDATE`: Extract datasets, register models, and record feedback.

## 9. Validation
- `ExtractDatasetDto`: Validates `companyId`, `domain`, `days >= 7`, `limit >= 1`.
- `RegisterModelDto`: Validates `domain`, `modelName`, `version`, optional `framework`.
- `PredictDto`: Validates `domain`, `inputFeatures` object.

## 10. UI
- `frontend/src/app/ai-ready-page.tsx`:
  - 9 Domain Cards displaying status pills (`Model Active` vs `Pipeline Ready`), feature schemas, and dataset extraction buttons.
  - Model Registry table tracking versions, frameworks, artifact paths, and active toggles.
  - Inference Sandbox & Test allowing ML engineers to test JSON payloads and inspect response contracts without fake AI.
  - Dataset Inspection Dialog showcasing sample feature vectors.
  - Bilingual English/Bengali interface.

## 11. Reports
- Dataset exportable snapshots for offline model training in Jupyter / Python / Cloud ML notebooks.

## 12. Tests
- `backend/src/modules/ai-ready/ai-ready.service.spec.ts`: Unit tests validating domain overview, feature extraction, model registration, rejection of fake predictions with `NO_ACTIVE_MODEL`, and inference execution.
- `backend/src/modules/ai-ready/ai-ready.controller.spec.ts`: Controller delegation tests.
- 100% test pass rate across 9 unit tests.

## 13. Audit & Compliance
- Model registrations, feature extractions, and prediction logs audited with user IDs and timestamps.

