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
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

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

  // Load Machines
  const machinesQuery = useQuery({
    queryKey: ['machines', companyId, factoryId],
    queryFn: async () => {
      return apiRequest<any[]>(`/machines?companyId=${companyId}&factoryId=${factoryId}`);
    },
    enabled: Boolean(companyId),
  });

  const machines = machinesQuery.data || [];

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      await apiRequest('/machines', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          code,
          name,
          machineType: type,
          capacity,
          brand,
          modelNumber: modelNo,
          serviceIntervalHours: Number(intervalHours) || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setMachineDialogOpen(false);
      onSaved(isBn ? 'নতুন মেশিন সফলভাবে নিবন্ধিত হয়েছে' : 'Machine registered successfully');
      setCode('');
      setName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create machine');
    } finally {
      setBusy(false);
    }
  };

  const handleRecordLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
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
          operatorName: operator,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setLogDialogOpen(false);
      onSaved(isBn ? 'মেশিন কর্মঘণ্টা সফলভাবে যুক্ত হয়েছে' : 'Machine run hours recorded successfully');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record log');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const parts = sparePartName
        ? [{ partName: sparePartName, quantity: Number(sparePartQty), unitCost: Number(sparePartCost) }]
        : [];
      await apiRequest('/machines/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          machineId: selectedMachineId,
          type: ticketType,
          title: ticketTitle,
          description: ticketDesc,
          startDate: logDate,
          labourCost: Number(labourCost) || 0,
          spareParts: parts,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['machines'] });
      setTicketDialogOpen(false);
      onSaved(isBn ? 'রক্ষণাবেক্ষণ/ব্রেকডাউন টিকিট খোলা হয়েছে' : 'Maintenance/Breakdown ticket opened');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create ticket');
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
            onClick={() => setLogDialogOpen(true)}
          >
            {isBn ? 'কর্মঘণ্টা লগ' : 'Log Run Hours'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BuildRoundedIcon />}
            onClick={() => setTicketDialogOpen(true)}
          >
            {isBn ? 'মেরামত / ব্রেকডাউন' : 'Maintenance / Breakdown'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={() => setMachineDialogOpen(true)}
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
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Machine Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Machine Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Brand & Capacity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total Run Hours</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Last Service</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Next Service Due</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
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
                  <TableCell sx={{ fontWeight: 700 }}>{m.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                  <TableCell><Chip size="small" label={m.machineType} /></TableCell>
                  <TableCell>{m.brand || '-'} {m.capacity ? `(${m.capacity})` : ''}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {Number(m.totalRunHours).toFixed(1)} hrs
                  </TableCell>
                  <TableCell>{m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
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
                  <TableCell>
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
      <Dialog open={machineDialogOpen} onClose={() => !busy && setMachineDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateMachine}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'নতুন মেশিন ও যন্ত্রাংশ নিবন্ধন' : 'Register Machine & Equipment'}</DialogTitle>
          <DialogContent dividers>
            {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'মেশিন কোড' : 'Machine Code'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MILL-01"
              />
              <TextField
                required
                size="small"
                label={isBn ? 'মেশিনের নাম' : 'Machine Name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                select
                required
                size="small"
                label={isBn ? 'মেশিনের ধরন' : 'Machine Type'}
                value={type}
                onChange={(e) => setType(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="RICE_MILL">RICE_MILL (রাইস মিল)</option>
                <option value="BOILER">BOILER (বয়লার)</option>
                <option value="DRYER">DRYER (ড্রায়ার)</option>
                <option value="GENERATOR">GENERATOR (জেনারেটর)</option>
                <option value="CONVEYOR">CONVEYOR (কনভেয়র বেল্ট)</option>
                <option value="WEIGHBRIDGE">WEIGHBRIDGE (স্কেল)</option>
                <option value="PACKAGING_MACHINE">PACKAGING_MACHINE (প্যাকিং মেশিন)</option>
              </TextField>
              <TextField
                size="small"
                label={isBn ? 'সক্ষমতা (Capacity)' : 'Capacity'}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'ব্র্যান্ড' : 'Brand'}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'সার্ভিস বিরতি ঘণ্টা (Interval)' : 'Service Interval Hours'}
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMachineDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Log Hours Dialog */}
      <Dialog open={logDialogOpen} onClose={() => !busy && setLogDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRecordLog}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'মেশিন কর্মঘণ্টা ও শক্তি লগ' : 'Record Run Hours & Fuel/Energy'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'মেশিন নির্বাচন করুন' : 'Select Machine'}
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- {isBn ? 'নির্বাচন করুন' : 'Select'} --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </TextField>
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'তারিখ' : 'Log Date'}
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <TextField
                  type="number"
                  required
                  size="small"
                  label={isBn ? 'শুরুর ঘণ্টা' : 'Start Hours'}
                  value={startHours}
                  onChange={(e) => setStartHours(e.target.value)}
                />
                <TextField
                  type="number"
                  required
                  size="small"
                  label={isBn ? 'শেষ ঘণ্টা' : 'End Hours'}
                  value={endHours}
                  onChange={(e) => setEndHours(e.target.value)}
                />
              </Box>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'জ্বালানি / শক্তি ব্যবহার' : 'Energy/Fuel Consumed'}
                value={energyConsumed}
                onChange={(e) => setEnergyConsumed(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'অপারেটরের নাম' : 'Operator Name'}
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{isBn ? 'সংরক্ষণ' : 'Record'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Maintenance / Breakdown Dialog */}
      <Dialog open={ticketDialogOpen} onClose={() => !busy && setTicketDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateTicket}>
          <DialogTitle sx={{ fontWeight: 700 }}>{isBn ? 'মেরামত ও ব্রেকডাউন টিকিট' : 'Maintenance & Breakdown Ticket'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'মেশিন' : 'Machine'}
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ gridColumn: 'span 2' }}
              >
                <option value="">-- {isBn ? 'নির্বাচন করুন' : 'Select'} --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </TextField>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'টিকিটের ধরন' : 'Ticket Type'}
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="PREVENTIVE">PREVENTIVE (নিয়মিত সার্ভিস)</option>
                <option value="BREAKDOWN">BREAKDOWN (হঠাৎ বিকল)</option>
                <option value="REPAIR">REPAIR (যন্ত্রাংশ মেরামত)</option>
                <option value="OVERHAUL">OVERHAUL (সম্পূর্ণ ওভারহলিং)</option>
              </TextField>
              <TextField
                required
                size="small"
                label={isBn ? 'সমস্যার শিরোনাম' : 'Issue / Service Title'}
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'বিস্তারিত বর্ণনা' : 'Description'}
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                sx={{ gridColumn: 'span 2' }}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'লেবার / মজুরি খরচ (৳)' : 'Labour Cost (৳)'}
                value={labourCost}
                onChange={(e) => setLabourCost(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'যন্ত্রাংশের নাম (Spare Part)' : 'Spare Part Name'}
                value={sparePartName}
                onChange={(e) => setSparePartName(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'যন্ত্রাংশের সংখ্যা' : 'Quantity'}
                value={sparePartQty}
                onChange={(e) => setSparePartQty(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'যন্ত্রাংশের একক দর (৳)' : 'Part Unit Cost (৳)'}
                value={sparePartCost}
                onChange={(e) => setSparePartCost(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTicketDialogOpen(false)} disabled={busy}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" color="warning" disabled={busy}>{isBn ? 'টিকিট তৈরি' : 'Create Ticket'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

