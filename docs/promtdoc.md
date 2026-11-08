**# FINAL MASTER PROMPT**



**# ADVANCED RICE MILL ERP & FACTORY MANAGEMENT SYSTEM**



You are a Senior ERP Architect, Rice Mill Industry Domain Expert, Senior Full-Stack Engineer, Database Architect, UI/UX Designer, Accounting System Expert, QA Engineer, and DevOps Engineer.



Your task is to design and build a complete, production-ready, enterprise-grade **\*\*Rice Mill ERP & Factory Management System\*\*** for Bangladesh.



This is NOT a demo project.



This is NOT a simple inventory application.



This is NOT only an accounting system.



The application must digitally manage the complete real-world operation of a rice mill from:



Paddy Procurement

→ Vehicle/Gate Entry

→ Weighbridge

→ Quality Inspection

→ Paddy Receiving

→ Godown/Stack

→ Drying/Parboiling

→ Milling

→ Production

→ Rice/By-product Output

→ Packaging

→ Finished Goods

→ Sales

→ Dispatch

→ Customer Payment

→ Supplier Payment

→ Accounting

→ Profit/Loss

→ Management Analytics



The system must support both operational and financial traceability.





**---**



**# 1. RESEARCH BASIS**



**---**

> **Implementation review (2026-11-01): COMPLETE — research deliverable.** Public-source findings and evidence limits are documented in [research-basis.md](research-basis.md). Smart Software and JaMi-iT have bounded public evidence; attributable RiceERP and Labib IT rice-mill product documentation was not verified. Do not treat those evidence gaps as vendor feature confirmation.



Use publicly available concepts and workflows from established rice-mill ERP solutions as industry references, including:



1\. RiceERP

2\. Smart Software

3\. Labib IT

4\. JaMi-iT



Use their publicly documented concepts such as:



\- Paddy procurement

\- Gate management

\- Weighbridge

\- Quality inspection

\- Moisture calculation

\- Inventory

\- Godown/warehouse

\- Stack management

\- Production

\- Milling recovery

\- By-product management

\- Packaging

\- Sales

\- Customer/Supplier ledger

\- Accounting

\- HR/Payroll

\- Reports

\- Approval workflow

\- Audit trail



IMPORTANT:



Do NOT copy proprietary source code, private data, branding, copyrighted UI assets, or private implementation.



Use the research only to understand industry workflows and build a completely original implementation.



The final application must be more user-friendly, more configurable, and more advanced than a basic rice-mill management application.



**---**



**# 2. REQUIRED RICE MILL TYPES**



**---**

> **Implementation review (2026-11-01): PARTIAL.** Factory configuration supports the four production types and six business modes through Prisma and the factory API ([rice-mill-types.md](rice-mill-types.md)). Factory-settings UI and complete paddy/rice trading, wholesale/retail/dealer sales, and toll-milling workflows are not implemented. Configuration alone is not workflow support.



The system MUST support all of these:



A. Auto Rice Mill



B. Parboiled Rice Mill



C. Traditional / Semi-Automatic Rice Mill



D. Full Integrated Rice Mill



The same system must also support:



\- Paddy Trading

\- Rice Trading

\- Wholesale

\- Retail

\- Dealer Distribution

\- Toll/Commercial Milling

\- Multi-factory operations

\- Multi-godown operations

\- Multiple production lines



Do NOT create separate applications for each type.



Create one configurable ERP.



**---**



**# 3. TECHNOLOGY STACK**



**---**

> **Implementation review (2026-11-01): PARTIAL.** Next.js/React/TypeScript/MUI, NestJS/TypeScript REST, PostgreSQL/Prisma, JWT/RBAC, and Swagger are in use. React Hook Form, Zod, TanStack Query, and Recharts are installed; TanStack Query is mounted, but the new libraries are not yet wired through all module forms, server-state workflows, or analytics. Local Compose provides PostgreSQL only. Production Dockerfiles, Nginx, Redis integration, and persistent object/file storage are not implemented. See [technology-stack.md](technology-stack.md).



**## Frontend**



Next.js

React

TypeScript

Material UI

React Hook Form

Zod

TanStack Query

Redux Toolkit only where global state is required

Recharts or ECharts



**## Backend**



NestJS

TypeScript

REST API

JWT

Refresh Tokens

RBAC

Swagger/OpenAPI



**## Database**



PostgreSQL

Prisma ORM



**## Infrastructure**



Docker

Docker Compose

Nginx

Redis where useful

Object/File Storage



Architecture:



/frontend

/backend

/database

/docs

/docker



Frontend and backend must remain completely separated.



**---**



**# 4. DEVELOPMENT PRINCIPLE**



**---**

> **Implementation review (2026-11-01): PARTIAL.** [module-development-standard.md](module-development-standard.md) now defines the design-before-code sequence, module template, and completion criteria. Existing modules have not all been retroactively specified against every required design category, and many remain incomplete; apply and record the standard as each module is built or revisited.



Do not start by generating random UI pages.



First understand the business.



For EVERY module:



1\. Explain business workflow.

2\. Define database entities.

3\. Define relationships.

4\. Define calculations.

5\. Define accounting impact.

6\. Define inventory impact.

7\. Define API endpoints.

8\. Define permissions.

9\. Define validation.

10\. Define UI.

11\. Define reports.

12\. Write tests.

13\. Implement.



Never skip business logic.



**---**



**# 5. SYSTEM ARCHITECTURE**



**---**

> **Implementation review (2026-11-01): PARTIAL.** [architecture.md](architecture.md) documents the system boundaries, full target module catalog, ownership/dependency flow, and present implementation status. The code is a modular monolith with some logical domains sharing module folders; many required domains and complete independently maintained workflows are not implemented.



Use modular architecture.



Backend modules:



auth

users

roles

permissions

companies

factories

godowns

stacks

suppliers

farmers

brokers

customers

vehicles

drivers

paddy

rice

by-products

packaging

gate

weighbridge

quality

procurement

inventory

drying

parboiling

production

repacking

sales

dispatch

payments

expenses

accounting

hr

payroll

maintenance

documents

notifications

reports

analytics

audit

settings



Each module must be independently maintainable.



**---**



**# 6. MULTI-COMPANY**



**---**

> **Implementation review (2026-11-01): PARTIAL.** Company/factory scoping and same-company database constraints are implemented for the current identity, inventory, procurement, and processing foundations ([architecture.md](architecture.md)); migration `0010_company_scope_integrity` was applied and cross-company mismatch cases were rejected in disposable PostgreSQL. Remaining transaction domains are not implemented, so end-to-end multi-company behavior across the complete ERP is not yet verified.



Support multiple companies.



Company

→ Factory

→ Production Unit

→ Godown

→ Warehouse

→ Stack



Each transaction must be associated with:



companyId

factoryId

locationId where applicable



Never mix stock between companies.



**---**



**# 7. MULTI-FACTORY**



**---**

> **Implementation review (2026-11-01): PARTIAL.** Factory-scoped operations, godowns/stacks, weighbridge records, production-line setup, and an access-scoped operational-count comparison are implemented. Production batches do not yet reference lines; machine and weighbridge-device registries are absent; owner comparison for production, sales, finance, profit, and stock valuation is not implemented. See [multi-factory.md](multi-factory.md).



One company can have:



Factory A

Factory B

Factory C



Each factory can have:



Multiple godowns

Multiple stacks

Multiple production lines

Multiple machines

Multiple weighbridges



Owner dashboard must support:



All factories

Factory-wise

Comparison



**---**



**# 8. USER ROLES**



**---**



Create configurable RBAC.



Default roles:



SUPER_ADMIN

OWNER

DIRECTOR

GENERAL_MANAGER

FACTORY_MANAGER

ACCOUNTS_MANAGER

ACCOUNTANT

PURCHASE_MANAGER

PURCHASE_OFFICER

GATE_OPERATOR

WEIGHBRIDGE_OPERATOR

LAB_TECHNICIAN

STORE_MANAGER

PRODUCTION_MANAGER

PRODUCTION_OPERATOR

SALES_MANAGER

SALES_OFFICER

DISPATCH_OFFICER

HR_MANAGER

HR_OFFICER

DRIVER

AUDITOR

VIEWER



Permissions:



CREATE

READ

UPDATE

DELETE

APPROVE

REJECT

POST

PRINT

EXPORT

VIEW_FINANCIAL



Permissions must be configurable from admin.


> **Implementation review (2026-11-01): COMPLETE for this requirement.** Seed data defines all 23 requested default role codes and the permission catalog includes all 10 required actions. The backend supports company-role creation, grant updates, company-bound role assignment/revocation, escalation prevention, and transactional audit records; the frontend Roles & permissions screen configures role grants. Role assignment/revocation is available through the API; a dedicated membership assignment UI is not part of this section's delivered scope. See [rbac.md](rbac.md) and [phase-1.md](phase-1.md).


**---**



**# 9. AUTHENTICATION**



**---**



Implement:



Email/password login

OTP authentication

Forgot password

Email verification

Refresh tokens

Session management

Device tracking

Login history

Failed login protection

Account lock

Role-based authorization



Passwords must use secure hashing.



Never store plain passwords.


> **Implementation review (2026-11-01): COMPLETE.** Password/OTP sign-in, email reset and verification, rotating refresh tokens, revocable device sessions, login history, account lockout, and RBAC enforcement are implemented. The login screen exposes password, OTP, and reset-request flows; reset/verification links resolve to working pages; Account security shows sessions/history and supports session revocation and email verification. Login events are persisted by migration `0011_auth_login_history`; targeted tests cover hashing, lockout, single-use challenges, reset revocation, and refresh rotation. Email delivery requires the configured SMTP provider. See [authentication.md](authentication.md).


**---**



**# 10. COMPANY MASTER**



**---**



Fields:



companyName

logo

registrationNumber

TIN

BIN

address

district

division

phone

email

website

fiscalYear

currency



Default currency:


BDT / ৳


> **Implementation review (2026-11-01): COMPLETE.** Company create/read/update API and a Company profile screen cover legal identity, logo URL, registration/TIN/BIN, address, district/division, contact details, fiscal-year start month, and currency. BDT is the default; tenant-scoped updates and platform-only creation are validated and audited transactionally, including owner membership setup. Logo is currently recorded as a URL; file upload/storage and VAT/AIT/TDS configuration are separate work. See [company-master.md](company-master.md).


**---**



**# 11. FACTORY MASTER**

**Status: COMPLETE.** The factory master API and bilingual screen cover company-scoped factory creation, editing, business modes, production type, capacity, manager/address, and active status. Changes are audited; inactive factories cannot receive operational writes. See [factory-master.md](./factory-master.md).



**---**



Fields:



factoryName

factoryCode

address

manager

capacityPerDay

productionType

status



Production types:



AUTO

PARBOILED

TRADITIONAL

INTEGRATED



**---**



**# 12. GODOWN & STACK MANAGEMENT**

**Status: COMPLETE.** Added stack material/variety/crop/batch/lot/received-date metadata, ledger-derived occupancy and capacity display, age bands, stack updates with capacity safeguards, a scoped bilingual warehouse screen, and migration `0012_stack_storage_metadata`. Aging is explicitly stack-level, not FIFO lot aging. See [godown-stack-management.md](./godown-stack-management.md).



**---**



Hierarchy:



Factory

→ Godown

→ Stack



Each stack must show:



Stack Number

Capacity

Occupied Quantity

Available Capacity

Material

Variety

Crop Year

Batch

Lot

Received Date

Age



Stock aging:



0-30 days

31-60 days

61-90 days

90+ days



Provide visual warehouse occupancy.



**---**



**# 13. PADDY MASTER**

**Status: COMPLETE.** The company-scoped paddy item API now supports active filtering and partial profile updates; the bilingual catalog manages variety, local name, crop year, grade, standard moisture/recovery, description, and active status. Quality baselines remain required, and master edits do not move stock or post accounting. See [paddy-master.md](./paddy-master.md).



**---**



Fields:



paddyName

localName

variety

cropYear

grade

standardMoisture

standardRecovery

description

status



Examples:



BRRI Dhan 28

BRRI Dhan 29

BRRI Dhan 49

Miniket

Najirshail

Local varieties



Admin must be able to add unlimited varieties.



**---**



**# 14. RICE PRODUCT MASTER**

**Status: COMPLETE.** The bilingual rice product register supports the required fields, built-in rice types, custom type/packaging labels, active status, and company-scoped create/edit/search. Backend rules require composition targets and cap their combined percentage at 100%; master changes do not post stock or accounting. See [rice-product-master.md](./rice-product-master.md).



**---**



Fields:



productName

brand

riceType

variety

grade

headRicePercentage

brokenPercentage

packagingType

status



Types:



Parboiled

Atap

Miniket

Najirshail

Premium

Broken

Custom



**---**



**# 15. BY-PRODUCT MASTER**

**Status: COMPLETE.** Added a by-product type field and migration, secured creation with both reference prices, protected price editing, and a bilingual catalog with factory-ledger stock/production and sales-movement totals. Sales totals remain transaction-derived; section #35 supplies the sales/dispatch posting flow. See [by-product-master.md](./by-product-master.md).



**---**



Support:



Bran

Husk

Rice Polish

Broken Rice

Dust

Waste

Other



Each by-product must have:



Purchase price

Sales price

Stock

Production

Sales



**---**



**# 16. PACKAGING MASTER**



**---**



Support:



5 KG

10 KG

20 KG

25 KG

50 KG



But do NOT hard-code these sizes.



Admin must be able to create custom sizes.



Track:



Bag type

Bag size

Material

Unit cost

Supplier

Stock

**Status: COMPLETE.** Added a bilingual company-scoped Packaging Master with arbitrary positive bag sizes, type/material/supplier fields, active status, and unit cost. Creation requires item-create plus financial-view permissions; cost reads and edits remain protected and audited. Factory stock is derived only from ledger movements, so it remains zero until a later inventory receipt workflow posts packaging stock. Seed data includes 5, 10, 20, 25, and 50 KG examples without restricting custom sizes. See [packaging-master.md](./packaging-master.md).


**---**



**# 17. SUPPLIER / FARMER MANAGEMENT**



**---**



Create complete supplier/farmer profiles.



Fields:



name

mobile

address

NID

bankAccount

paymentMethod

supplierType

creditLimit

openingBalance



Track:



Total Purchase

Total Payment

Advance

Due

Return

Moisture Deduction

Quality Deduction

Broker Commission

Transport

Net Payable



Automatically create supplier ledger.

**Status: IN PROGRESS.** Implemented the bilingual company-scoped supplier/farmer profile register, identity/contact fields, active status, protected bank/payment/credit/opening-balance settings, audit events, and null-safe field clearing. The protected posted-GRN ledger records physical quantity and calculates gross purchase value from the moisture-adjusted payable quantity and rate, allocated across physical receipts. Payment/advance/due/return/additional-deduction/commission/transport totals remain unavailable until their source workflows are implemented; they must not be shown as fabricated master data. See [supplier-farmer-master.md](./supplier-farmer-master.md). Do not mark this section complete until the relevant transaction sources and full ledger are wired.


**---**



**# 18. BROKER MANAGEMENT**



**---**



Fields:



brokerName

mobile

commissionType

commissionRate

status



Commission can be:



Per KG

Per Mon

Per Ton

Percentage

Fixed Amount



Automatically calculate commission.
**Status: COMPLETE.** Added a bilingual broker master, atomic broker-plus-commission creation, protected commission updates, company-scoped listing, status management, and audit coverage. Purchase-order creation can select an optional active broker, snapshot the applied type/rate, and calculate the commission using measured KG quantity, purchase value, and effective-dated company unit conversions. Missing conversions fail explicitly; percentage rates are capped at 100%. The calculated amount is retained on the audited purchase order; accounting accrual/payment remain part of the later accounting/payment tasks. See [broker-master.md](./broker-master.md).


**---**



**# 19. GATE MANAGEMENT**



**---**



Create:



INWARD GATE

OUTWARD GATE



Gate workflow:



ENTRY

→ WEIGHING

→ QUALITY

→ RECEIVING

→ COMPLETED



Fields:



gateNumber

vehicleNumber

driver

supplier/customer

material

purpose

dateTime

factory

reference

challan

remarks



Support document/photo attachment.

**Status: COMPLETE.** Added inward/outward entry capture with driver and transaction references, company/factory-scoped file attachments, authenticated downloads, server-side content-signature checks, audit metadata, and migration `0016_gate_attachments`. Configure and persist `GATE_ATTACHMENT_DIR` in deployment; see [phase-3.md](./phase-3.md).



**---**



**# 20. VEHICLE MANAGEMENT**



**---**



Track:



Vehicle Number

Registration

Vehicle Type

Owner

Driver

Driver Mobile

Fitness

Insurance

Tax Token



Vehicle movement history.

**Status: COMPLETE.** Added the bilingual vehicle register with all specified identity and compliance fields, audited update/deactivation APIs, expiry warnings, and company/factory-scoped gate movement history. Migration `0017_vehicle_movement_index` indexes history lookups; details are in [vehicle-management.md](./vehicle-management.md).



**---**



**# 21. WEIGHBRIDGE**



**---**



Support:



Manual weighing



and



Future digital weighbridge integration.



Fields:



ticketNumber

vehicle

driver

material

grossWeight

tareWeight

netWeight

firstWeightTime

secondWeightTime

operator



Formula:



NET WEIGHT =

GROSS WEIGHT - TARE WEIGHT



Prevent duplicate weighbridge tickets.



Flag manual entries.



Maintain immutable history.

**Status: COMPLETE.** Manual tickets are calculated server-side with decimal arithmetic, duplicate tickets are rejected, operator and weight timestamps are retained, and tickets are immutable and flagged as manual. Device integration remains future work; no hardware protocol or authentication behavior is invented. See [phase-3.md](./phase-3.md).



**---**



**# 22. QUALITY CONTROL**



**---**



Create laboratory module.



Incoming paddy parameters:



Moisture %

Foreign Matter %

Broken %

Damaged %

Discolored %

Immature %

Chalky %

Purity %

Other



Workflow:



Sample

→ Test

→ Result

→ Approval



Support:



Gate Sample

Pit Sample

Final Sample



Quality result may affect:



Purchase Rate

Moisture Deduction

Quantity Deduction

Quality Penalty

Acceptance/Rejection



Approved result must be locked.

**Status: COMPLETE for laboratory capture and approval.** Added all incoming paddy parameters, a bilingual test/decision desk, one-time audited result submission, and multi-sample gate transitions; approved results are locked. Approved moisture measurements are used for purchase calculations only through the explicit configured engine in #23. See [quality-control.md](./quality-control.md).



**---**



**# 23. MOISTURE CALCULATION ENGINE**



**---**



NEVER hard-code a single moisture formula.



Create configurable moisture policy.



Example:



Received Moisture = 18%

Allowed Moisture = 14%



System calculates:



Moisture Difference

Deduction %

Deduction Quantity

Adjusted Quantity

Adjusted Rate



Admin can configure:



Moisture slabs

Tolerance

Deduction formula

Variety-specific policy

Supplier-specific policy

Factory-specific policy



Every deduction must show:



Original Quantity

Original Moisture

Allowed Moisture

Deduction %

Deduction Quantity

Final Quantity



**---**
**Status: COMPLETE for configurable moisture quantity/rate adjustments.** Added company-scoped, audited policies with factory, variety, and supplier scopes; administrator-managed numeric priority; dry-matter correction and slab-percentage quantity formulas; tolerance and independently configured rate deductions; selected-sample validation; and explicit errors for missing or tied policies. Physical weighed/received KG remains the stock and GRN quantity, while payable KG and adjusted rate are separately snapshotted for supplier purchase value. Broker commission remains on its original physical-quantity/agreed-rate basis. Added the bilingual policy editor, protected APIs, seed permissions, documentation, and additive migration `0018_moisture_policies`, which backfills existing POs unchanged. The migration still requires deployment to a configured PostgreSQL database. See [moisture-calculation.md](./moisture-calculation.md).


**# 24. PROCUREMENT**



**---**



Workflow:



Purchase Contract

→ Gate Entry

→ Gross Weight

→ Quality

→ Tare Weight

→ Final Quantity

→ GRN

→ Purchase Invoice

→ Supplier Payable



Purchase fields:



Supplier

Broker

Paddy

Variety

Crop Year

Rate

Quantity

Moisture

Quality

Transport

Loading

Unloading

Other Costs



Calculate:



Gross Amount

Moisture Deduction

Quality Deduction

Broker Commission

Transport

Other Charges

Net Payable



**---**



**# 25. LANDED COST**

**Status: IN PROGRESS.** Receipt-level configurable cost calculations, draft/approve/post API, audit events, and a bilingual desk are implemented. Migration `0020_landed_cost` is written but unapplied; inventory valuation, accounting journals, report export, and correction workflow remain unimplemented. See [landed-cost.md](landed-cost.md).



**---**



Calculate actual paddy landed cost.



Formula concept:



Paddy Purchase Cost



\- Transport

\- Loading

\- Unloading

\- Commission

\- Drying

\- **# Other Direct Costs**

&#x20; Landed Paddy Cost



Store landed cost per KG / Mon / Ton.



Do not hard-code the calculation.



Allow configurable cost components.



**---**



**# 26. INVENTORY ENGINE**

**Status: IN PROGRESS.** Item/movement enums now cover the required material categories and movement types; generic transfers and adjustments accept all active item kinds and enforce KG-based stack capacity using company unit conversions. Opening balances, source workflows for sales/returns/repacking/damage/loss, and their UI remain outstanding. See [inventory-engine.md](inventory-engine.md).



**---**



Inventory must support:



Paddy

Rice

Broken

Bran

Husk

Polish

Packaging

Fuel

Spare Parts

Consumables



Every movement must generate an inventory transaction.



Transaction types:



OPENING

PURCHASE

TRANSFER_IN

TRANSFER_OUT

PRODUCTION_INPUT

PRODUCTION_OUTPUT

SALE

SALE_RETURN

PURCHASE_RETURN

ADJUSTMENT

REPACK

DAMAGE

LOSS



Never silently modify stock.



**---**



**# 27. STOCK LEDGER**

**Status: IN PROGRESS.** The stock endpoint now exposes opening, positive in, positive out, and balance per item/location, with item, factory, stack, lot, batch, crop-year, and variety metadata. Added auditable count snapshots and a guarded reconciliation post that writes a stock movement. Opening balance workflows, richer date/location filters, and export remain. See [stock-ledger.md](stock-ledger.md).



**---**



For every item maintain:



Opening

In

Out

Balance



Track:



Company

Factory

Godown

Stack

Batch

Lot

Crop Year

Variety



Support:



Stock Transfer

Stock Adjustment

Stock Count

Stock Reconciliation



Prevent negative stock by default.



**---**



**# 28. DRYING MODULE**

**Status: IN PROGRESS.** Backend records measured drying batches and atomically posts input/output paddy movements; the bilingual batch desk now supports capture, approval, and posting. Fuel stock issue, resource costing, reversal, and export remain. See [drying.md](drying.md).



**---**



Track:



Input Paddy

Input Weight

Moisture Before

Moisture After

Drying Method

Drying Time

Fuel

Electricity

Labour

Output Weight

Loss



Calculate drying loss.



**---**



**# 29. PARBOILING MODULE**

**Status: IN PROGRESS.** Backend enforces ordered soaking, steaming, and drying measurements, reconciled weight handoffs, and atomic raw/parboiled stock posting. The bilingual stage desk now captures these measurements and approval/post actions. Resource costing, reversal, milling handoff and export remain. See [parboiling.md](parboiling.md).



**---**



Workflow:



Raw Paddy

→ Soaking

→ Steaming

→ Drying

→ Milling



Track:



Batch

Input

Soaking

Steam

Drying

Moisture

Fuel

Electricity

Labour

Output

Loss



**---**



**# 30. PRODUCTION MODULE**

**Status: IN PROGRESS.** Backend batch approval/posting and line validation are implemented; the bilingual UI captures paddy input and multiple rice/by-product outputs and shows computed recovery. Machine registry/assignment, costing, reversal, and export remain. See [production.md](production.md).



**---**



Create production batch.



Fields:



batchNumber

factory

productionLine

machine

paddy

variety

cropYear

lot

inputQuantity

startTime

endTime



Outputs:



Head Rice

Broken Rice

Bran

Husk

Polish

Dust

Other



**---**



**# 31. RECOVERY CALCULATION**

**Status: IN PROGRESS.** Server-side mass-balance and recovery calculations now display in the production desk, including comparison against the paddy item's standard recovery. A separate configurable threshold and export/report remain. See [recovery-calculation.md](recovery-calculation.md).



**---**



Do NOT assume fixed recovery.



Formula:



TOTAL OUTPUT =

SUM(all outputs)



PROCESS LOSS =

INPUT - TOTAL OUTPUT



HEAD RICE RECOVERY % =

HEAD RICE / INPUT × 100



TOTAL RICE RECOVERY % =

(HEAD RICE + BROKEN RICE) / INPUT × 100



BY-PRODUCT RECOVERY % =

BY-PRODUCT / INPUT × 100



Display:



Input

Head Rice

Broken

By-products

Loss

Recovery %



Compare:



Actual Recovery

vs

Standard Recovery



Generate warning if recovery falls below configured threshold.



**---**



**# 32. PRODUCTION COST**

**Status: DESIGNED; implementation not started.** [production-cost.md](production-cost.md) specifies methods, data, permissions, reports, and accounting effects. FIFO and weighted-average require valued receipt/transfer layers; current movements mostly lack cost layers, and landed cost remains separate from stock valuation. Do not calculate or post production costs until this source-cost foundation is implemented.



**---**



Production cost must include:



Paddy Cost

Electricity

Diesel

Gas

Steam

Labour

Machine Maintenance

Packaging

Transport

Factory Overhead

Other Direct Cost



Calculate:



Batch Cost

Cost/KG

Cost/Mon

Cost/Ton



Costing methods:



ACTUAL

WEIGHTED_AVERAGE

FIFO

STANDARD



**---**



**# 33. BY-PRODUCT COST OFFSET**

**Status: DESIGNED; implementation awaits #32 production cost and #35/#38 sales/return source records.** [by-product-cost-offset.md](by-product-cost-offset.md) defines source-backed realized-revenue offsets and identifies batch/lot traceability and accounting policy dependencies. Item master reference prices are not actual revenue and are excluded.



**---**



Calculate by-product revenue.



Example:



Bran Revenue



\- Husk Revenue

\- Broken Rice Revenue

\- Polish Revenue



Then calculate:



NET RICE PRODUCTION COST



Concept:



**## Total Production Cost**



**# By-product Revenue**



Net Rice Cost



The system must show both:



Gross Production Cost



and



Net Production Cost.



**---**



**# 34. REPACKING**

**Status: IN PROGRESS.** Added the repack batch model/migration `0023_repacking_batches`, company/factory-scoped draft/approve/post API, and bilingual desk. Posting atomically issues source rice, receives packaged rice, consumes packaging pieces, and records mass-balance loss after checking available stock and destination capacity. Migration deployment, costing/accounting, reversal, and reporting remain. See [repacking.md](repacking.md).



**---**



Support:



50 KG → 25 KG

50 KG → 10 KG

25 KG → 5 KG



Automatically:



Deduct source stock

Create finished stock

Consume packaging

Record packing loss



**---**



**# 35. SALES**

**Status: IN PROGRESS.** Added migration `0024_sales_orders`, company/factory-scoped draft order API, transaction-price snapshots, bilingual order desk, and serializable approval-time stock reservations with cancellation release. API and bilingual desk support multi-line orders. Quotations, customer credit exposure controls, dispatch, invoicing, payments, FX/export paperwork, accounting, migration deployment, and tests remain. See [sales.md](sales.md).



**---**



Support:



Wholesale

Retail

Dealer

Distributor

Institutional

Cash Customer

Credit Customer

Export Customer



Workflow:



Quotation

→ Sales Order

→ Stock Reservation

→ Dispatch

→ Invoice

→ Payment



**---**



**# 36. CUSTOMER MANAGEMENT**

**Status: IN PROGRESS.** Extended the bilingual partner master to manage company-scoped CUSTOMER profiles using existing Partner fields for identity, tax data, credit limit, payment terms, and opening balance. Financial details remain protected and audited; customer purchase-ledger access is rejected. Invoice/payment/advance/due/return/credit-note/debit-note activity depends on sales, dispatch, return, and accounting workflows. See [customer-management.md](customer-management.md).



**---**



Fields:



customerName

businessName

mobile

address

NID

TIN

BIN

creditLimit

paymentTerms

openingBalance



Track:



Invoices

Payments

Advance

Due

Returns

Credit Notes

Debit Notes



**---**



**# 37. DISPATCH**



**---**



Before dispatch:



Validate stock.



Record:



Customer

Vehicle

Driver

Sales Order

Items

Bags

Weight

Warehouse

Date



Generate:



Delivery Challan

Gate Pass

Invoice



**---**



**# 38. SALES RETURN**



**---**



Support:



Full Return

Partial Return

Damaged Return



Automatically update:



Stock

Customer Ledger

Sales

Accounting



**---**



**# 39. TOLL / COMMERCIAL MILLING**



**---**



This is mandatory.



Customer-owned paddy must remain separate from company-owned inventory.



Workflow:



Customer Paddy Receive

→ Weighbridge

→ Production

→ Rice/By-products

→ Return

→ Processing Charge



Calculate:



Processing Charge =

Processed Quantity × Toll Rate



Support:



Customer-owned stock

Company-owned stock



Never mix the two.



**---**



**# 40. EXPENSE MANAGEMENT**



**---**



Categories:



Electricity

Diesel

Gas

Labour

Repair

Maintenance

Transport

Loading

Unloading

Packaging

Rent

Security

Office

Miscellaneous



Expense types:



Factory Expense

Office Expense

Production Expense

Transport Expense

Administrative Expense



Every expense must have accounting impact.



**---**



**# 41. ACCOUNTING ENGINE**



**---**



Implement REAL double-entry accounting.



Modules:



Chart of Accounts

Journal

Ledger

Cash

Bank

Accounts Receivable

Accounts Payable

Payment

Receipt

Contra

Expense

Income



Rule:



TOTAL DEBIT = TOTAL CREDIT



Every posted transaction must create accounting entries.



**---**



**# 42. AUTOMATIC ACCOUNTING**



**---**



Purchase:



Dr Inventory

Cr Supplier Payable



Sale:



Dr Customer

Cr Sales Revenue



Payment:



Dr Cash/Bank

Cr Customer



Supplier Payment:



Dr Supplier Payable

Cr Cash/Bank



Expense:



Dr Expense

Cr Cash/Bank



Production:



Dr Finished Goods

Dr By-products

Cr Raw Material

Cr Production Cost Accounts



Use proper configurable accounting mappings.



**---**



**# 43. FINANCIAL REPORTS**



**---**



Create:



Cash Book

Bank Book

General Ledger

Supplier Ledger

Customer Ledger

Trial Balance

Profit & Loss

Balance Sheet

Cash Flow

Accounts Receivable

Accounts Payable

Due Aging

Expense Report

Income Report



**---**



**# 44. PROFITABILITY ENGINE**



**---**



Calculate profitability:



Per Purchase

Per Paddy Lot

Per Production Batch

Per KG

Per Mon

Per Ton

Per Product

Per Brand

Per Factory

Per Customer

Per Invoice



Example:



Paddy Cost



\- Processing Cost

\- Labour

\- Electricity

\- Packaging

\- Transport

\- Overhead



\* **# By-product Revenue**

&#x20; Net Rice Cost



Then:



**## Sales Revenue**



**# Actual Cost**



Gross Profit



Show:



Revenue

Cost

Profit

Margin %



**---**



**# 45. HR MANAGEMENT**



**---**



Employee:



Name

NID

Phone

Address

Department

Designation

Joining Date

Salary



Attendance

Leave

Overtime

Advance

Loan

Bonus

Deduction

Payroll



Net salary calculation.



**---**



**# 46. MACHINE MANAGEMENT**



**---**



Machines:



Rice Mill

Boiler

Dryer

Generator

Conveyor

Weighbridge

Packaging Machine



Track:



Machine Hours

Maintenance

Breakdown

Repair

Spare Parts

Cost

Next Service



**---**



**# 47. VEHICLE & FUEL MANAGEMENT**



**---**



Track:



Vehicle

Fuel

Mileage

Driver

Trip

Maintenance

Transport Cost



Calculate:



Fuel Cost/Trip

Fuel Cost/KM

Transport Cost



**---**



**# 48. DOCUMENT MANAGEMENT**



**---**



Upload:



Trade License

TIN

BIN

Factory License

Environmental License

Insurance

Contracts

Vehicle Documents

Quality Certificates



Expiry notification.



**---**



**# 49. APPROVAL SYSTEM**



**---**



Important transactions:



DRAFT

→ SUBMITTED

→ REVIEWED

→ APPROVED

→ POSTED

→ LOCKED



Support:



Reject

Return for correction

Approval comments



After posting:



Do not allow silent modification.



Use reversal/correction transactions.



**---**



**# 50. AUDIT LOG**



**---**



Track:



User

Action

Module

Record

Old Value

New Value

IP

Device

Date

Time



Audit log must be immutable.



**---**



**# 51. OWNER DASHBOARD**



**---**



Dashboard must show:



Today's Paddy Purchase

Today's Paddy Received

Today's Production

Today's Rice Output

Today's Sales

Today's Collection

Today's Expenses

Today's Profit



Stock:



Paddy

Rice

Broken

Bran

Husk

Packaging



Finance:



Cash

Bank

Customer Due

Supplier Due



Operations:



Vehicles

Pending Quality

Pending Approval

Production Running

Low Stock



**---**



**# 52. MANAGEMENT ANALYTICS**



**---**



Charts:



Paddy Purchase Trend

Paddy Price Trend

Rice Price Trend

Production Trend

Recovery Trend

Sales Trend

Profit Trend

Expense Trend

Stock Aging

Supplier Performance

Customer Profitability



KPIs:



Average Paddy Rate

Average Sales Rate

Average Recovery

Cost/KG

Profit/KG

Gross Margin

Stock Turnover

Working Capital



**---**



**# 53. SMART ALERTS**



**---**



Create automatic alerts.



Examples:



Low Stock

High Moisture

Low Recovery

Customer Overdue

Supplier Payment Due

Document Expiring

Machine Maintenance Due

Unusual Weight

Unusual Production Loss

Negative Margin

Slow Moving Stock



**---**



**# 54. AI-READY ARCHITECTURE**



**---**



Prepare architecture for future AI features:



Demand Forecasting

Rice Price Prediction

Paddy Price Prediction

Production Forecast

Profit Forecast

Supplier Quality Score

Customer Risk Score

Anomaly Detection

Stock Prediction



Do not implement fake AI.



Only implement real AI when a proper model/data source is available.



**---**



**# 55. REPORTING**



**---**



Every report must support:



Date range

Factory

Godown

Supplier

Customer

Paddy

Rice

Product

Batch

User



Export:



PDF

Excel

CSV



Reports must be printable.



**---**



**# 56. DOCUMENT PRINTING**



**---**



Create professional A4 documents:



Purchase Invoice

Purchase Receipt

Gate Pass

Weighbridge Ticket

Quality Report

GRN

Stock Transfer

Production Report

Sales Invoice

Delivery Challan

Payment Receipt

Money Receipt

Supplier Statement

Customer Statement



Include:



Company logo

Company information

Document number

Date

Authorized signature

Terms



**---**



**# 57. BANGLADESH SUPPORT**



**---**



Default:



Currency = BDT / ৳



Units:



KG

MON

TON

BAG



Default:



1 MON = 40 KG



BUT:



Unit conversion must be configurable.



Tax system must be configurable.



Do not hard-code tax rates.



Support configurable:



VAT

AIT

TDS

VDS



Effective date based configuration.



**---**



**# 58. GLOBAL SEARCH**



**---**



CTRL + K



Search:



Supplier

Farmer

Customer

Vehicle

Invoice

Purchase

Sales

Batch

Stock

Gate Pass

Weighbridge Ticket

Payment



**---**



**# 59. EXCEL IMPORT**



**---**



Support Excel import for:



Suppliers

Customers

Paddy

Rice

Opening Stock

Opening Balance

Employees



Validate before import.



Show:



Valid Records

Invalid Records

Errors



Allow user to correct before final import.



**---**



**# 60. NOTIFICATION SYSTEM**



**---**



Support:



In-App

Email

SMS-ready

WhatsApp-ready architecture



Notifications:



Due

Payment

Low Stock

Approval

Production

Quality

Vehicle

Document Expiry

Maintenance



**---**



**# 61. DATABASE DESIGN**



**---**



Create normalized PostgreSQL database.



Core tables include:



users

roles

permissions

role_permissions

companies

factories

godowns

stacks

suppliers

farmers

brokers

customers

vehicles

drivers

paddy_items

rice_items

by_products

packaging_items

gate_entries

weighbridge_tickets

quality_samples

quality_results

purchase_contracts

purchase_orders

goods_receipts

purchase_invoices

purchase_returns

inventory_transactions

stock_balances

production_batches

production_inputs

production_outputs

production_costs

drying_batches

parboiling_batches

repacking

sales_orders

sales_invoices

dispatches

sales_returns

payments

receipts

expenses

accounts

journal_entries

journal_lines

employees

attendance

leave

payroll

machines

maintenance

documents

notifications

audit_logs

settings



Use:



Foreign Keys

Indexes

Unique Constraints

Check Constraints

Transactions



**---**



**# 62. CRITICAL DATA INTEGRITY**



**---**



Prevent:



Negative Stock

Duplicate Invoice

Duplicate Weighbridge Ticket

Duplicate Gate Entry

Unbalanced Journal

Unauthorized Price Change

Unauthorized Financial Edit

Invalid Quantity

Invalid Weight

Invalid Moisture

Unauthorized Delete



All critical operations must use database transactions.



**---**



**# 63. CALCULATION ENGINE**



**---**



Do NOT place business calculations inside React components.



Create backend services.



Required services:



calculateNetWeight()



calculateMoistureDeduction()



calculateAdjustedQuantity()



calculatePurchaseCost()



calculateLandedCost()



calculateProductionRecovery()



calculateByProductValue()



calculateProductionCost()



calculateRiceCost()



calculateSalesProfit()



calculateSupplierDue()



calculateCustomerDue()



calculateTollCharge()



calculatePackagingCost()



All calculations must have unit tests.



**---**



**# 64. UNIT TEST EXAMPLE**



**---**



Example:



Input Paddy:



4000 KG



Outputs:



2600 KG Head Rice

300 KG Broken Rice

500 KG Bran

400 KG Husk

100 KG Waste



System must calculate:



Total Output

Process Loss

Head Rice Recovery

Total Rice Recovery

By-product Recovery



Do not assume 65% recovery.



Calculate from actual transaction values.



**---**



**# 65. UX / UI REQUIREMENTS**



**---**



The UI must be:



Professional

Clean

Fast

Simple

Industrial ERP style

Responsive

Accessible



Use Material UI.



Do NOT:



Use excessive gradients

Use huge cards

Use unnecessary animations

Use confusing navigation

Use excessive popups



Common operations must require minimum clicks.



Use:



DataGrid

Tabs

Drawer

Dialog

Stepper

Wizard

Autocomplete

Date Range Picker

Search

Filters

Bulk actions



**---**



**# 66. BANGLA + ENGLISH**



**---**



Support:



English

বাংলা



Create translation architecture.



Users must be able to switch language.



Do not hard-code UI text.



**---**



**# 67. MOBILE**



**---**



Owner dashboard must work on mobile.



Mobile owner view:



Sales

Production

Profit

Stock

Cash

Bank

Due



Managers can approve transactions from mobile.



**---**



**# 68. PERFORMANCE**



**---**



Use:



Pagination

Server-side filtering

Indexes

Caching

Lazy loading

Background jobs

Redis where necessary



Never load thousands of records unnecessarily.



**---**



**# 69. BACKUP**



**---**



Implement:



Daily database backup

File backup

Retention policy

Backup status

Restore documentation



Admin dashboard:



Last Backup

Backup Size

Backup Status



**---**



**# 70. API DESIGN**



**---**



Use REST API.



Example:



POST /auth/login

POST /auth/otp

GET /users

POST /gate-entries

POST /weighbridge

POST /quality-tests

POST /purchases

POST /inventory/transfers

POST /production/batches

POST /sales/orders

POST /sales/invoices

POST /dispatches

POST /payments

GET /reports/profit-loss



All APIs require:



DTO validation

Authentication

Authorization

Pagination

Filtering

Sorting

Search

Error handling



Generate Swagger documentation.



**---**



**# 71. API RESPONSE STANDARD**



**---**



Use consistent API response.



Success:



{

"success": true,

"message": "...",

"data": {},

"meta": {}

}



Error:



{

"success": false,

"message": "...",

"errors": []

}



Never expose raw database errors to users.



**---**



**# 72. ERROR HANDLING**



**---**



Errors must be human-readable.



Example:



BAD:



"500 Internal Server Error"



GOOD:



"Insufficient stock. Available: 1,250 KG. Requested: 1,500 KG."



**---**



**# 73. SEED DATA**



**---**



Create realistic Bangladesh demo data.



Company:



ABC Rice Industries Ltd.



Factories:



Bogura Factory

Naogaon Factory



Godowns:



Godown A

Godown B



Paddy:



BRRI Dhan 28

BRRI Dhan 29

BRRI Dhan 49

Miniket

Najirshail



Products:



Miniket Rice

Najirshail Rice

Parboiled Rice

Broken Rice



By-products:



Bran

Husk

Polish



Create:



Suppliers

Farmers

Brokers

Customers

Vehicles

Production batches

Sales

Payments

Expenses



**---**



**# 74. TESTING**



**---**



Create:



Unit Tests

Integration Tests

API Tests

Database Tests

RBAC Tests

Calculation Tests

Inventory Tests

Accounting Tests



Critical tests:



Purchase

Moisture

Weight

Production

Recovery

Stock

Sales

Payment

Accounting

Profit



**---**



**# 75. DEVELOPMENT PHASES**



**---**



Do NOT attempt to generate the entire project blindly in one response.



Build sequentially.



PHASE 1:



Project architecture

Database

Authentication

RBAC

Company

Factory

Users

Settings



PHASE 2:



Supplier

Farmer

Broker

Customer

Paddy

Rice

By-product

Packaging



PHASE 3:



Gate

Vehicle

Weighbridge

Quality



PHASE 4:



Purchase

GRN

Inventory

Godown

Stack



PHASE 5:



Drying

Parboiling

Production

Recovery

By-products

Repacking



PHASE 6:



Sales

Dispatch

Customer

Payment



PHASE 7:



Accounting

Ledger

P&L

Balance Sheet



PHASE 8:



HR

Payroll

Machine

Maintenance



PHASE 9:



Reports

Analytics

Notifications

Audit



PHASE 10:



Testing

Security

Performance

Docker

Backup

Deployment



**---**



**# 76. PROJECT STRUCTURE**



**---**



Frontend:



src/

app/

components/

layouts/

modules/

features/

hooks/

services/

store/

utils/

validations/

types/

theme/

locales/



Backend:



src/

modules/

common/

auth/

database/

config/

guards/

decorators/

filters/

interceptors/

utils/



Keep business logic inside backend services.



**---**



**# 77. ACCOUNTING + INVENTORY CONSISTENCY**



**---**



This is extremely important.



Every operation that changes stock must have a corresponding inventory transaction.



Every operation that changes financial value must have corresponding accounting entries.



Example:



Purchase:



Inventory increases.



Supplier payable increases.



Accounting journal created.



If purchase is cancelled:



Use reversal transaction.



Do NOT simply delete the original transaction.



**---**



**# 78. TRANSACTION LOCKING**



**---**



After a financial transaction is:



APPROVED

and

POSTED



it becomes LOCKED.



To correct it:



Create reversal/correction.



Never silently change historical financial data.



**---**



**# 79. OWNER AUDITABILITY**



**---**



Owner must be able to click a transaction and trace:



Supplier

→ Gate Entry

→ Weighbridge

→ Quality

→ GRN

→ Inventory

→ Production

→ Finished Goods

→ Sales

→ Payment

→ Accounting



This is a core feature.



Create "Transaction Trace" screen.



**---**



**# 80. ADVANCED OWNER REPORT**



**---**



Create:



"Rice Mill Business Performance"



Show:



Paddy Purchased

Paddy Cost

Production

Rice Output

Recovery

By-product Output

Sales

Revenue

Production Cost

Expenses

Gross Profit

Net Profit

Customer Due

Supplier Due

Stock Value

Working Capital



Compare:



Today

This Week

This Month

This Year

Previous Period



**---**



**# 81. FINAL QUALITY STANDARD**



**---**



The final product must be:



PRODUCTION READY

ENTERPRISE GRADE

SECURE

SCALABLE

AUDITABLE

CONFIGURABLE

BANGLADESH READY

RICE MILL SPECIFIC

USER FRIENDLY



Do not create fake functionality.



Do not create placeholder buttons.



Do not create "Coming Soon" pages for core modules.



Every menu item must either work or be intentionally excluded from the release.



**---**



**# 82. FINAL AI INSTRUCTION**



**---**



You are building a REAL Rice Mill ERP, not a UI mockup.



Think like:



Rice Mill Owner

Factory Manager

Purchase Manager

Production Manager

Store Manager

Accountant

Sales Manager

HR Manager

Auditor

Software Architect



For every feature ask:



1\. How does it affect physical stock?

2\. How does it affect money?

3\. How does it affect supplier/customer balance?

4\. How does it affect accounting?

5\. How can the owner audit it?

6\. What happens if it is cancelled?

7\. What happens if the transaction is reversed?

8\. Can different rice mills configure the formula?

9\. Can a non-technical employee use it?

10\. Can the system handle multiple factories?



Never sacrifice business correctness for visual appearance.



**---**



**# 83. FIRST IMPLEMENTATION TASK**



**---**



Before writing application code:



1\. Create complete system architecture.

2\. Create ERD.

3\. Create PostgreSQL schema.

4\. Create Prisma schema.

5\. Define all major relationships.

6\. Define module dependencies.

7\. Define accounting flow.

8\. Define inventory flow.

9\. Define calculation engine.

10\. Define API architecture.

11\. Define frontend route structure.

12\. Define RBAC matrix.

13\. Define development phases.



Then begin implementation with PHASE 1.



After completing each phase:



\- Run tests.

\- Validate database relations.

\- Validate stock calculations.

\- Validate accounting.

\- Validate permissions.

\- Fix errors.

\- Only then continue to the next phase.



The final system must be runnable locally and deployable to production using Docker.



Provide complete documentation for:



Installation

Environment variables

Database setup

Migration

Seed

Development

Testing

Build

Production deployment

Backup

Restore

Admin setup



START WITH THE ARCHITECTURE AND DATABASE DESIGN.

DO NOT SKIP THE BUSINESS LOGIC.

DO NOT BUILD ONLY THE FRONTEND.

BUILD THE COMPLETE RICE MILL ERP.

---

# 84. ENTERPRISE-GRADE ROLE-BASED FRONTEND EXPERIENCE

## 84.1 Core UI/UX Direction

Build the frontend as a mature, classic, professional business ERP used daily by factory owners, managers, accountants, storekeepers and operators.

The interface must feel:
- Classic, stable, trustworthy and business-focused.
- Familiar to users of established ERP, accounting, inventory and manufacturing systems.
- Modern in usability and performance, but not trendy, flashy or unnecessarily decorative.
- Dense enough for real business work while remaining readable and easy to learn.
- Consistent across every module, form, table, report and workflow.

Use established enterprise software interaction patterns as inspiration: role-based workspaces, configurable dashboards, persistent navigation, global search, saved filters, list/detail screens, approval inboxes, drill-down reports, audit history, keyboard shortcuts, bulk actions and guided transaction workflows.

Do not copy any vendor's proprietary design, source code, branding, assets or exact screen layouts. Create an original design system.

## 84.2 Application Shell

Create a consistent application shell containing:

1. Collapsible left sidebar with module groups and permission-aware menu items.
2. Top navigation with company selector, factory selector, financial year, global search, notifications, help, language selector and user profile.
3. Breadcrumb navigation showing the current module and record.
4. Main content area with consistent page title, description, primary action and contextual actions.
5. Optional right-side contextual panel for activity, notes, attachments, related records and audit history.
6. Persistent quick-create actions based on the signed-in user's permissions.
7. Responsive mobile navigation and tablet-friendly operational screens.

The company/factory selector must show only the organizations and factories assigned to the logged-in user. Changing the active factory must refresh all relevant dashboard data, lists, reports and transaction defaults. Never leak data from another company or unauthorized factory.

## 84.3 Role-Based Dashboards and Workspaces

Create a dedicated landing dashboard and navigation experience for each role. Do not show every module to every user.

### SUPER_ADMIN
- Platform-wide company and tenant onboarding.
- Subscription/license and tenant status if SaaS mode is enabled.
- System health, queues, scheduled jobs, backups and integration status.
- Global user administration, role templates and platform configuration.
- Security alerts, suspicious login activity and platform audit logs.
- Support access must be time-limited, approved, reason-recorded and audited.
- No access to customer business transactions by default.

### OWNER / DIRECTOR
- Consolidated business overview across authorized companies and factories.
- Paddy purchase quantity and value, average purchase rate and supplier dues.
- Paddy, rice, broken rice, husk, bran and packaging stock valuation.
- Production quantity, recovery percentage, wastage and capacity utilization.
- Sales quantity/value, gross margin, customer dues and collection performance.
- Cash, bank, payable, receivable, expenses and profit/loss summaries.
- Factory-wise comparison and trend analysis.
- Pending high-value approvals, unusual transactions and operational alerts.
- Drill down from KPI to factory, transaction, lot, batch and ledger.

### GENERAL_MANAGER
- Daily factory performance and operational exceptions.
- Purchase, production, sales, dispatch and stock summaries.
- Pending approvals and delayed work.
- Staff attendance and operational task status.
- Factory-wise expenses, downtime and capacity utilization.
- Escalations and management reports.

### FACTORY_MANAGER
- Factory-specific operational dashboard.
- Today's vehicle arrivals, pending weighing and gate movements.
- Quality inspections and rejected/held lots.
- Godown capacity, stack occupancy and stock aging.
- Drying, parboiling, milling and production progress.
- Machine downtime, maintenance due and shift performance.
- Dispatch queue, safety incidents and factory expenses.
- No financial detail unless explicitly granted.

### PURCHASE_MANAGER / PURCHASE_OFFICER
- Supplier, farmer and broker directory.
- Purchase requests, quotations, purchase orders and rate comparison.
- Expected vehicle arrivals and gate queue.
- Weighbridge tickets, quality inspections and GRN completion.
- Moisture/quality deductions with transparent calculation breakdown.
- Purchase invoices, supplier ledger and payment requests.
- Pending approvals, purchase commitments and supplier performance.

### GATE_OPERATOR
- Large, simple, fast vehicle entry and exit workflow.
- Inward/outward register, vehicle queue and visitor/driver details.
- Search by vehicle number, supplier, challan, purchase order or ticket.
- Print gate pass and view current vehicle status.
- Minimal fields, large controls and clear success/error feedback.
- No accounting or unrelated management screens.

### WEIGHBRIDGE_OPERATOR
- Waiting vehicle queue and assigned weighbridge.
- First weight/gross weight and second weight/tare weight capture.
- Net weight calculation and visible unit.
- Scale/device status, manual entry reason and operator identity.
- Ticket preview, print/reprint permission and correction request.
- Duplicate ticket warning and immutable weighing history.
- No ability to silently edit a posted weight ticket.

### LAB_TECHNICIAN
- Sample queue and pending quality tests.
- Moisture, foreign matter, damaged grain, immature grain and other configurable test fields.
- Variety/grade standards and comparison.
- Test history, attachments, sample identification and retest workflow.
- Pass, hold or reject recommendation subject to configured authority.
- No ability to change approved procurement price or accounting records.

### STORE_MANAGER
- Godown, warehouse, stack and bin overview.
- Paddy, rice, by-product and packaging stock.
- Receipts, issues, transfers, reservations and adjustments.
- Stack capacity and occupancy visualization.
- Batch/lot traceability, aging, expiry where applicable and stock valuation.
- Physical stock count and variance approval workflow.
- Stock ledger and movement history.

### PRODUCTION_MANAGER / PRODUCTION_OPERATOR
- Production plan, shift plan and work orders.
- Paddy issue to drying/parboiling/milling.
- Batch input/output, recovery, by-products and process loss.
- Machine/line status, downtime and maintenance requests.
- Production costing and yield variance.
- Operator screens must be task-focused; managers receive planning and analytics controls.

### ACCOUNTS_MANAGER / ACCOUNTANT
- Voucher inbox, journal entries and approval queue.
- Cash/bank receipts and payments.
- Supplier/customer ledgers and due aging.
- Expense claims and payment requests.
- Chart of accounts, trial balance, P&L, balance sheet and cash flow.
- Bank reconciliation and period closing.
- Tax/VAT configuration and reports as enabled.
- Financial figures, posting and reversal actions controlled by explicit permissions.

### SALES_MANAGER / SALES_OFFICER
- Customer directory, price lists and credit limits.
- Quotations, sales orders, invoices and returns.
- Available-to-promise stock and batch/brand selection.
- Dispatch planning, challan and delivery status.
- Customer receipts, outstanding dues and collection follow-up.
- Sales margin only when permission allows.

### DISPATCH_OFFICER
- Approved dispatch queue.
- Pick list, stock allocation and batch selection.
- Vehicle/driver assignment, loading checklist and delivery challan.
- Loaded quantity, dispatch confirmation and proof of delivery.
- Short/excess loading exception workflow.

### HR_MANAGER / HR_OFFICER
- Employee directory, departments, shifts and attendance.
- Leave, overtime, payroll preparation and approval.
- Employee documents and expiry alerts.
- Role-appropriate access to salary and personal information.

### MAINTENANCE / DRIVER / AUDITOR / VIEWER
- Maintenance: machine register, preventive schedule, breakdown tickets, spare parts and downtime.
- Driver: assigned trips, vehicle checklist, delivery status and fuel/expense submission only.
- Auditor: read-only access to authorized records, documents, audit trail and reports; no edit/post/delete.
- Viewer: read-only access only to explicitly assigned modules and data scope.

## 84.4 Dynamic RBAC and Data Scope

Implement permission-based frontend and backend authorization.

- Support multiple roles per user where configured.
- Support custom roles and permission templates.
- Permissions must be action-level: CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, POST, REVERSE, PRINT, EXPORT, VIEW_FINANCIAL, VIEW_COST, VIEW_SENSITIVE, MANAGE_SETTINGS.
- Apply permissions to modules, routes, pages, tabs, fields, buttons, bulk actions, exports, reports and APIs.
- Support company, factory, department, godown and assigned-record scope.
- Hide unavailable actions and explain restricted access when appropriate.
- Never rely on frontend hiding alone; NestJS guards/policies must enforce every protected API.
- Default deny when no permission is granted.
- Sensitive permission changes must be audited and optionally require approval.
- Users must not gain broader access by changing URL, request payload, query parameters or factory IDs.
- A user with no financial permission must not receive financial values in API responses, exports, logs or hidden frontend state.

## 84.5 Role-Based Navigation

Create navigation groups based on the user's actual permissions:
- Dashboard
- Procurement
- Gate & Weighbridge
- Quality
- Inventory & Godowns
- Drying & Parboiling
- Production
- Packaging
- Sales & Dispatch
- Accounts & Finance
- HR & Payroll
- Maintenance
- Reports & Analytics
- Approvals
- Administration
- Settings

Only show groups and menu items the user can access. Keep menu labels understandable to non-technical factory staff. Allow favorites and recently visited pages.

---

# 85. MATURITY BENCHMARK: ESTABLISHED ERP CAPABILITY PARITY

Use publicly available workflows and feature concepts from established ERP, accounting, inventory, manufacturing and rice-mill software as a benchmark. Relevant reference categories include rice-mill-specific systems and mature ERP products such as Odoo, ERPNext, SAP Business One, Microsoft Dynamics 365 Business Central and other established manufacturing/accounting systems.

This is a capability benchmark, not a request to clone products. Do not claim a feature is implemented merely because it appears in this prompt. Build, test and document each feature.

## 85.1 ERP Foundation Capabilities

Include:
- Multi-company, multi-branch, multi-factory and multi-warehouse support.
- Configurable fiscal year, accounting period and period lock.
- Configurable numbering series by company, factory, module and financial year.
- Custom fields, configurable forms and master-data attributes.
- Approval rules based on amount, role, factory, transaction type and risk.
- Document attachments, comments, internal notes and activity timeline.
- Global search across authorized records.
- Saved views, filters, sorting, column chooser and personal preferences.
- Import/export with validation, duplicate detection and error reports.
- Configurable notifications, reminders and escalation rules.
- Audit trail for critical records and configuration changes.
- Data retention, archival and restore strategy.
- API integration framework, webhooks and scheduled synchronization.
- Localization, time zone, date/number formats and currency support.

## 85.2 Advanced Procurement and Paddy Trading

Include:
- Supplier/farmer/broker onboarding, KYC/document records and duplicate checks.
- Supplier category, location, bank details, payment terms and credit balance.
- Purchase requisition, quotation request, supplier quotation comparison and purchase order.
- Rate contracts, seasonal price lists and negotiated price history.
- Advance payments, deposits, deductions, commissions and settlement.
- Expected delivery schedule and vehicle appointment.
- Purchase return, quality rejection, short weight and claim handling.
- Lot-level landed cost and traceability from supplier to finished rice.
- Supplier rating using quality, delivery reliability, rejection and price history.
- Purchase budget and variance monitoring.
- Configurable moisture/quality deduction slabs with effective dates and approval controls.
- Every deduction must show source reading, applied rule, formula, quantity impact and amount impact.

## 85.3 Advanced Inventory and Warehouse Management

Include:
- Real-time stock ledger and stock balance by company, factory, godown, stack, item, batch, lot, variety and ownership.
- Multiple units of measure and controlled conversion factors.
- FIFO, weighted average or other configured valuation methods where accounting policy permits.
- Reservations, allocations, replenishment alerts and stock availability.
- Inter-godown and inter-factory transfer with in-transit status and receiving confirmation.
- Stock adjustment with reason, evidence and approval.
- Physical stock count, cycle count, blind count and variance analysis.
- Negative stock prevention by default, with controlled exception policy if enabled.
- Batch/lot genealogy and complete traceability.
- Stock aging, dead stock, slow-moving stock and capacity utilization.
- Separate customer-owned toll-milling inventory from company-owned inventory.
- Reconciliation between stock subledger and general ledger.
- No direct stock quantity edit: all quantity changes must be traceable inventory transactions.

## 85.4 Advanced Manufacturing and Rice Recovery

Include:
- Configurable bill of materials/process recipes and production routes.
- Production planning by order, forecast, capacity and available paddy.
- Shift-wise work orders and production scheduling.
- Multiple production lines, machines and work centers.
- Planned vs actual input, output, by-product, moisture loss and process loss.
- Configurable recovery standards by paddy variety, crop year, quality, process and factory.
- Production yield variance, downtime, OEE where machine data is available, and reason codes.
- By-product generation and valuation (bran, husk, broken rice, rejected material and other configured outputs).
- Rework, reprocessing, repacking and quality hold.
- Batch genealogy from paddy lot through finished rice and dispatch.
- Production cost allocation for labor, power, fuel, machine, overhead and packaging.
- Machine and line capacity planning.
- Production order closure only after input/output and inventory reconciliation.
- Never hard-code a universal recovery percentage or moisture deduction formula.

## 85.5 Advanced Sales and Distribution

Include:
- Customer onboarding, credit profile, credit limit and payment terms.
- Multiple price lists, customer-specific pricing, discounts and promotions.
- Quotation → sales order → reservation/picking → invoice → dispatch → receipt workflow.
- Partial delivery, backorder and split shipment.
- Dealer/distributor hierarchy, territory and sales representative assignment.
- Sales return, replacement, credit note and debit note.
- Delivery challan, loading list, vehicle and driver assignment.
- Proof of delivery and delivery exception records.
- Customer aging, collection forecast and overdue reminders.
- Margin analysis by product, brand, customer, invoice, factory and sales person where permitted.
- Prevent unauthorized sales beyond credit limit or available stock unless approved.

## 85.6 Advanced Finance and Accounting Controls

Implement proper double-entry accounting, not just cash-in/cash-out summaries.

- Configurable chart of accounts and accounting dimensions.
- Journal, payment, receipt, contra, debit note, credit note and adjustment vouchers.
- Automatic accounting mappings for procurement, inventory, production, sales, expenses and payroll.
- Accounts receivable/payable subledgers and reconciliation.
- Cash and bank book, bank reconciliation and outstanding cheque tracking where applicable.
- Trial balance, profit and loss, balance sheet, cash flow and general ledger.
- Cost centers, departments, factories, projects and other configurable dimensions.
- Budget vs actual and expense controls.
- Period closing, year-end closing and opening balances.
- Voucher approval, posting, reversal and audit history.
- Posted vouchers must never be silently edited or deleted.
- Every reversal must reference the original transaction and preserve the audit trail.
- Enforce debit = credit for every posted journal.
- Reconcile inventory valuation, supplier/customer balances and fixed asset balances with the general ledger.

## 85.7 Costing, Profitability and Management Accounting

Provide configurable costing methods and transparent calculation details.

Calculate and report:
- Purchase cost per KG/MON/TON and per lot.
- Landed cost including freight, loading, unloading, commission and other approved charges.
- Paddy-to-rice conversion cost by production batch.
- By-product credit/value allocation.
- Packaging, labor, power, fuel, repair and overhead allocation.
- Finished rice cost per KG, bag and brand.
- Sales gross profit and contribution margin.
- Profitability by lot, batch, product, brand, factory, customer, dealer and invoice.
- Actual vs standard cost and variance reasons.
- Toll-milling service income and customer-owned material reconciliation.

Every important result must allow drill-down to the source transactions and show the formula, input values, unit conversions, rule version and calculation timestamp.

## 85.8 Quality, Compliance and Traceability

Include:
- Configurable quality parameter templates by material and process.
- Sample registration, sample ID, test method, result, technician and timestamp.
- Quality hold, release, rejection, retest and approval workflow.
- Attachments for lab reports and certificates.
- Supplier/lot quality history and trend reports.
- Recall/traceability search from finished product to source paddy lot and vice versa.
- Configurable document expiry and compliance reminders.
- Record who tested, approved, changed or released every quality result.

## 85.9 Maintenance, Utilities and Factory Operations

Include:
- Machine, asset, line and equipment register.
- Preventive maintenance calendar and checklists.
- Breakdown tickets, priority, downtime and root-cause codes.
- Spare parts inventory and maintenance consumption.
- Repair cost and machine-wise maintenance history.
- Power, diesel, gas, water and other utility consumption.
- Production-wise energy cost and consumption trends.
- Shift handover, incident register and safety checklist.
- Planned vs unplanned downtime and maintenance KPI.

## 85.10 HR, Payroll and Workforce

Include:
- Employee records, departments, designations, employment status and documents.
- Shift/roster, attendance, overtime, leave and holiday calendar.
- Payroll components, allowances, deductions, advances and loans.
- Salary approval and payroll posting to accounts.
- Employee-wise access restrictions for confidential salary data.
- Attendance device/API integration as an optional adapter.
- Payroll register, payslip and statutory/configurable reports.

---

# 86. CLASSIC ENTERPRISE DESIGN SYSTEM

## 86.1 Visual Language

Use a timeless industrial/business visual style:
- Light neutral application background.
- White or near-white work surfaces.
- Dark charcoal/navy text with strong contrast.
- Restrained primary brand color for main actions and active navigation.
- Muted secondary colors for supporting information.
- Green only for success, amber for warning, red for error/danger and blue for informational states.
- Thin borders, subtle elevation and consistent spacing.
- Compact but readable typography.
- Avoid excessive gradients, glassmorphism, neon colors, oversized headings, huge dashboard cards, decorative animation and unnecessary whitespace.

The UI must look appropriate for a real rice mill office, factory control room and accounting department.

## 86.2 Design Tokens

Create centralized theme tokens for:
- Primary/secondary colors.
- Text primary/secondary/disabled.
- Background, surface and border.
- Success, warning, error and info.
- Typography scale and font weights.
- Spacing, border radius and elevation.
- Table row height and form control height.
- Responsive breakpoints.
- Focus ring and disabled states.

Use Material UI theme customization. Do not hard-code random colors, spacing or component styles across pages.

## 86.3 Tables and Data Grids

ERP tables are a primary work surface. Provide:
- Server-side pagination, sorting and filtering for large datasets.
- Search by relevant business fields.
- Column show/hide, resize and reorder where supported.
- Sticky headers and optional pinned important columns.
- Density options: compact, standard and comfortable.
- Saved filters and personal views.
- Date, number, currency, status and quantity formatting.
- Row selection and permission-controlled bulk actions.
- Export only authorized and filtered data.
- Row-level action menu with clear labels.
- Status chips with consistent meanings.
- Total/summary footer when useful.
- Empty, loading, error and no-permission states.
- Responsive alternative for mobile rather than forcing an unreadable wide table.

Never load an unlimited transaction history into the browser. Use server pagination and query filters.

## 86.4 Forms and Transaction Entry

All forms must be optimized for speed and accuracy:
- Group fields into logical sections.
- Use clear labels, examples, helper text and units.
- Mark required and optional fields.
- Validate on blur and submit with understandable messages.
- Preserve entered data after recoverable server errors.
- Support keyboard navigation and sensible tab order.
- Use autocomplete for large master-data lists.
- Provide quick-add master data only when permission allows.
- Show calculated values immediately, but recalculate and validate on the backend.
- Display calculation breakdowns for weight, moisture, deductions, tax, cost and recovery.
- Warn about duplicate documents, duplicate vehicle tickets and suspicious entries.
- Support draft save and resume for long transactions.
- Show unsaved changes and confirmation before leaving.
- Use confirmation dialogs for irreversible or high-impact actions.
- Never silently clear a completed form after a failed save.

## 86.5 Transaction Detail Pages

Every important business transaction must have:
- Header with unique transaction number, date, status and factory.
- Summary of key values and counterparties.
- Clear status timeline.
- Related documents and attachments.
- Item/quantity/amount details.
- Linked inventory movements.
- Linked accounting vouchers.
- Notes and activity timeline.
- Created by, updated by, approved by and posted by information.
- Print, export, edit, approve, reject, post, reverse and cancel actions only when allowed.
- Related records and drill-down links.
- Full audit history for authorized users.

## 86.6 Dashboards and Analytics

Dashboards must be actionable, not decorative:
- Show only role-authorized KPIs.
- Allow date range, company, factory and product filters.
- Provide drill-down from KPI to underlying records.
- Clearly distinguish current, previous period, target and variance.
- Show data freshness and last update time.
- Provide alerts and exceptions that require action.
- Avoid charts without business meaning.
- Include accessible table alternatives for charts.
- Do not expose restricted financial metrics to non-financial roles.

## 86.7 Language and Accessibility

- Full Bangla and English interface.
- Consistent translation keys; no scattered hard-coded UI labels.
- Correct Bangla font rendering and printable Bangla documents.
- User-selectable language and date/number formatting.
- Support keyboard-only use, visible focus, semantic labels and accessible contrast.
- Do not communicate status using color alone.
- Provide clear terminology and optional field-level guidance for non-technical users.

---

# 87. WORKFLOW ENGINE, APPROVALS AND EXCEPTIONS

Build a configurable workflow engine rather than hard-coding one approval path.

Support:
- Approval levels based on role, amount, transaction type, factory and risk.
- Sequential and parallel approvals where appropriate.
- Delegation and temporary approver assignment with audit.
- Approval reminders, escalation and overdue queues.
- Approve, reject, return for correction and request clarification.
- Mandatory rejection/return reasons.
- Separation of duties for sensitive actions.
- Maker-checker control for payment, stock adjustment, journal posting and master-data changes.
- Approval history with timestamps and comments.
- Emergency override only for authorized roles, with mandatory reason and audit.
- Configurable thresholds and effective dates.

Define explicit state machines for each major document. At minimum consider DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, POSTED, PARTIALLY_COMPLETED, COMPLETED, CANCELLED, REVERSED and LOCKED where relevant.

Do not use every status for every document if it does not fit the business process. Document the valid transitions and enforce them on the backend.

Create an exception center for:
- Weighbridge mismatch.
- Duplicate vehicle/ticket/document.
- Quality hold or rejection.
- Stock shortage or negative stock attempt.
- Capacity exceeded.
- Production recovery outside configured tolerance.
- Sales beyond credit limit.
- Unbalanced accounting voucher.
- Payment mismatch.
- Failed integration or synchronization.
- Overdue approval and document expiry.

Every exception must have an owner, priority, reason, status, due date and resolution history.

---

# 88. DOCUMENTS, PRINTING AND COMMUNICATION

Provide:
- Configurable A4 and thermal print layouts.
- Company/factory logo, address and authorized signature blocks.
- Purchase order, gate pass, weighbridge ticket, GRN, quality report, stock transfer, production report, sales invoice, delivery challan, payment receipt and voucher printouts.
- PDF, Excel and CSV exports subject to permission.
- Bangla and English print templates.
- Document numbering and reprint tracking.
- Email/SMS/WhatsApp integration through configurable providers where legally and technically available.
- Notification templates and delivery logs.
- Attachment preview and secure download.
- File type/size validation, malware scanning where supported and access-controlled storage.
- Never expose private document URLs publicly.

---

# 89. INTEGRATIONS AND DEVICE READINESS

Design adapter-based integrations so providers can be changed without rewriting business logic.

Potential integrations:
- Digital weighbridge indicators and serial/USB/network scale interfaces.
- Barcode/QR label printing and scanning.
- Attendance devices.
- Accounting/banking statement import.
- SMS, email and messaging gateways.
- E-commerce/dealer ordering portals.
- Government/tax systems only where an official supported API exists.
- BI/data warehouse export.
- External ERP/accounting system import/export.

For each integration provide:
- Configuration and credential security.
- Connection test.
- Mapping and validation.
- Retry with idempotency.
- Error queue and manual replay.
- Request/response audit with sensitive data redaction.
- Health status and last successful sync.
- Sandbox/test mode where provider supports it.

Do not pretend a device or external API is connected until a real integration is configured and tested. Provide manual fallback workflows with operator identity and reason.

---

# 90. SECURITY, RELIABILITY AND DATA GOVERNANCE

Include:
- Secure authentication, refresh token rotation and session revocation.
- Optional MFA/OTP based on policy.
- Role and data-scope authorization on every backend endpoint.
- Rate limiting, input validation and secure headers.
- CSRF protection where cookie-based authentication is used.
- Protection against SQL injection, XSS, IDOR and insecure file access.
- Encryption in transit and secure secret management.
- Sensitive field masking and access logging.
- Audit log tamper resistance and restricted deletion.
- Database backup, restore drills and disaster recovery documentation.
- Monitoring, structured logs, error tracking and health checks.
- Idempotency keys for payment, posting and integration endpoints.
- Transactional consistency for inventory and accounting postings.
- Concurrency control to prevent duplicate posting and overselling.
- Database constraints and indexes for critical business invariants.
- Soft delete only for eligible master data; never erase posted financial or stock history.
- Data export and tenant isolation policies.
- Retention and privacy settings configurable to applicable law and business policy.

---

# 91. REPORTING, BI AND MANAGEMENT CONTROL

Provide a searchable report center with:
- Role-aware report catalog.
- Date, company, factory, product, supplier, customer and status filters as relevant.
- Saved report filters and scheduled reports.
- Drill-down to source transactions.
- Export permission checks.
- Report definitions and calculation documentation.
- Data freshness indicator.
- Reconciliation reports and exception reports.

Minimum management reports:
- Paddy purchase register and rate analysis.
- Supplier/farmer ledger and aging.
- Weighbridge register and weight variance.
- Quality/moisture and deduction analysis.
- Godown/stack stock and aging.
- Stock ledger and valuation.
- Drying/parboiling input/output.
- Production register, recovery and yield variance.
- By-product generation and valuation.
- Packaging consumption.
- Sales register, customer ledger and aging.
- Dispatch and delivery performance.
- Cash/bank book and bank reconciliation.
- Expense register and budget variance.
- Trial balance, P&L, balance sheet and cash flow.
- Factory-wise profitability and capacity utilization.
- Machine downtime, maintenance and utility consumption.
- Audit, approval and user activity reports.

Reports must reconcile to source ledgers. A dashboard number and its detailed report must use the same calculation and filter logic.

---

# 92. QUALITY ASSURANCE AND ACCEPTANCE GATES

Do not consider a module complete because its page renders.

For every module, require:
1. Business workflow documentation.
2. Role and permission matrix.
3. Database schema and migration.
4. Backend service and API validation.
5. Frontend list, detail, create/edit and workflow screens as applicable.
6. Loading, empty, error, success and permission-denied states.
7. Audit events.
8. Inventory and accounting impact where applicable.
9. Print/export output where applicable.
10. Unit, integration and end-to-end tests.
11. Seed data and a repeatable demo workflow.
12. User documentation.

Test scenarios must include:
- Unauthorized user and cross-factory access attempts.
- Duplicate requests and concurrent posting.
- Partial receipt, partial dispatch and partial payment.
- Cancelled and reversed transactions.
- Stock transfer in transit.
- Quality hold/release/rejection.
- Unit conversion and rounding.
- Moisture deduction boundary values.
- Production recovery variance.
- Customer credit limit.
- Supplier/customer opening balances.
- Accounting debit/credit balance.
- Inventory valuation vs general ledger reconciliation.
- Bangla/English display and printing.
- Large data volumes and slow network conditions.
- Backup restore and migration rollback.

Create automated tests for critical calculations and financial invariants. Use realistic seed scenarios and expected outputs. Do not use fake production data in a live environment.

---

# 93. GAP ANALYSIS AND FEATURE COMPLETENESS REGISTER

Maintain a living feature register for the entire ERP.

For every requirement record:
- Requirement ID and business area.
- User role(s).
- Business problem solved.
- Workflow and edge cases.
- Frontend screens.
- Backend modules/APIs.
- Database entities.
- Permission requirements.
- Inventory impact.
- Accounting impact.
- Reports and printouts.
- Integrations.
- Tests and acceptance criteria.
- Implementation status: NOT_STARTED, DESIGNED, IN_PROGRESS, IMPLEMENTED, TESTED, ACCEPTED.
- Known limitations and future dependencies.

Before implementation:
- Compare the master requirements against the feature register.
- Identify missing modules, missing workflows, missing reports, missing permissions and missing exception paths.
- Record assumptions instead of silently inventing business rules.
- Ask only for decisions that materially affect accounting, legal compliance, stock ownership or operational policy.
- Use configurable settings for legitimate business variations.

Before each release:
- Run a gap review across procurement, gate, weighbridge, quality, inventory, production, by-products, packaging, sales, dispatch, payments, accounting, HR, maintenance, reports, security and integrations.
- Verify that all critical end-to-end workflows work across modules.
- Verify role-specific dashboards and permissions using test accounts.
- Verify that no page, button or report is a non-functional placeholder.
- Publish a known-limitations list; never claim “100% complete” without evidence.

The goal is to minimize functional gaps through systematic discovery, implementation and testing. No software prompt can guarantee that no gap exists; use the register, stakeholder validation, pilot testing and release gates to discover and close gaps.

---

# 94. IMPLEMENTATION PRIORITY AND DELIVERY RULES

Build in controlled phases while preserving the complete architecture.

Suggested sequence:
- Phase 1: architecture, database foundation, authentication, tenant/company/factory, RBAC, audit, settings and design system.
- Phase 2: masters, suppliers, customers, godowns, stacks, products, units and opening balances.
- Phase 3: gate, weighbridge, quality, procurement, GRN and supplier ledger.
- Phase 4: inventory ledger, transfers, counts, valuation and warehouse operations.
- Phase 5: drying, parboiling, production, recovery, by-products, packaging and maintenance.
- Phase 6: sales, dispatch, returns, receipts and customer ledger.
- Phase 7: accounting automation, financial statements, costing and profitability.
- Phase 8: HR/payroll, integrations, advanced analytics and scheduled reports.
- Phase 9: security hardening, performance, migration, backup/restore, UAT and production deployment.

For each phase:
- Deliver working code, migrations, API documentation, UI screens, tests and setup instructions.
- Keep frontend and backend independently runnable.
- Maintain a clear README and environment variable examples.
- Use Docker Compose for local development where practical.
- Include seed scripts and test users with documented roles.
- Never commit real passwords, API keys or production secrets.
- Do not replace a working feature with a mock implementation.
- Do not mark unfinished modules as complete.
- Maintain backward-compatible migrations or document breaking changes.
- Keep a change log and implementation status.

## Final Product Standard

The finished Rice Mill ERP must combine the depth of a specialized rice-mill operations system with the control, traceability and usability expected from a mature manufacturing and accounting ERP.

It must be practical for a small traditional mill and scalable for a multi-factory integrated rice business. It must serve owners, managers, accountants and factory operators through distinct role-based experiences while maintaining one consistent, secure and auditable source of truth.

Prioritize correctness, traceability, ease of daily use, clear exception handling and reliable reporting over visual decoration or feature-count marketing.
