# 45. HR Management & Payroll Specification & Implementation Guide

## 1. Business Workflow
In a large-scale rice milling facility, human capital spans permanent operational staff (mill operators, boiler/dryer operators, mechanics, electricians, weighbridge officers, lab technicians, accounts and admin staff) as well as daily shift wage labourers. Managing personnel profiles, attendance, overtime, advance disbursements, leave management, and monthly salary disbursement with full double-entry accounting integration is critical to workforce stability and compliance.

The workflow encompasses:
1. **Employee Master Directory**: Recording national identification (NID), emergency contact, department, designation, joining date, monthly base salary, daily rate, and payment method (Bank/MFS/Cash).
2. **Attendance & Shift Overtime**: Daily recording of presence, absence, late arrival, and extra operational overtime hours logged during peak harvest seasons.
3. **Staff Advances & Loans**: Disbursing emergency cash advances or long-term staff loans with scheduled monthly recovery deductions.
4. **Automated Net Salary Calculation**: Reconciling base pay + earned overtime + incentive bonuses - absent wage cuts - scheduled loan deductions = Net Disbursable Salary.
5. **Double-Entry General Ledger Posting**: When a payroll run is finalized and approved, the system generates a balanced journal voucher:
   - Debit: *Salaries and Wages Expense (6010)* for gross total earnings
   - Credit: *Employee Advances and Receivables (1040)* for advance deductions
   - Credit: *Salaries and Wages Payable (2030)* for net payable cash/bank obligation.

## 2. Database Entities
- **Employee**: Employee code, name, NID, phone, address, department, designation, joining date, base salary, payment mode, bank info, active flag.
- **Attendance**: Daily status (PRESENT, ABSENT, LATE, LEAVE), checkIn/checkOut timestamps, and overtime hours.
- **Leave**: Leave type (CASUAL, SICK, ANNUAL, UNPAID), start/end dates, approved days, and status.
- **EmployeeLoan**: Disbursed salary advance/loan principal, monthly deduction, running balance, and status (ACTIVE, CLOSED).
- **Payroll**: Monthly payroll header (monthYear, totalEmployees, totalBaseSalary, totalOvertime, totalBonus, totalDeductions, totalNetSalary, status: DRAFT/POSTED).
- **PayrollLine**: Itemized employee calculation line.

## 3. Relationships
- `Company` $\to$ `Employee` (1:N)
- `Factory` $\to$ `Employee` (1:N optional)
- `Employee` $\to$ `Attendance` (1:N cascade)
- `Employee` $\to$ `Leave` (1:N cascade)
- `Employee` $\to$ `EmployeeLoan` (1:N cascade)
- `Payroll` $\to$ `PayrollLine` (1:N cascade)
- `PayrollLine` $\to$ `Employee` (N:1)

## 4. Calculations & Math
1. **Daily & Hourly Rates**:
   $$\text{Daily Wage Rate} = \frac{\text{Base Monthly Salary}}{30}$$
   $$\text{Hourly Overtime Rate} = \left(\frac{\text{Daily Wage Rate}}{8}\right) \times 1.5$$
2. **Overtime Earnings**:
   $$\text{Overtime Amount} = \text{Overtime Hours} \times \text{Hourly Overtime Rate}$$
3. **Absent Deductions**:
   $$\text{Absent Deduction} = \text{Absent Days} \times \text{Daily Wage Rate}$$
4. **Advance / Loan Deductions**:
   $$\text{Loan Deduction} = \min(\text{Monthly Deduction Policy}, \text{Outstanding Loan Balance})$$
5. **Net Salary Formula**:
   $$\text{Gross Earnings} = \text{Base Salary} + \text{Overtime Amount} + \text{Bonus}$$
   $$\text{Total Deductions} = \text{Loan Deduction} + \text{Absent Deduction}$$
   $$\text{Net Salary} = \max(0, \text{Gross Earnings} - \text{Total Deductions})$$

## 5. Accounting Impact
Posting a payroll batch writes an automated journal:
$$\text{Debit: Salaries Expense (6010)} = \text{Credit: Advances (1040)} + \text{Credit: Salaries Payable (2030)}$$
Enforces strict double-entry equilibrium: Total Debit = Total Credit.

## 6. Inventory Impact
Does not directly affect inventory stock levels; payroll costs feed into the batch and factory overhead absorption engine (#44).

## 7. API Endpoints
All protected with RBAC permissions:
- `POST /hr/employees`: Register employee (`hr:CREATE`)
- `PUT /hr/employees/:id`: Update employee info (`hr:UPDATE`)
- `GET /hr/employees`: List employees with filters (`hr:READ`)
- `GET /hr/employees/:id`: Detailed employee dossier (`hr:READ`)
- `POST /hr/attendance`: Record shift attendance and overtime (`hr:CREATE`)
- `POST /hr/loans`: Disburse loan/advance (`hr:CREATE`)
- `POST /hr/payroll/generate`: Generate draft payroll (`hr:CREATE`)
- `POST /hr/payroll/:id/post`: Finalize, lock, and post payroll to GL (`hr:POST`)
- `GET /hr/payroll`: List payroll history (`hr:READ`)

## 8. Permissions
- `hr:CREATE`: Register personnel, log attendance, disburse advances, draft payroll.
- `hr:READ`: View employee directory and attendance logs.
- `hr:UPDATE`: Modify employee profile.
- `hr:POST`: Approve, lock, and disburse payroll to General Ledger.

## 9. Validation
- Unique employee code per company.
- Attendance date uniqueness per employee.
- Loan deductions cannot exceed remaining balance.
- Re-generation blocked once a payroll run is `POSTED`.

## 10. UI & Frontend Desk
- Built bilingual HR & Payroll Desk (`frontend/src/app/hr-payroll-page.tsx`).
- KPI Cards: Total Active Employees, Monthly Base Salary Obligation, Latest Payroll Run, Last Net Disbursed.
- Tabbed management: Employees Master & Monthly Payroll Sheets.
- Dialog modals: Add Employee, Record Attendance & Overtime, Disburse Advance, Generate Payroll, Printable Monthly Salary Sheet & Pay Slip.

## 11. Reports & Analytical Insights
- Monthly wage registers with department breakdown.
- Overtime cost tracking during harvest seasons.
- Advance and loan exposure tracking.

## 12. Tests
- Unit tests in `backend/src/modules/hr/hr.service.spec.ts`:
  - Employee creation and duplicate code guard.
  - Attendance upsert with overtime hours.
  - Advance loan creation and balance tracking.
  - Accurate Net Salary calculation with base, overtime, absent deductions, and loan recovery.
  - Automated GL posting with double-entry balance verification.
- Controller RBAC tests in `hr.controller.spec.ts`.
- 100% test pass rate (9/9 tests).

## 13. Implementation Details
- Schema Migration: `database/prisma/migrations/0032_hr_payroll`
- Service: `backend/src/modules/hr/hr.service.ts`
- Controller: `backend/src/modules/hr/hr.controller.ts`
- Module: `backend/src/modules/hr/hr.module.ts`
- UI Desk: `frontend/src/app/hr-payroll-page.tsx`

