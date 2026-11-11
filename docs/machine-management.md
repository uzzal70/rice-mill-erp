# 46. Machine Management Specification & Implementation Guide

## 1. Business Workflow
Modern industrial rice mills operate high-capacity, mission-critical machinery including auto rice mills, steam boilers, continuous recirculating dryers, power generators, belt and bucket elevators/conveyors, weighbridge scales, and automated packaging machines. Unexpected machine breakdowns during peak harvest drying and milling cause severe throughput loss, moisture spoilage, and direct financial penalties.

The Machine Management module provides complete equipment lifecycle management:
1. **Equipment Registry**: Tracking code, name, machinery category, brand, model, processing capacity, purchase date/cost, and recommended service interval hours.
2. **Operational Run Hours & Energy Logging**: Recording daily shift run hours (`endHours - startHours`), operator details, and energy/fuel consumed, automatically accumulating `totalRunHours`.
3. **Maintenance & Breakdown Tracking**: Formal ticketing for `PREVENTIVE`, `BREAKDOWN`, `REPAIR`, and `OVERHAUL` work. When a breakdown is logged, machine status transitions automatically to `BREAKDOWN` or `UNDER_MAINTENANCE`.
4. **Spare Parts Usage & Repair Costing**: Capturing parts consumed (bearings, belts, rubber rollers, screen meshes) and technician labour costs to calculate total equipment maintenance expenditure.
5. **Service Due Alerts**: Dynamic tracking comparing accumulated run hours against service intervals and wall-clock next service due dates.

## 2. Database Entities
- **Machine**: Equipment master with code, name, machineType, brand, modelNumber, capacity, totalRunHours, status, serviceIntervalHours, lastServiceDate, nextServiceDate.
- **MachineLog**: Daily run hours log (`startHours`, `endHours`, `runHours`), fuel/energy consumption, operator name, and remarks.
- **MachineMaintenance**: Maintenance tickets (`type: PREVENTIVE | BREAKDOWN | REPAIR | OVERHAUL`, `title`, `description`, `technicianName`, `labourCost`, `sparePartsCost`, `totalCost`, `status: SCHEDULED | IN_PROGRESS | COMPLETED`).
- **MachineSparePartUsage**: Itemized spare parts used (`partName`, `partNumber`, `quantity`, `unitCost`, `totalCost`).

## 3. Relationships
- `Company` $\to$ `Machine` (1:N)
- `Factory` $\to$ `Machine` (1:N)
- `ProductionLine` $\to$ `Machine` (1:N optional)
- `Machine` $\to$ `MachineLog` (1:N cascade)
- `Machine` $\to$ `MachineMaintenance` (1:N cascade)
- `MachineMaintenance` $\to$ `MachineSparePartUsage` (1:N cascade)

## 4. Calculations & Math
1. **Run Hours Calculation**:
   $$\text{Run Hours} = \text{End Hours} - \text{Start Hours}$$
   $$\text{Total Machine Run Hours} = \sum \text{Run Hours}$$
2. **Maintenance Ticket Total Cost**:
   $$\text{Spare Parts Cost} = \sum (\text{Part Quantity} \times \text{Part Unit Cost})$$
   $$\text{Total Maintenance Cost} = \text{Technician Labour Cost} + \text{Spare Parts Cost}$$
3. **Service Due Condition**:
   $$\text{Hours Since Last Service} = \text{Current Total Hours} - \text{Last Service Hours}$$
   $$\text{Is Service Due} = (\text{Hours Since Last Service} \ge \text{Service Interval Hours}) \lor (\text{Current Date} \ge \text{Next Service Date})$$

## 5. Accounting Impact
- Maintenance expenses feed directly into the general ledger expense category *Repairs & Maintenance (6020)* and into the direct manufacturing cost absorption of the Profitability Engine (#44).

## 6. Inventory Impact
- Spare parts usage deducts from the engineering spares inventory ledger (#26).

## 7. API Endpoints
All protected with RBAC permissions:
- `POST /machines`: Register equipment (`production:CREATE`)
- `GET /machines`: List machines with filters and service due flags (`production:READ`)
- `GET /machines/:id`: Detailed machine history and logs (`production:READ`)
- `POST /machines/logs`: Record run hours & fuel log (`production:CREATE`)
- `POST /machines/maintenance`: Create maintenance ticket (`production:CREATE`)
- `POST /machines/maintenance/:id/complete`: Complete maintenance and restore operational status (`production:UPDATE`)

## 8. Permissions
- `production:CREATE`: Register machines, log hours, open maintenance tickets.
- `production:READ`: View machines and maintenance history.
- `production:UPDATE`: Complete maintenance tickets and update equipment status.

## 9. Validation
- Unique machine code per factory.
- Validation: `endHours >= startHours`.
- Non-negative validation on spare parts quantities and costs.
- Guard against completing already closed maintenance tickets.

## 10. UI & Frontend Desk
- Built bilingual Machine Management Desk (`frontend/src/app/machines-page.tsx`).
- KPI Cards: Total Machines, Operational Count, Breakdown/Repair Count, Service Due Alerts.
- Machines registry table with real-time status chips and color-coded service due badges.
- Modals: Register Machine, Log Run Hours, Open Maintenance/Breakdown Ticket.

## 11. Reports & Analytical Insights
- Machine utilization and uptime % across Rice Mill, Boiler, Dryer, Generator, and Conveyor lines.
- Maintenance expenditure per machine to identify high-cost aging equipment.

## 12. Tests
- Unit tests in `backend/src/modules/machines/machines.service.spec.ts`:
  - Machine creation and factory code uniqueness guard.
  - Run hours logging and automatic increment of `totalRunHours`.
  - Negative run hours rejection (`endHours < startHours`).
  - Breakdown ticketing with automated status transition to `BREAKDOWN` and spare parts costing.
  - Maintenance ticket completion, operational restoration, and next service date scheduling.
- Controller RBAC tests in `machines.controller.spec.ts`.
- 100% test pass rate (9/9 tests).

## 13. Implementation Details
- Schema Migration: `database/prisma/migrations/0033_machine_management`
- Service: `backend/src/modules/machines/machines.service.ts`
- Controller: `backend/src/modules/machines/machines.controller.ts`
- Module: `backend/src/modules/machines/machines.module.ts`
- UI Desk: `frontend/src/app/machines-page.tsx`

