# 57. BANGLADESH SUPPORT

## Status
Complete

## 1. Business workflow
- **Purpose and actors**: Provides deep enterprise localization for rice milling operations across Bangladesh, adhering to Bangladesh Bank monetary standards, BSTI weights and measurement norms, and National Board of Revenue (NBR) statutory tax mandates. Actors: Managing Directors, Plant Heads, Chief Financial Officers, Tax Accountants, Commercial Officers, Legal/Compliance Auditors.
- **Preconditions and source documents**: Builds upon company financial profiles, statutory SRO orders, procurement orders, commercial sales orders, freight transportation vouchers, and double-entry accounting ledgers.
- **Monetary & Measurement Standards**:
  - **Default Currency**: Bangladeshi Taka (`BDT` / `৳`), sub-unit Poisha (পয়সা). Formatting follows South Asian numbering syntax (Crore, Lakh, Hajar, Shotok).
  - **Supported Primary Units**: `KG` (Kilogram - primary SI base), `MON` (মণ - traditional grain arat benchmark), `TON` (মেট্রিক টন - commercial bulk), `BAG` (বস্তা - 50 KG finished rice packaging), `PIECE`, `LITER`.
  - **Configurable Unit Conversions**: Default conversion benchmark is `1 MON = 40.0 KG`, `1 TON = 1,000.0 KG`, and `1 BAG = 50.0 KG`. Per Promptdoc #57 specifications, unit conversions are strictly dynamic and configurable with effective date tracking; no hardcoded factors.
- **Configurable Tax System (VAT, AIT, TDS, VDS)**:
  - **No Hardcoded Tax Rates**: All tax calculations dynamically evaluate effective-date based rules.
  - **VAT (Value Added Tax / মূসক)**: Governed under Value Added Tax and Supplementary Duty Act 2012. Supports statutory exemptions on raw paddy and rice grain (e.g. SRO 182-Ain/2021/140-Mushak) and standard/reduced rates on by-products (bran, husk) or packaging materials.
  - **AIT (Advance Income Tax / অগ্রিম আয়কর)**: Withheld under Section 52 of the Income Tax Act 2023 on commercial supply of grains and raw materials.
  - **TDS (Tax Deducted at Source / উৎসে কর কর্তন)**: Statutory withholding tax on vendor payments, transport freight bills, and professional services.
  - **VDS (VAT Deducted at Source / উৎসে মূসক কর্তন)**: Withholding VAT deducted from contractor bills, workshop machinery maintenance, and procurement suppliers under NBR VDS General Orders.
  - **Effective Date Based Engine**: Automatically selects applicable tax percentages based on transaction date (`effectiveFrom <= asOf` and `effectiveTo >= asOf`), facilitating seamless transitions during national fiscal year budget changes (1st July).

## 2. Database entities
- Migration `0040_bangladesh_support` adds:
  - Enum `TaxType`: `VAT`, `AIT`, `TDS`, `VDS`.
  - Model `TaxConfig`:
    - `id`: CUID primary key
    - `companyId`: Multi-tenant isolation reference
    - `taxType`: `TaxType` enum
    - `name`: Human-readable rule title
    - `ratePercent`: Decimal(7, 4)
    - `effectiveFrom`: Date timestamp
    - `effectiveTo`: Optional sunset timestamp
    - `category`: Optional commodity or service tag (e.g., `PADDY`, `RICE`, `BY_PRODUCT`, `TRANSPORT`, `CONTRACTOR`)
    - `sroReference`: NBR statutory SRO reference
    - `description`: Regulatory guidance note
    - `active`: Boolean toggle
    - Unique constraint: `[companyId, taxType, category, effectiveFrom]`
    - Composite index: `[companyId, taxType, effectiveFrom, effectiveTo]`
- Utilizes existing `UnitConversion` model in Prisma schema for dynamic conversion factors.

## 3. Relationships
- **TaxConfig to Company**: Every tax configuration is strictly scoped to the tenant `companyId`.
- **UnitConversion to Company**: Maintained per company with audited historical adjustments.

## 4. Calculations
- **Dynamic Conversion Factor**:
  $$\text{Converted Quantity} = \text{Source Quantity} \times \text{Factor}_{\text{from} \to \text{to}}$$
  $$\text{Default: } 1 \text{ MON} = 40.0 \text{ KG} \implies \text{Quantity (KG)} = \text{Quantity (MON)} \times 40$$
- **Tax Amount per Component**:
  $$\text{Tax Amount} = \text{Base Amount} \times \left( \frac{\text{Effective Rate \%}}{100} \right)$$
- **Net Supplier / Vendor Settlement**:
  $$\text{Net Payable} = \text{Base Amount} + \text{VAT Amount} - \left( \text{AIT Amount} + \text{TDS Amount} + \text{VDS Amount} \right)$$

## 5. Accounting impact
- Configured tax percentages drive automated tax liability (`TAX_PAYABLE`) and withholding asset/liability accounts in the General Ledger. Withholding deductions (TDS, VDS, AIT) credit withholding payable accounts for NBR treasury challan deposit.

## 6. Inventory impact
- Ensures that metric conversions (e.g. purchasing raw paddy in Mon while issuing into production silos in KG) maintain strict mass-balance integrity without rounding creep.

## 7. API
- `GET /bangladesh/defaults?companyId=<id>`: Retrieves currency info, default conversion rules, and active tax metadata.
- `GET /bangladesh/tax-configs?companyId=<id>&taxType=<type>&asOf=<date>`: Queries active tax configurations valid for a given date.
- `POST /bangladesh/tax-configs`: Configures a new effective-date based tax rule.
- `POST /bangladesh/calculate-taxes`: Evaluates dynamic VAT, AIT, TDS, and VDS calculations for any given base amount and date.

## 8. Permissions
- `settings:READ`: View defaults and tax configurations.
- `settings:UPDATE`: Create and update tax rules and unit conversion factors.

## 9. Validation
- `CreateTaxConfigDto`: Validates required fields, non-negative rate percentages, and enforces `effectiveTo > effectiveFrom`.
- Duplicate rules for the same company, tax type, category, and start date are rejected via database unique constraints.

## 10. UI
- `frontend/src/app/bangladesh-config-page.tsx`:
  - **Currency & Localization Dashboard**: BDT symbol, format preview, metric units overview.
  - **Configurable Mon Conversion Panel**: Interactive widget to modify `1 MON = 40 KG` benchmark factor.
  - **Unit Conversions Register**: Tabular view of all active conversion factors.
  - **Configurable Tax Rules (VAT, AIT, TDS, VDS)**: Tax type filter tabs, SRO citations, effective date windows.
  - **Live Tax Calculation Simulator**: Interactive calculation sandbox testing base amount, commodity category, and withholding deductions.
  - Bilingual English/Bengali interface.

## 11. Reports / Outputs
- Supplies certified tax rates and unit conversion parameters to purchase invoices, weighbridge slips, sales invoices, and NBR VAT Mushak-6.3 reports.

## 12. Tests
- `backend/src/modules/bangladesh/bangladesh.service.spec.ts`: Unit tests validating defaults, tax rule creation, effective-date resolution, and multi-tax net payable calculations.
- `backend/src/modules/bangladesh/bangladesh.controller.spec.ts`: Controller endpoint delegation tests.
- 100% test pass rate across 8 unit tests.

## 13. Audit & Compliance
- Every tax configuration creation and modification is permanently recorded in the immutable `AuditEvent` table with user identity and before/after JSON payloads.

