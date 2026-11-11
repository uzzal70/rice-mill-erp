# Integrations and Device Readiness (#89)

## 1. Overview & Purpose
Modern industrial rice mills rely on continuous physical hardware integration: digital weighbridge scale indicators, moisture testing devices, barcode/QR scanners, biometric employee attendance clocks, and external bank payment gateways.

Promptdoc #89 mandates an **adapter-based integration architecture**. Hardware drivers and third-party APIs are decoupled from the core business logic using abstracted interfaces. In the event of a device hardware failure, network outage, or serial communication loss, the ERP provides resilient manual fallback workflows requiring operator authentication and a documented business reason.

## 2. Integrated Device Domains & Adapters

```
┌────────────────────────────────────────────────────────┐
│                   NestJS Core Engine                   │
│        (Gate, Weighbridge, Quality, HR, Inventory)     │
└───────────────────────────┬────────────────────────────┘
                            │ Abstract Adapter Interface
                            ▼
┌────────────────────────────────────────────────────────┐
│               Hardware & External Adapters             │
├─────────────────┬──────────────────┬───────────────────┤
│ Weighbridge     │ QC Moisture      │ Biometric HR      │
│ RS-232 / TCP/IP │ GAC-2500 / Dickey│ ZKTeco / Anviz    │
├─────────────────┼──────────────────┼───────────────────┤
│ Barcode / QR    │ Excel / CSV Hub  │ Banking & MFS     │
│ ESC/POS Scanners│ Master Importer  │ bKash / Nagad / IB│
└─────────────────┴──────────────────┴───────────────────┘
```

### 2.1 Digital Weighbridge Scale Integration
- **Protocol**: RS-232 Serial COM port / TCP-IP network socket communication.
- **Data Packet Format**: Continuous streaming string (e.g. `ST,GS,+015400KG\r\n`).
- **Scale Stability Check**: Driver requires 3 consecutive stable weight readings before enabling the "Capture Weight" action.
- **Manual Fallback**: If the scale cable is disconnected or indicator is damaged, the operator may manually enter the weight. The system flags the record as `isManualWeight = true`, logs the operator ID, and requires a documented reason (e.g. "COM port cable damaged during thunderstorm").

### 2.2 Laboratory Quality & Moisture Meters
- **Integration**: USB / Bluetooth export from commercial moisture meters (e.g. Dickey-John, Kett, or Seedburo).
- **Automated Capture**: Automatically populates moisture %, grain temperature, and test weight (g/L) directly into the `QualitySample` record without manual re-keying.

### 2.3 Biometric Employee Attendance
- **Protocol**: Scheduled pull synchronization via TCP/IP from factory biometric time clocks (ZKTeco / Anviz / Realtime).
- **Processing**: Normalizes device punch logs into Daily Attendance, calculates overtime hours, and flags late arrivals directly into `HrPayrollService`.

### 2.4 Barcode and QR Code Tracking
- **Finished Bag Labeling**: Prints 2D QR codes on finished rice sacks containing Batch Number, Rice Variety, Packaging Date, and Mill Identity.
- **Warehouse Dispatch Verification**: Forklift operators scan bag QR codes with handheld wireless scanners to verify correct lot dispatch against Delivery Challans.

### 2.5 Excel & CSV Bulk Data Import Hub
- Supported across 7 master domains (`ExcelImportPage`):
  1. Suppliers & Farmers
  2. Customers & Wholesale Traders
  3. Paddy Varieties
  4. Rice Products & Brands
  5. By-Products
  6. Packaging Specifications
  7. Chart of Accounts
- Features pre-import schema validation, duplicate detection, and inline cell error correction.

## 3. Architecture & Adapter Pattern
Each external integration adheres to an abstracted TypeScript interface:
```typescript
export interface DeviceAdapter<TConfig, TData> {
  connect(config: TConfig): Promise<boolean>;
  testConnection(): Promise<{ healthy: boolean; latencyMs: number }>;
  readData(): Promise<TData>;
  disconnect(): Promise<void>;
}
```

## 4. Database Schema & Models
- `Machine`: Tracks factory equipment and scale indicators (`code`, `name`, `type`, `serialNumber`, `ipAddress`, `port`, `lastSyncAt`, `status`).
- `MachineLog`: Operation logs, maintenance tickets, and device communication errors.
- `ImportBatch`: Bulk upload audits with `domain`, `totalRows`, `successRows`, `failedRows`, and error JSON.

## 5. Backend Services & Modules
- `backend/src/modules/machines/machines.service.ts`: Device health monitoring and equipment maintenance.
- `backend/src/modules/import/import.service.ts`: High-speed CSV/XLSX streaming parser with atomic batch commits.
- `backend/src/modules/fleet/fleet.service.ts`: Vehicle GPS trip logs and fuel consumption monitoring.

## 6. Frontend Presentation & UI States
- **Excel & CSV Import Hub** (`frontend/src/app/excel-import-page.tsx`): Drag-and-drop file uploader with schema preview table, column mapping dropdowns, and row-level error tooltips.
- **Machines & Hardware Desk** (`frontend/src/app/machines-page.tsx`): Device status indicators (Online, Offline, Maintenance Due) and manual telemetry entry dialogs.

## 7. Security & Role-Based Access Control (RBAC)
- Only `SUPER_ADMIN` and `GENERAL_MANAGER` can modify device communication parameters (IP, baud rate, COM ports).
- API keys and device credentials stored encrypted in the database or server environment.

## 8. Invariants & Financial/Stock Integrity
- Manual weight captures are visibly marked on printed scale slips to prevent operator collusion.
- Bulk Excel imports are executed inside Prisma `$transaction` blocks: if a batch has fatal structural errors, zero partial records are committed.

## 9. Exception & Error Handling
- Device communication timeouts default to graceful disconnection with retry backoff.
- Clear operator feedback: "Scale indicator offline. Verify COM cable connection or use authenticated manual entry."

## 10. Seed Scenarios & Verification Tests
- Unit Tests:
  - `backend/src/modules/import/import.service.spec.ts` (100% pass).
  - `backend/src/modules/machines/machines.service.spec.ts` (100% pass).
  - `backend/src/modules/fleet/fleet.service.spec.ts` (100% pass).

## 11. Localization (English & Bengali)
- Device status and import errors rendered in English and Bengali.
- Excel sample templates provided with bilingual column headers.

## 12. Operational Runbook & Disaster Recovery
- Step-by-step COM port configuration guide for weighbridge scale calibration.
- Re-sync instructions for biometric attendance clocks after power outages.

## 13. Audit & Compliance Checklist
- [x] Adapter-based architecture implemented for all external devices.
- [x] Weighbridge scale manual fallback requires operator identity and documented reason.
- [x] Biometric HR attendance synchronization supported.
- [x] Excel/CSV bulk import hub covers 7 master domains with pre-validation.
- [x] 100% test pass rate across integration and device suites.
