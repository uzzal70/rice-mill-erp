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
  TextField,
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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      await apiRequest('/hr/employees', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          employeeCode: empCode,
          fullName: empName,
          nid: empNid || undefined,
          phone: empPhone || undefined,
          department: empDept,
          designation: empDesig,
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create employee');
    } finally {
      setBusy(false);
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record attendance');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record loan');
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate payroll');
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
    } catch (err: any) {
      alert(err.message || 'Failed to post payroll');
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
            onClick={() => setAttendanceDialogOpen(true)}
          >
            {isBn ? 'উপস্থিতি ও ওভারটাইম' : 'Record Attendance'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceWalletRoundedIcon />}
            onClick={() => setLoanDialogOpen(true)}
          >
            {isBn ? 'অগ্রিম / লোন' : 'Disburse Advance'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PaymentsRoundedIcon />}
            onClick={() => setPayrollDialogOpen(true)}
          >
            {isBn ? 'নতুন পেরোল তৈরি' : 'Generate Payroll'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddRoundedIcon />}
            onClick={() => setEmployeeDialogOpen(true)}
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone / NID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Joining Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Base Salary</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment Mode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
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
                    <TableCell sx={{ fontWeight: 700 }}>{emp.employeeCode}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{emp.fullName}</TableCell>
                    <TableCell><Chip size="small" label={emp.department} /></TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.phone || emp.nid || '-'}</TableCell>
                    <TableCell>{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ৳ {Number(emp.baseSalary).toLocaleString()}
                    </TableCell>
                    <TableCell>{emp.paymentMode}</TableCell>
                    <TableCell>
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Payroll #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Employees</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Base Salary</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Overtime</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Bonus</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Deductions</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Net Salary</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
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
                    <TableCell sx={{ fontWeight: 700 }}>{p.payrollNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{p.monthYear}</TableCell>
                    <TableCell align="center">{p.totalEmployees}</TableCell>
                    <TableCell align="right">৳ {Number(p.totalBaseSalary).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>+ ৳ {Number(p.totalOvertime).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'info.main' }}>+ ৳ {Number(p.totalBonus).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>- ৳ {Number(p.totalDeductions).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', fontSize: 15 }}>
                      ৳ {Number(p.totalNetSalary).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={p.status === 'POSTED' ? 'success' : 'warning'}
                        label={p.status}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="center">
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
      <Dialog open={employeeDialogOpen} onClose={() => !busy && setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateEmployee}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'নতুন কর্মকর্তা/কর্মচারী নিবন্ধন' : 'Register New Employee'}</DialogTitle>
          <DialogContent dividers>
            {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'কর্মচারী কোড' : 'Employee Code'}
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
              />
              <TextField
                required
                size="small"
                label={isBn ? 'পূর্ণ নাম' : 'Full Name'}
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'এনআইডি (NID)' : 'National ID'}
                value={empNid}
                onChange={(e) => setEmpNid(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'ফোন নম্বর' : 'Phone'}
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
              />
              <TextField
                required
                size="small"
                label={isBn ? 'বিভাগ' : 'Department'}
                value={empDept}
                onChange={(e) => setEmpDept(e.target.value)}
              />
              <TextField
                required
                size="small"
                label={isBn ? 'পদবী' : 'Designation'}
                value={empDesig}
                onChange={(e) => setEmpDesig(e.target.value)}
              />
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'যোগদানের তারিখ' : 'Joining Date'}
                value={empJoinDate}
                onChange={(e) => setEmpJoinDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'মাসিক মূল বেতন (৳)' : 'Monthly Base Salary (৳)'}
                value={empSalary}
                onChange={(e) => setEmpSalary(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmployeeDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Record Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={() => !busy && setAttendanceDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRecordAttendance}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'উপস্থিতি ও ওভারটাইম নথিভুক্ত' : 'Record Attendance & Overtime'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'কর্মচারী নির্বাচন করুন' : 'Select Employee'}
                value={attEmpId}
                onChange={(e) => setAttEmpId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- {isBn ? 'নির্বাচন করুন' : 'Select'} --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employeeCode} - {e.fullName}</option>
                ))}
              </TextField>
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'তারিখ' : 'Date'}
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                required
                size="small"
                label={isBn ? 'উপস্থিতি স্ট্যাটাস' : 'Attendance Status'}
                value={attStatus}
                onChange={(e) => setAttStatus(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="PRESENT">PRESENT (উপস্থিত)</option>
                <option value="ABSENT">ABSENT (অনুপস্থিত)</option>
                <option value="LATE">LATE (দেরিতে উপস্থিতি)</option>
                <option value="LEAVE">LEAVE (ছুটি)</option>
              </TextField>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'অতিরিক্ত কর্মঘণ্টা (Overtime Hours)' : 'Overtime Hours'}
                value={attOvertime}
                onChange={(e) => setAttOvertime(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAttendanceDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'সংরক্ষণ' : 'Record'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Disburse Loan/Advance Dialog */}
      <Dialog open={loanDialogOpen} onClose={() => !busy && setLoanDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateLoan}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'বেতন অগ্রিম ও ঋণ মঞ্জুর' : 'Disburse Advance / Loan'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'কর্মচারী' : 'Employee'}
                value={loanEmpId}
                onChange={(e) => setLoanEmpId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- {isBn ? 'নির্বাচন করুন' : 'Select'} --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employeeCode} - {e.fullName}</option>
                ))}
              </TextField>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'ধরনের' : 'Type'}
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="ADVANCE">SALARY ADVANCE (বেতন অগ্রিম)</option>
                <option value="LOAN">STAFF LOAN (কর্মচারী ঋণ)</option>
              </TextField>
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'মঞ্জুরিকৃত পরিমাণ (৳)' : 'Principal Amount (৳)'}
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
              />
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'মাসিক কর্তন (৳)' : 'Monthly Deduction (৳)'}
                value={loanMonthly}
                onChange={(e) => setLoanMonthly(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoanDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'মঞ্জুর করুন' : 'Disburse'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Generate Payroll Dialog */}
      <Dialog open={payrollDialogOpen} onClose={() => !busy && setPayrollDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleGeneratePayroll}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'মাসিক পেরোল তৈরি' : 'Generate Monthly Payroll'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {isBn
                  ? 'সক্রিয় সকল কর্মচারীর জন্য উপস্থিতি, ওভারটাইম এবং অগ্রিম সমন্বয় করে স্বয়ংক্রিয়ভাবে নিট বেতন নির্ধারণ করা হবে।'
                  : 'Automated calculation of base salaries, overtime rates, absent deductions, and loan repayments for all active personnel.'}
              </Typography>
              <TextField
                type="month"
                required
                size="small"
                label={isBn ? 'মাস ও বছর' : 'Month & Year'}
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayrollDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'তৈরি করুন' : 'Generate'}</Button>
          </DialogActions>
        </form>
      </Dialog>

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

