'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface MachinesPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

export function MachinesPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: MachinesPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Machines, 1: Service Due, 2: Breakdowns

  // Dialogs
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // Machine Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('RICE_MILL');
  const [capacity, setCapacity] = useState('10 Ton/Hour');
  const [brand, setBrand] = useState('Satake');
  const [modelNo, setModelNo] = useState('');
  const [intervalHours, setIntervalHours] = useState('500');

  // Log Form
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [startHours, setStartHours] = useState('0');
  const [endHours, setEndHours] = useState('8');
  const [energyConsumed, setEnergyConsumed] = useState('50');
  const [operator, setOperator] = useState('');

  // Ticket Form
  const [ticketType, setTicketType] = useState('PREVENTIVE');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [labourCost, setLabourCost] = useState('1500');
  const [sparePartName, setSparePartName] = useState('');
  const [sparePartQty, setSparePartQty] = useState('1');
  const [sparePartCost, setSparePartCost] = useState('2000');

  // Complete Ticket
  const [completeTicketId, setCompleteTicketId] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load Machines
  const machinesQuery = useQuery({
    queryKey: ['machines', companyId, factoryId],
    queryFn: async () => {
      return apiRequest<any[]>(`/machines?companyId=${companyId}&factoryId=${factoryId}`);
    },
    enabled: Boolean(companyId),
  });

  const machines = machinesQuery.data || [];

  const openMachineDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setMachineDialogOpen(true);
  };

  const openLogDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setLogDialogOpen(true);
  };

  const openTicketDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setTicketDialogOpen(true);
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'machineCode', label: isBn ? 'মেশিন কোড' : 'Machine Code', value: code, required: true },
      { name: 'machineName', label: isBn ? 'মেশিনের নাম' : 'Machine Name', value: name, required: true },
      { name: 'machineType', label: isBn ? 'মেশিনের ধরন' : 'Machine Type', value: type, required: true, isSelect: true },
    ];
    if (intervalHours.trim()) {
      rules.push({
        name: 'intervalHours',
        label: isBn ? 'সার্ভিস বিরতি ঘণ্টা' : 'Service Interval Hours',
        value: intervalHours,
        type: 'positiveNumber',
      });
    }
    const validation = validateFormFields(rules, language);
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
      await apiRequest('/machines', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          code: code.trim(),
          name: name.trim(),
          machineType: type,
          capacity: capacity.trim(),
          brand: brand.trim(),
          modelNumber: modelNo.trim(),
          serviceIntervalHours: Number(intervalHours) || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setMachineDialogOpen(false);
      onSaved(isBn ? 'নতুন মেশিন সফলভাবে নিবন্ধিত হয়েছে' : 'Machine registered successfully');
      setCode('');
      setName('');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to create machine');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'logMachineId', label: isBn ? 'মেশিন নির্বাচন করুন' : 'Select Machine', value: selectedMachineId, required: true, isSelect: true },
      { name: 'logDate', label: isBn ? 'তারিখ' : 'Log Date', value: logDate, required: true, type: 'date' },
      { name: 'startHours', label: isBn ? 'শুরুর ঘণ্টা' : 'Start Hours', value: startHours, required: true, type: 'nonNegativeNumber' },
      {
        name: 'endHours',
        label: isBn ? 'শেষ ঘণ্টা' : 'End Hours',
        value: endHours,
        required: true,
        type: 'nonNegativeNumber',
        custom: (val) =>
          Number(val) <= Number(startHours || 0)
            ? isBn
              ? 'শেষ ঘণ্টা অবশ্যই শুরুর ঘণ্টার চেয়ে বড় হতে হবে।'
              : 'End Hours must be greater than Start Hours.'
            : null,
      },
    ];
    if (energyConsumed.trim()) {
      rules.push({
        name: 'energyConsumed',
        label: isBn ? 'জ্বালানি / শক্তি ব্যবহার' : 'Energy/Fuel Consumed',
        value: energyConsumed,
        type: 'nonNegativeNumber',
      });
    }
    const validation = validateFormFields(rules, language);
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
      await apiRequest('/machines/logs', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          machineId: selectedMachineId,
          logDate,
          startHours: Number(startHours),
          endHours: Number(endHours),
          energyOrFuelConsumed: Number(energyConsumed) || undefined,
          operatorName: operator.trim(),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setLogDialogOpen(false);
      onSaved(isBn ? 'মেশিন কর্মঘণ্টা সফলভাবে যুক্ত হয়েছে' : 'Machine run hours recorded successfully');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to record log');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'ticketMachineId', label: isBn ? 'মেশিন' : 'Machine', value: selectedMachineId, required: true, isSelect: true },
      { name: 'ticketType', label: isBn ? 'টিকিটের ধরন' : 'Ticket Type', value: ticketType, required: true, isSelect: true },
      { name: 'ticketTitle', label: isBn ? 'সমস্যার শিরোনাম' : 'Issue / Service Title', value: ticketTitle, required: true },
      { name: 'labourCost', label: isBn ? 'লেবার / মজুরি খরচ (৳)' : 'Labour Cost (৳)', value: labourCost || '0', type: 'nonNegativeNumber' },
    ];
    if (sparePartName.trim()) {
      rules.push(
        { name: 'sparePartQty', label: isBn ? 'যন্ত্রাংশের সংখ্যা' : 'Quantity', value: sparePartQty, required: true, type: 'positiveNumber' },
        { name: 'sparePartCost', label: isBn ? 'যন্ত্রাংশের একক দর (৳)' : 'Part Unit Cost (৳)', value: sparePartCost, required: true, type: 'nonNegativeNumber' },
      );
    }
    const validation = validateFormFields(rules, language);
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
      const parts = sparePartName.trim()
        ? [{ partName: sparePartName.trim(), quantity: Number(sparePartQty), unitCost: Number(sparePartCost) }]
        : [];
      await apiRequest('/machines/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          machineId: selectedMachineId,
          type: ticketType,
          title: ticketTitle.trim(),
          description: ticketDesc.trim(),
          startDate: logDate,
          labourCost: Number(labourCost) || 0,
          spareParts: parts,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setTicketDialogOpen(false);
      onSaved(isBn ? 'রক্ষণাবেক্ষণ/ব্রেকডাউন টিকিট খোলা হয়েছে' : 'Maintenance/Breakdown ticket opened');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to create ticket');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // KPIs
  const totalMachines = machines.length;
  const operationalCount = machines.filter((m) => m.status === 'OPERATIONAL').length;
  const breakdownCount = machines.filter((m) => m.status === 'BREAKDOWN' || m.status === 'UNDER_MAINTENANCE').length;
  const serviceDueCount = machines.filter((m) => m.isServiceDue).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <PrecisionManufacturingRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'যন্ত্রপাতি ও রক্ষণাবেক্ষণ (Machine Management)' : 'Machine & Equipment Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'রাইস মিল, বয়লার, ড্রায়ার, জেনারেটর, কনভেয়র ও ওজন স্কেলের কর্মঘণ্টা, মেরামত, ব্রেকডাউন ও সার্ভিস সতর্কতা'
              : 'Machine hours, breakdown tracking, spare parts usage, servicing schedules, and preventive maintenance.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => machinesQuery.refetch()}
          >
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SpeedRoundedIcon />}
            onClick={openLogDialog}
          >
            {isBn ? 'কর্মঘণ্টা লগ' : 'Log Run Hours'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BuildRoundedIcon />}
            onClick={openTicketDialog}
          >
            {isBn ? 'মেরামত / ব্রেকডাউন' : 'Maintenance / Breakdown'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={openMachineDialog}
          >
            {isBn ? 'নতুন মেশিন যোগ' : 'Add Machine'}
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#f8fafc' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মোট মেশিন' : 'TOTAL MACHINES'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              {totalMachines}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#f0fdf4' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'সচল রয়েছে' : 'OPERATIONAL'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#166534">
              {operationalCount}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#fef2f2' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'ব্রেকডাউন / মেরামত চলছে' : 'BREAKDOWN / REPAIR'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#991b1b">
              {breakdownCount}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#fffbeb' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'সার্ভিস আবশ্যক' : 'SERVICE DUE'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#b45309">
              {serviceDueCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Machines Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Machine Code</TableCell>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Machine Name</TableCell>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Brand & Capacity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Total Run Hours</TableCell>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Last Service</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Next Service Due</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {isBn ? 'কোন মেশিন নিবন্ধিত নেই। নতুন মেশিন যোগ করুন।' : 'No machines found. Click Add Machine to register.'}
                </TableCell>
              </TableRow>
            ) : (
              machines.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{m.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600, maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={m.name}>{m.name}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={m.machineType} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.brand || '-'} {m.capacity ? `(${m.capacity})` : ''}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {Number(m.totalRunHours).toFixed(1)} hrs
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {m.nextServiceDate ? (
                      <Chip
                        size="small"
                        color={m.isServiceDue ? 'error' : 'default'}
                        label={new Date(m.nextServiceDate).toLocaleDateString()}
                        icon={m.isServiceDue ? <WarningAmberRoundedIcon /> : undefined}
                      />
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Chip
                      size="small"
                      color={
                        m.status === 'OPERATIONAL'
                          ? 'success'
                          : m.status === 'BREAKDOWN'
                          ? 'error'
                          : 'warning'
                      }
                      label={m.status}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Machine Dialog */}
      <FormDialog
        open={machineDialogOpen}
        onClose={() => !busy && setMachineDialogOpen(false)}
        onSubmit={handleCreateMachine}
        title={isBn ? 'নতুন মেশিন ও যন্ত্রাংশ নিবন্ধন' : 'Register Machine & Equipment'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ' : 'Save'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppTextField
            fieldName="machineCode"
            required
            label={isBn ? 'মেশিন কোড' : 'Machine Code'}
            value={code}
            errorText={fieldErrors.machineCode}
            onValueChange={(val) => {
              setCode(val);
              setFieldErrors((p) => ({ ...p, machineCode: '' }));
            }}
            placeholder="e.g. MILL-01"
          />
          <AppTextField
            fieldName="machineName"
            required
            label={isBn ? 'মেশিনের নাম' : 'Machine Name'}
            value={name}
            errorText={fieldErrors.machineName}
            onValueChange={(val) => {
              setName(val);
              setFieldErrors((p) => ({ ...p, machineName: '' }));
            }}
          />
          <AppSelect
            fieldName="machineType"
            required
            label={isBn ? 'মেশিনের ধরন' : 'Machine Type'}
            value={type}
            errorText={fieldErrors.machineType}
            options={[
              { value: 'RICE_MILL', label: 'RICE_MILL (রাইস মিল)' },
              { value: 'BOILER', label: 'BOILER (বয়লার)' },
              { value: 'DRYER', label: 'DRYER (ড্রায়ার)' },
              { value: 'GENERATOR', label: 'GENERATOR (জেনারেটর)' },
              { value: 'CONVEYOR', label: 'CONVEYOR (কনভেয়র বেল্ট)' },
              { value: 'WEIGHBRIDGE', label: 'WEIGHBRIDGE (স্কেল)' },
              { value: 'PACKAGING_MACHINE', label: 'PACKAGING_MACHINE (প্যাকিং মেশিন)' },
            ]}
            onChange={(val) => {
              setType(val);
              setFieldErrors((p) => ({ ...p, machineType: '' }));
            }}
          />
          <AppTextField
            fieldName="capacity"
            label={isBn ? 'সক্ষমতা (Capacity)' : 'Capacity'}
            value={capacity}
            onValueChange={(val) => setCapacity(val)}
          />
          <AppTextField
            fieldName="brand"
            label={isBn ? 'ব্র্যান্ড' : 'Brand'}
            value={brand}
            onValueChange={(val) => setBrand(val)}
          />
          <AppTextField
            fieldName="intervalHours"
            type="number"
            unit="HRS"
            label={isBn ? 'সার্ভিস বিরতি ঘণ্টা (Interval)' : 'Service Interval Hours'}
            value={intervalHours}
            errorText={fieldErrors.intervalHours}
            inputProps={{ min: 1 }}
            onValueChange={(val) => {
              setIntervalHours(val);
              setFieldErrors((p) => ({ ...p, intervalHours: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>

      {/* Log Hours Dialog */}
      <FormDialog
        open={logDialogOpen}
        onClose={() => !busy && setLogDialogOpen(false)}
        onSubmit={handleRecordLog}
        title={isBn ? 'মেশিন কর্মঘণ্টা ও শক্তি লগ' : 'Record Run Hours & Fuel/Energy'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ' : 'Record'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <FormGrid columns={1}>
          <AppAutocomplete
            fieldName="logMachineId"
            required
            label={isBn ? 'মেশিন নির্বাচন করুন' : 'Select Machine'}
            value={selectedMachineId}
            errorText={fieldErrors.logMachineId}
            options={machines.map((m) => ({ value: m.id, label: m.name, badge: m.code }))}
            emptyMessage={isBn ? 'কোনো মেশিন নেই — আগে মেশিন যোগ করুন' : 'No machines registered — add a machine first'}
            onChange={(val) => {
              setSelectedMachineId(val);
              setFieldErrors((p) => ({ ...p, logMachineId: '' }));
            }}
          />
          <AppTextField
            fieldName="logDate"
            type="date"
            required
            label={isBn ? 'তারিখ' : 'Log Date'}
            value={logDate}
            errorText={fieldErrors.logDate}
            onValueChange={(val) => {
              setLogDate(val);
              setFieldErrors((p) => ({ ...p, logDate: '' }));
            }}
            InputLabelProps={{ shrink: true }}
          />
          <FormGrid columns={2}>
            <AppTextField
              fieldName="startHours"
              type="number"
              required
              unit="HRS"
              label={isBn ? 'শুরুর ঘণ্টা' : 'Start Hours'}
              value={startHours}
              errorText={fieldErrors.startHours}
              inputProps={{ min: 0, step: '.1' }}
              onValueChange={(val) => {
                setStartHours(val);
                setFieldErrors((p) => ({ ...p, startHours: '', endHours: '' }));
              }}
            />
            <AppTextField
              fieldName="endHours"
              type="number"
              required
              unit="HRS"
              label={isBn ? 'শেষ ঘণ্টা' : 'End Hours'}
              value={endHours}
              errorText={fieldErrors.endHours}
              inputProps={{ min: 0, step: '.1' }}
              onValueChange={(val) => {
                setEndHours(val);
                setFieldErrors((p) => ({ ...p, endHours: '' }));
              }}
            />
          </FormGrid>
          <AppTextField
            fieldName="energyConsumed"
            type="number"
            label={isBn ? 'জ্বালানি / শক্তি ব্যবহার' : 'Energy/Fuel Consumed'}
            value={energyConsumed}
            errorText={fieldErrors.energyConsumed}
            inputProps={{ min: 0, step: '.1' }}
            onValueChange={(val) => {
              setEnergyConsumed(val);
              setFieldErrors((p) => ({ ...p, energyConsumed: '' }));
            }}
          />
          <AppTextField
            fieldName="operator"
            label={isBn ? 'অপারেটরের নাম' : 'Operator Name'}
            value={operator}
            onValueChange={(val) => setOperator(val)}
          />
        </FormGrid>
      </FormDialog>

      {/* Maintenance / Breakdown Dialog */}
      <FormDialog
        open={ticketDialogOpen}
        onClose={() => !busy && setTicketDialogOpen(false)}
        onSubmit={handleCreateTicket}
        title={isBn ? 'মেরামত ও ব্রেকডাউন টিকিট' : 'Maintenance & Breakdown Ticket'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'টিকিট তৈরি' : 'Create Ticket'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        submitColor="warning"
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppAutocomplete
              fieldName="ticketMachineId"
              required
              label={isBn ? 'মেশিন' : 'Machine'}
              value={selectedMachineId}
              errorText={fieldErrors.ticketMachineId}
              options={machines.map((m) => ({ value: m.id, label: m.name, badge: m.code }))}
              emptyMessage={isBn ? 'কোনো মেশিন নেই — আগে মেশিন যোগ করুন' : 'No machines registered — add a machine first'}
              onChange={(val) => {
                setSelectedMachineId(val);
                setFieldErrors((p) => ({ ...p, ticketMachineId: '' }));
              }}
            />
          </Box>
          <AppSelect
            fieldName="ticketType"
            required
            label={isBn ? 'টিকিটের ধরন' : 'Ticket Type'}
            value={ticketType}
            errorText={fieldErrors.ticketType}
            options={[
              { value: 'PREVENTIVE', label: 'PREVENTIVE (নিয়মিত সার্ভিস)' },
              { value: 'BREAKDOWN', label: 'BREAKDOWN (হঠাৎ বিকল)' },
              { value: 'REPAIR', label: 'REPAIR (যন্ত্রাংশ মেরামত)' },
              { value: 'OVERHAUL', label: 'OVERHAUL (সম্পূর্ণ ওভারহলিং)' },
            ]}
            onChange={(val) => {
              setTicketType(val);
              setFieldErrors((p) => ({ ...p, ticketType: '' }));
            }}
          />
          <AppTextField
            fieldName="ticketTitle"
            required
            label={isBn ? 'সমস্যার শিরোনাম' : 'Issue / Service Title'}
            value={ticketTitle}
            errorText={fieldErrors.ticketTitle}
            onValueChange={(val) => {
              setTicketTitle(val);
              setFieldErrors((p) => ({ ...p, ticketTitle: '' }));
            }}
          />
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppTextField
              fieldName="ticketDesc"
              multiline
              minRows={2}
              label={isBn ? 'বিস্তারিত বর্ণনা' : 'Description'}
              value={ticketDesc}
              onValueChange={(val) => setTicketDesc(val)}
            />
          </Box>
          <AppTextField
            fieldName="labourCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'লেবার / মজুরি খরচ (৳)' : 'Labour Cost (৳)'}
            value={labourCost}
            errorText={fieldErrors.labourCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setLabourCost(val);
              setFieldErrors((p) => ({ ...p, labourCost: '' }));
            }}
          />
          <AppTextField
            fieldName="sparePartName"
            label={isBn ? 'যন্ত্রাংশের নাম (Spare Part)' : 'Spare Part Name'}
            value={sparePartName}
            onValueChange={(val) => {
              setSparePartName(val);
              setFieldErrors((p) => ({ ...p, sparePartQty: '', sparePartCost: '' }));
            }}
          />
          <AppTextField
            fieldName="sparePartQty"
            type="number"
            label={isBn ? 'যন্ত্রাংশের সংখ্যা' : 'Quantity'}
            value={sparePartQty}
            errorText={fieldErrors.sparePartQty}
            prerequisite={{
              met: Boolean(sparePartName.trim()),
              message: isBn
                ? 'সংখ্যা দেওয়ার আগে অনুগ্রহ করে যন্ত্রাংশের নাম লিখুন।'
                : 'Please enter a Spare Part Name first before specifying part quantity.',
              focusField: 'sparePartName',
            }}
            inputProps={{ min: 1 }}
            onValueChange={(val) => {
              setSparePartQty(val);
              setFieldErrors((p) => ({ ...p, sparePartQty: '' }));
            }}
          />
          <AppTextField
            fieldName="sparePartCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'যন্ত্রাংশের একক দর (৳)' : 'Part Unit Cost (৳)'}
            value={sparePartCost}
            errorText={fieldErrors.sparePartCost}
            prerequisite={{
              met: Boolean(sparePartName.trim()),
              message: isBn
                ? 'একক দর দেওয়ার আগে অনুগ্রহ করে যন্ত্রাংশের নাম লিখুন।'
                : 'Please enter a Spare Part Name first before specifying part unit cost.',
              focusField: 'sparePartName',
            }}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setSparePartCost(val);
              setFieldErrors((p) => ({ ...p, sparePartCost: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>
    </Box>
  );
}

