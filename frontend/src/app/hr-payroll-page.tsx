'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface HrPayrollPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

export function HrPayrollPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: HrPayrollPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Employees, 1: Attendance, 2: Loans/Advances, 3: Payroll

  // Dialogs
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [printPayroll, setPrintPayroll] = useState<any | null>(null);

  // Forms
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empNid, setEmpNid] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('MILLING');
  const [empDesig, setEmpDesig] = useState('Mill Operator');
  const [empJoinDate, setEmpJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [empSalary, setEmpSalary] = useState('25000');
  const [empPaymentMode, setEmpPaymentMode] = useState('BANK');

  // Attendance Form
  const [attEmpId, setAttEmpId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState('PRESENT');
  const [attOvertime, setAttOvertime] = useState('0');

  // Loan Form
  const [loanEmpId, setLoanEmpId] = useState('');
  const [loanType, setLoanType] = useState('ADVANCE');
  const [loanAmount, setLoanAmount] = useState('5000');
  const [loanMonthly, setLoanMonthly] = useState('1000');

  // Payroll Form
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Queries
  const employeesQuery = useQuery({
    queryKey: ['hr-employees', companyId],
    queryFn: async () => {
      return apiRequest<any[]>(`/hr/employees?companyId=${companyId}`);
    },
    enabled: Boolean(companyId),
  });

  const payrollQuery = useQuery({
    queryKey: ['hr-payroll', companyId],
    queryFn: async () => {
      return apiRequest<any[]>(`/hr/payroll?companyId=${companyId}`);
    },
    enabled: Boolean(companyId),
  });

  const employees = employeesQuery.data || [];
  const payrolls = payrollQuery.data || [];

  const openEmployeeDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setEmployeeDialogOpen(true);
  };

  const openAttendanceDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setAttendanceDialogOpen(true);
  };

  const openLoanDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setLoanDialogOpen(true);
  };

  const openPayrollDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setPayrollDialogOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'empCode', label: isBn ? 'কর্মচারী কোড' : 'Employee Code', value: empCode, required: true },
        { name: 'empName', label: isBn ? 'পূর্ণ নাম' : 'Full Name', value: empName, required: true },
        { name: 'empDept', label: isBn ? 'বিভাগ' : 'Department', value: empDept, required: true },
        { name: 'empDesig', label: isBn ? 'পদবী' : 'Designation', value: empDesig, required: true },
        { name: 'empJoinDate', label: isBn ? 'যোগদানের তারিখ' : 'Joining Date', value: empJoinDate, required: true, type: 'date' },
        { name: 'empSalary', label: isBn ? 'মাসিক মূল বেতন (৳)' : 'Monthly Base Salary (৳)', value: empSalary, required: true, type: 'positiveNumber' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      await apiRequest('/hr/employees', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          employeeCode: empCode.trim(),
          fullName: empName.trim(),
          nid: empNid.trim() || undefined,
          phone: empPhone.trim() || undefined,
          department: empDept.trim(),
          designation: empDesig.trim(),
          joiningDate: empJoinDate,
          baseSalary: Number(empSalary),
          paymentMode: empPaymentMode,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setEmployeeDialogOpen(false);
      onSaved(isBn ? 'কর্মকর্তা/কর্মচারী সফলভাবে যোগ করা হয়েছে' : 'Employee added successfully');
      setEmpCode('');
      setEmpName('');
      setEmpNid('');
      setEmpPhone('');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to create employee');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'attEmpId', label: isBn ? 'কর্মচারী নির্বাচন করুন' : 'Select Employee', value: attEmpId, required: true, isSelect: true },
        { name: 'attDate', label: isBn ? 'তারিখ' : 'Date', value: attDate, required: true, type: 'date' },
        { name: 'attStatus', label: isBn ? 'উপস্থিতি স্ট্যাটাস' : 'Attendance Status', value: attStatus, required: true, isSelect: true },
        { name: 'attOvertime', label: isBn ? 'অতিরিক্ত কর্মঘণ্টা' : 'Overtime Hours', value: attOvertime || '0', type: 'nonNegativeNumber' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      await apiRequest('/hr/attendance', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          employeeId: attEmpId,
          date: attDate,
          status: attStatus,
          overtimeHours: Number(attOvertime) || 0,
        }),
      });
      setAttendanceDialogOpen(false);
      onSaved(isBn ? 'উপস্থিতি ও ওভারটাইম সফলভাবে নথিভুক্ত হয়েছে' : 'Attendance recorded successfully');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to record attendance');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'loanEmpId', label: isBn ? 'কর্মচারী' : 'Employee', value: loanEmpId, required: true, isSelect: true },
        { name: 'loanType', label: isBn ? 'ধরনের' : 'Type', value: loanType, required: true, isSelect: true },
        { name: 'loanAmount', label: isBn ? 'মঞ্জুরিকৃত পরিমাণ (৳)' : 'Principal Amount (৳)', value: loanAmount, required: true, type: 'positiveNumber' },
        { name: 'loanMonthly', label: isBn ? 'মাসিক কর্তন (৳)' : 'Monthly Deduction (৳)', value: loanMonthly, required: true, type: 'positiveNumber' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      await apiRequest('/hr/loans', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          employeeId: loanEmpId,
          type: loanType,
          principalAmount: Number(loanAmount),
          monthlyDeduction: Number(loanMonthly),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setLoanDialogOpen(false);
      onSaved(isBn ? 'অগ্রিম/ঋণ সফলভাবে মঞ্জুর হয়েছে' : 'Loan/Advance disbursed successfully');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to record loan');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [{ name: 'payrollMonth', label: isBn ? 'মাস ও বছর' : 'Month & Year', value: payrollMonth, required: true }],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      await apiRequest('/hr/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          monthYear: payrollMonth,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['hr-payroll'] });
      setPayrollDialogOpen(false);
      onSaved(isBn ? `${payrollMonth} মাসের বেতন তালিকা প্রস্তুত হয়েছে` : `Payroll generated for ${payrollMonth}`);
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to generate payroll');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handlePostPayroll = async (id: string) => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিত যে এই বেতন তালিকাটি পোস্ট করে দ্বৈত হিসাব লেজারে এন্ট্রি দিতে চান?' : 'Are you sure you want to post this payroll to the General Ledger?')) return;
    setBusy(true);
    try {
      await apiRequest(`/hr/payroll/${id}/post`, {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });
      await queryClient.invalidateQueries({ queryKey: ['hr-payroll'] });
      onSaved(isBn ? 'বেতন তালিকা সফলভাবে পোস্ট ও সমন্বিত হয়েছে' : 'Payroll posted and ledger entries generated');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to post payroll'));
    } finally {
      setBusy(false);
    }
  };

  // KPI Calculations
  const totalEmployees = employees.length;
  const totalSalaryCommitment = employees.reduce((acc, e) => acc + Number(e.baseSalary || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <BadgeRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'এইচআর ও পেরোল ব্যবস্থাপনা (HR & Payroll)' : 'HR Management & Payroll'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'কর্মকর্তা-কর্মচারী প্রোফাইল, উপস্থিতি, ওভারটাইম, বেতন অগ্রিম ও দ্বৈত হিসাব পেরোল ডিসবার্সমেন্ট'
              : 'Employee master, attendance, overtime tracking, salary advances, and automated double-entry payroll.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              employeesQuery.refetch();
              payrollQuery.refetch();
            }}
          >
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccessTimeRoundedIcon />}
            onClick={openAttendanceDialog}
          >
            {isBn ? 'উপস্থিতি ও ওভারটাইম' : 'Record Attendance'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceWalletRoundedIcon />}
            onClick={openLoanDialog}
          >
            {isBn ? 'অগ্রিম / লোন' : 'Disburse Advance'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PaymentsRoundedIcon />}
            onClick={openPayrollDialog}
          >
            {isBn ? 'নতুন পেরোল তৈরি' : 'Generate Payroll'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddRoundedIcon />}
            onClick={openEmployeeDialog}
          >
            {isBn ? 'নতুন কর্মচারী' : 'Add Employee'}
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#f0fdf4' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মোট সক্রিয় কর্মচারী' : 'TOTAL ACTIVE EMPLOYEES'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#166534">
              {totalEmployees}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#eff6ff' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মাসিক মূল বেতন দায়' : 'MONTHLY BASE SALARY'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#1e40af">
              ৳ {totalSalaryCommitment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#faf5ff' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'সর্বশেষ পেরোল রান' : 'LATEST PAYROLL'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#6b21a8">
              {payrolls[0]?.monthYear || 'None'}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#fffbeb' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'সর্বশেষ নিট বেতন বিতরণ' : 'LAST NET DISBURSED'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#b45309">
              ৳ {payrolls[0] ? Number(payrolls[0].totalNetSalary).toLocaleString() : '0.00'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab icon={<BadgeRoundedIcon />} iconPosition="start" label={isBn ? 'কর্মকর্তা তালিকা (Employees)' : 'Employees Master'} />
          <Tab icon={<PaymentsRoundedIcon />} iconPosition="start" label={isBn ? 'মাসিক পেরোল ও বেতন শিট' : 'Monthly Payroll Sheets'} />
        </Tabs>
      </Paper>

      {/* Tab 0: Employees Master Table */}
      {activeTab === 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Employee Code</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Full Name</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Phone / NID</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Joining Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Base Salary</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Payment Mode</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'কোন কর্মচারী পাওয়া যায়নি। নতুন কর্মচারী যোগ করুন।' : 'No employees found. Click Add Employee to register.'}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{emp.employeeCode}</TableCell>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={emp.fullName}>{emp.fullName}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={emp.department} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{emp.designation}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{emp.phone || emp.nid || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      ৳ {Number(emp.baseSalary).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{emp.paymentMode}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        size="small"
                        color={emp.active ? 'success' : 'default'}
                        label={emp.active ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 1: Monthly Payrolls */}
      {activeTab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Payroll #</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Month</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Employees</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Base Salary</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Overtime</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Bonus</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Deductions</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Net Salary</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'কোন পেরোল রেকর্ড পাওয়া যায়নি। উপরের বাটনে ক্লিক করে পেরোল তৈরি করুন।' : 'No payroll records found. Click Generate Payroll to start.'}
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.payrollNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.monthYear}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{p.totalEmployees}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(p.totalBaseSalary).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>+ ৳ {Number(p.totalOvertime).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'info.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>+ ৳ {Number(p.totalBonus).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>- ৳ {Number(p.totalDeductions).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', fontSize: 14, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      ৳ {Number(p.totalNetSalary).toLocaleString()}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        size="small"
                        color={p.status === 'POSTED' ? 'success' : 'warning'}
                        label={p.status}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PrintRoundedIcon />}
                          onClick={() => setPrintPayroll(p)}
                        >
                          {isBn ? 'শিট' : 'Slip'}
                        </Button>
                        {p.status === 'DRAFT' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleRoundedIcon />}
                            onClick={() => handlePostPayroll(p.id)}
                            disabled={busy}
                          >
                            {isBn ? 'পোস্ট' : 'Post'}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Add Employee Dialog */}
      {/* Add Employee Dialog */}
      <FormDialog
        open={employeeDialogOpen}
        onClose={() => !busy && setEmployeeDialogOpen(false)}
        onSubmit={handleCreateEmployee}
        title={isBn ? 'নতুন কর্মকর্তা/কর্মচারী নিবন্ধন' : 'Register New Employee'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ' : 'Save'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppTextField
            fieldName="empCode"
            required
            label={isBn ? 'কর্মচারী কোড' : 'Employee Code'}
            value={empCode}
            errorText={fieldErrors.empCode}
            onValueChange={(val) => {
              setEmpCode(val);
              setFieldErrors((p) => ({ ...p, empCode: '' }));
            }}
          />
          <AppTextField
            fieldName="empName"
            required
            label={isBn ? 'পূর্ণ নাম' : 'Full Name'}
            value={empName}
            errorText={fieldErrors.empName}
            onValueChange={(val) => {
              setEmpName(val);
              setFieldErrors((p) => ({ ...p, empName: '' }));
            }}
          />
          <AppTextField
            fieldName="empNid"
            label={isBn ? 'এনআইডি (NID)' : 'National ID'}
            value={empNid}
            onValueChange={(val) => setEmpNid(val)}
          />
          <AppTextField
            fieldName="empPhone"
            label={isBn ? 'ফোন নম্বর' : 'Phone'}
            value={empPhone}
            onValueChange={(val) => setEmpPhone(val)}
          />
          <AppTextField
            fieldName="empDept"
            required
            label={isBn ? 'বিভাগ' : 'Department'}
            value={empDept}
            errorText={fieldErrors.empDept}
            onValueChange={(val) => {
              setEmpDept(val);
              setFieldErrors((p) => ({ ...p, empDept: '' }));
            }}
          />
          <AppTextField
            fieldName="empDesig"
            required
            label={isBn ? 'পদবী' : 'Designation'}
            value={empDesig}
            errorText={fieldErrors.empDesig}
            onValueChange={(val) => {
              setEmpDesig(val);
              setFieldErrors((p) => ({ ...p, empDesig: '' }));
            }}
          />
          <AppTextField
            fieldName="empJoinDate"
            type="date"
            required
            label={isBn ? 'যোগদানের তারিখ' : 'Joining Date'}
            value={empJoinDate}
            errorText={fieldErrors.empJoinDate}
            onValueChange={(val) => {
              setEmpJoinDate(val);
              setFieldErrors((p) => ({ ...p, empJoinDate: '' }));
            }}
            InputLabelProps={{ shrink: true }}
          />
          <AppTextField
            fieldName="empSalary"
            type="number"
            required
            prefixText="৳"
            label={isBn ? 'মাসিক মূল বেতন (৳)' : 'Monthly Base Salary (৳)'}
            value={empSalary}
            errorText={fieldErrors.empSalary}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setEmpSalary(val);
              setFieldErrors((p) => ({ ...p, empSalary: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>

      {/* Record Attendance Dialog */}
      <FormDialog
        open={attendanceDialogOpen}
        onClose={() => !busy && setAttendanceDialogOpen(false)}
        onSubmit={handleRecordAttendance}
        title={isBn ? 'উপস্থিতি ও ওভারটাইম নথিভুক্ত' : 'Record Attendance & Overtime'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ' : 'Record'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <FormGrid columns={1}>
          <AppAutocomplete
            fieldName="attEmpId"
            required
            label={isBn ? 'কর্মচারী নির্বাচন করুন' : 'Select Employee'}
            value={attEmpId}
            errorText={fieldErrors.attEmpId}
            options={employees.map((e) => ({
              value: e.id,
              label: e.fullName,
              badge: e.employeeCode,
            }))}
            emptyMessage={isBn ? 'কোনো কর্মচারী নেই — আগে কর্মচারী যোগ করুন' : 'No employees registered — add an employee first'}
            onChange={(val) => {
              setAttEmpId(val);
              setFieldErrors((p) => ({ ...p, attEmpId: '' }));
            }}
          />
          <AppTextField
            fieldName="attDate"
            type="date"
            required
            label={isBn ? 'তারিখ' : 'Date'}
            value={attDate}
            errorText={fieldErrors.attDate}
            onValueChange={(val) => {
              setAttDate(val);
              setFieldErrors((p) => ({ ...p, attDate: '' }));
            }}
            InputLabelProps={{ shrink: true }}
          />
          <AppSelect
            fieldName="attStatus"
            required
            label={isBn ? 'উপস্থিতি স্ট্যাটাস' : 'Attendance Status'}
            value={attStatus}
            errorText={fieldErrors.attStatus}
            options={[
              { value: 'PRESENT', label: 'PRESENT (উপস্থিত)' },
              { value: 'ABSENT', label: 'ABSENT (অনুপস্থিত)' },
              { value: 'LATE', label: 'LATE (দেরিতে উপস্থিতি)' },
              { value: 'LEAVE', label: 'LEAVE (ছুটি)' },
            ]}
            onChange={(val) => {
              setAttStatus(val);
              setFieldErrors((p) => ({ ...p, attStatus: '' }));
            }}
          />
          <AppTextField
            fieldName="attOvertime"
            type="number"
            unit="HRS"
            label={isBn ? 'অতিরিক্ত কর্মঘণ্টা (Overtime Hours)' : 'Overtime Hours'}
            value={attOvertime}
            errorText={fieldErrors.attOvertime}
            inputProps={{ min: 0, step: '.5' }}
            onValueChange={(val) => {
              setAttOvertime(val);
              setFieldErrors((p) => ({ ...p, attOvertime: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>

      {/* Disburse Loan/Advance Dialog */}
      <FormDialog
        open={loanDialogOpen}
        onClose={() => !busy && setLoanDialogOpen(false)}
        onSubmit={handleCreateLoan}
        title={isBn ? 'বেতন অগ্রিম ও ঋণ মঞ্জুর' : 'Disburse Advance / Loan'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'মঞ্জুর করুন' : 'Disburse'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <FormGrid columns={1}>
          <AppAutocomplete
            fieldName="loanEmpId"
            required
            label={isBn ? 'কর্মচারী' : 'Employee'}
            value={loanEmpId}
            errorText={fieldErrors.loanEmpId}
            options={employees.map((e) => ({
              value: e.id,
              label: e.fullName,
              badge: e.employeeCode,
            }))}
            emptyMessage={isBn ? 'কোনো কর্মচারী নেই — আগে কর্মচারী যোগ করুন' : 'No employees registered — add an employee first'}
            onChange={(val) => {
              setLoanEmpId(val);
              setFieldErrors((p) => ({ ...p, loanEmpId: '' }));
            }}
          />
          <AppSelect
            fieldName="loanType"
            required
            label={isBn ? 'ধরনের' : 'Type'}
            value={loanType}
            errorText={fieldErrors.loanType}
            options={[
              { value: 'ADVANCE', label: 'SALARY ADVANCE (বেতন অগ্রিম)' },
              { value: 'LOAN', label: 'STAFF LOAN (কর্মচারী ঋণ)' },
            ]}
            onChange={(val) => {
              setLoanType(val);
              setFieldErrors((p) => ({ ...p, loanType: '' }));
            }}
          />
          <AppTextField
            fieldName="loanAmount"
            type="number"
            required
            prefixText="৳"
            label={isBn ? 'মঞ্জুরিকৃত পরিমাণ (৳)' : 'Principal Amount (৳)'}
            value={loanAmount}
            errorText={fieldErrors.loanAmount}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setLoanAmount(val);
              setFieldErrors((p) => ({ ...p, loanAmount: '' }));
            }}
          />
          <AppTextField
            fieldName="loanMonthly"
            type="number"
            required
            prefixText="৳"
            label={isBn ? 'মাসিক কর্তন (৳)' : 'Monthly Deduction (৳)'}
            value={loanMonthly}
            errorText={fieldErrors.loanMonthly}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setLoanMonthly(val);
              setFieldErrors((p) => ({ ...p, loanMonthly: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>

      {/* Generate Payroll Dialog */}
      <FormDialog
        open={payrollDialogOpen}
        onClose={() => !busy && setPayrollDialogOpen(false)}
        onSubmit={handleGeneratePayroll}
        title={isBn ? 'মাসিক পেরোল তৈরি' : 'Generate Monthly Payroll'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'তৈরি করুন' : 'Generate'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <Typography variant="body2" color="text.secondary">
          {isBn
            ? 'সক্রিয় সকল কর্মচারীর জন্য উপস্থিতি, ওভারটাইম এবং অগ্রিম সমন্বয় করে স্বয়ংক্রিয়ভাবে নিট বেতন নির্ধারণ করা হবে।'
            : 'Automated calculation of base salaries, overtime rates, absent deductions, and loan repayments for all active personnel.'}
        </Typography>
        <AppTextField
          fieldName="payrollMonth"
          type="month"
          required
          label={isBn ? 'মাস ও বছর' : 'Month & Year'}
          value={payrollMonth}
          errorText={fieldErrors.payrollMonth}
          onValueChange={(val) => {
            setPayrollMonth(val);
            setFieldErrors((p) => ({ ...p, payrollMonth: '' }));
          }}
          InputLabelProps={{ shrink: true }}
        />
      </FormDialog>

      {/* Printable Payroll Sheet Modal */}
      {printPayroll && (
        <Dialog open={Boolean(printPayroll)} onClose={() => setPrintPayroll(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>
            MONTHLY SALARY SHEET & PAYROLL REGISTER ({printPayroll.monthYear})
          </DialogTitle>
          <DialogContent dividers>
            <Box mb={2} display="flex" justifyContent="space-between">
              <Typography variant="body2">Payroll #: <strong>{printPayroll.payrollNumber}</strong></Typography>
              <Typography variant="body2">Status: <strong>{printPayroll.status}</strong></Typography>
            </Box>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell align="right">Base</TableCell>
                  <TableCell align="right">OT Amount</TableCell>
                  <TableCell align="right">Bonus</TableCell>
                  <TableCell align="right">Deductions</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Net Salary</TableCell>
                  <TableCell align="center">Signature</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {printPayroll.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.employee?.fullName} ({line.employee?.employeeCode})</TableCell>
                    <TableCell align="right">৳ {Number(line.baseSalary).toLocaleString()}</TableCell>
                    <TableCell align="right">৳ {Number(line.overtimeAmount).toLocaleString()}</TableCell>
                    <TableCell align="right">৳ {Number(line.bonusAmount).toLocaleString()}</TableCell>
                    <TableCell align="right">৳ {Number(line.advanceDeduction + line.otherDeduction).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {Number(line.netSalary).toLocaleString()}</TableCell>
                    <TableCell align="center">_________________</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {Number(printPayroll.totalBaseSalary).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {Number(printPayroll.totalOvertime).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {Number(printPayroll.totalBonus).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {Number(printPayroll.totalDeductions).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>৳ {Number(printPayroll.totalNetSalary).toLocaleString()}</TableCell>
                  <TableCell align="center"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPrintPayroll(null)}>Close</Button>
            <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>Print Sheet</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

