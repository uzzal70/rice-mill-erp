'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { apiRequest, queryString } from '@/lib/api';

type Vehicle = {
  id: string;
  vehicleNumber: string;
  registrationNumber: string | null;
  vehicleType: string;
  ownerName: string | null;
  driverName: string | null;
  driverMobile: string | null;
  fitnessExpiry: string | null;
  insuranceExpiry: string | null;
  taxTokenExpiry: string | null;
  active: boolean;
};

type Movement = {
  id: string;
  gateNumber: string;
  direction: string;
  purpose: string;
  status: string;
  enteredAt: string;
  completedAt: string | null;
  factory: { id: string; name: string; code: string };
};

type VehicleForm = {
  vehicleNumber: string;
  registrationNumber: string;
  vehicleType: string;
  ownerName: string;
  driverName: string;
  driverMobile: string;
  fitnessExpiry: string;
  insuranceExpiry: string;
  taxTokenExpiry: string;
};

const emptyForm: VehicleForm = {
  vehicleNumber: '', registrationNumber: '', vehicleType: '', ownerName: '',
  driverName: '', driverMobile: '', fitnessExpiry: '', insuranceExpiry: '', taxTokenExpiry: '',
};

const labels = {
  en: {
    title: 'Vehicle register',
    subtitle: 'Maintain company vehicles, compliance dates, and gate movement history.',
    add: 'Add vehicle',
    edit: 'Edit vehicle',
    number: 'Vehicle number',
    registration: 'Registration',
    type: 'Vehicle type',
    owner: 'Owner',
    driver: 'Driver',
    mobile: 'Driver mobile',
    fitness: 'Fitness expiry',
    insurance: 'Insurance expiry',
    tax: 'Tax token expiry',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    all: 'All vehicles',
    activeOnly: 'Active only',
    inactiveOnly: 'Inactive only',
    actions: 'Actions',
    history: 'Movement history',
    save: 'Save vehicle',
    cancel: 'Cancel',
    noRows: 'No vehicles found.',
    loading: 'Loading vehicle register...',
    valid: 'Valid',
    dueSoon: 'Due soon',
    expired: 'Expired',
    notSet: 'Not set',
    noMovement: 'No gate movements found.',
    movementTitle: 'Vehicle gate movement history',
    gate: 'Gate no.',
    direction: 'Direction',
    purpose: 'Purpose',
    factory: 'Factory',
    time: 'Entry time',
    failed: 'Could not load vehicle data.',
    saved: 'Vehicle saved.',
  },
  bn: {
    title: 'যানবাহন তালিকা',
    subtitle: 'কোম্পানির যানবাহন, মেয়াদ এবং গেট চলাচলের ইতিহাস পরিচালনা করুন।',
    add: 'যানবাহন যোগ',
    edit: 'যানবাহন সম্পাদনা',
    number: 'যানবাহন নম্বর',
    registration: 'রেজিস্ট্রেশন',
    type: 'যানবাহনের ধরন',
    owner: 'মালিক',
    driver: 'চালক',
    mobile: 'চালকের মোবাইল',
    fitness: 'ফিটনেসের মেয়াদ',
    insurance: 'বীমার মেয়াদ',
    tax: 'ট্যাক্স টোকেনের মেয়াদ',
    status: 'অবস্থা',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    all: 'সব যানবাহন',
    activeOnly: 'শুধু সক্রিয়',
    inactiveOnly: 'শুধু নিষ্ক্রিয়',
    actions: 'কার্যক্রম',
    history: 'চলাচলের ইতিহাস',
    save: 'যানবাহন সংরক্ষণ',
    cancel: 'বাতিল',
    noRows: 'কোনো যানবাহন পাওয়া যায়নি।',
    loading: 'যানবাহন তালিকা লোড হচ্ছে...',
    valid: 'বৈধ',
    dueSoon: 'শীঘ্রই মেয়াদ শেষ',
    expired: 'মেয়াদ শেষ',
    notSet: 'নির্ধারিত নয়',
    noMovement: 'কোনো গেট চলাচল নেই।',
    movementTitle: 'যানবাহনের গেট চলাচলের ইতিহাস',
    gate: 'গেট নম্বর',
    direction: 'দিক',
    purpose: 'উদ্দেশ্য',
    factory: 'কারখানা',
    time: 'প্রবেশের সময়',
    failed: 'যানবাহনের তথ্য লোড করা যায়নি।',
    saved: 'যানবাহন সংরক্ষিত হয়েছে।',
  },
};

function expiryState(value: string | null, valid: string, dueSoon: string, expired: string, notSet: string) {
  if (!value) return { label: notSet, color: 'default' as const };
  const expiry = new Date(value);
  const days = Math.ceil((expiry.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days < 0) return { label: expired, color: 'error' as const };
  if (days <= 30) return { label: dueSoon, color: 'warning' as const };
  return { label: valid, color: 'success' as const };
}

export function VehicleMasterPage({ companyId, factoryId, language, onSaved, onError }: {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = labels[language];
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  async function loadVehicles() {
    if (!companyId) {
      setVehicles([]);
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<Vehicle[]>(`/vehicles?${queryString({
        companyId,
        factoryId,
        search: search.trim() || undefined,
        active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page: 1,
        pageSize: 100,
      })}`);
      setVehicles(result);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void loadVehicles(); }, [companyId, factoryId, search, statusFilter]);

  function openEditor(vehicle?: Vehicle) {
    setEditingVehicle(vehicle ?? null);
    setForm(vehicle ? {
      vehicleNumber: vehicle.vehicleNumber,
      registrationNumber: vehicle.registrationNumber ?? '',
      vehicleType: vehicle.vehicleType,
      ownerName: vehicle.ownerName ?? '',
      driverName: vehicle.driverName ?? '',
      driverMobile: vehicle.driverMobile ?? '',
      fitnessExpiry: vehicle.fitnessExpiry?.slice(0, 10) ?? '',
      insuranceExpiry: vehicle.insuranceExpiry?.slice(0, 10) ?? '',
      taxTokenExpiry: vehicle.taxTokenExpiry?.slice(0, 10) ?? '',
    } : emptyForm);
    setFormError('');
    setEditorOpen(true);
  }

  async function saveVehicle(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    const vehicleNumber = form.vehicleNumber.trim();
    const vehicleType = form.vehicleType.trim();
    if (vehicleNumber.length < 2 || vehicleType.length < 2) {
      setFormError(language === 'bn' ? 'যানবাহন নম্বর ও ধরনে অন্তত ২টি অক্ষর থাকতে হবে।' : 'Vehicle number and type must contain at least two characters.');
      return;
    }
    const payload = {
      companyId,
      vehicleNumber,
      vehicleType,
      registrationNumber: form.registrationNumber.trim() || null,
      ownerName: form.ownerName.trim() || null,
      driverName: form.driverName.trim() || null,
      driverMobile: form.driverMobile.trim() || null,
      fitnessExpiry: form.fitnessExpiry || null,
      insuranceExpiry: form.insuranceExpiry || null,
      taxTokenExpiry: form.taxTokenExpiry || null,
    };
    try {
      if (editingVehicle) {
        await apiRequest(`/vehicles/${editingVehicle.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const createPayload = Object.fromEntries(Object.entries(payload).filter(([key, value]) => key === 'companyId' || value !== null));
        await apiRequest('/vehicles', { method: 'POST', body: JSON.stringify(createPayload) });
      }
      setEditorOpen(false);
      onSaved(t.saved);
      await loadVehicles();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : t.failed);
    }
  }

  async function toggleActive(vehicle: Vehicle) {
    try {
      await apiRequest(`/vehicles/${vehicle.id}`, { method: 'PATCH', body: JSON.stringify({ companyId, active: !vehicle.active }) });
      onSaved(vehicle.active ? t.inactive : t.active);
      await loadVehicles();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : t.failed);
    }
  }

  async function openHistory(vehicle: Vehicle) {
    setHistoryVehicle(vehicle);
    setHistory([]);
    setHistoryBusy(true);
    try {
      const result = await apiRequest<Movement[]>(`/vehicles/${vehicle.id}/movements?${queryString({ companyId, factoryId, page: 1, pageSize: 100 })}`);
      setHistory(result);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : t.failed);
      setHistoryVehicle(null);
    } finally {
      setHistoryBusy(false);
    }
  }

  return <Stack spacing={2}>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
        <TextField size="small" label={language === 'bn' ? 'নম্বর, রেজিস্ট্রেশন, চালক খুঁজুন' : 'Search number, registration, driver'} value={search} onChange={event => setSearch(event.target.value)} />
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t.status}</InputLabel>
            <Select value={statusFilter} label={t.status} onChange={event => setStatusFilter(event.target.value)}>
              <MenuItem value="ALL">{t.all}</MenuItem>
              <MenuItem value="ACTIVE">{t.activeOnly}</MenuItem>
              <MenuItem value="INACTIVE">{t.inactiveOnly}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => openEditor()}>{t.add}</Button>
        </Stack>
      </Stack>
    </Paper>

    <Paper className="workspace-card" elevation={0} sx={{ p: 1.5 }}>
      {busy ? <Stack alignItems="center" py={5}><CircularProgress size={24} /><Typography mt={1} color="text.secondary">{t.loading}</Typography></Stack>
        : vehicles.length === 0 ? <Typography textAlign="center" color="text.secondary" py={5}>{t.noRows}</Typography>
          : <Box sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead><TableRow>{[t.number, t.registration, t.type, t.owner, t.driver, t.fitness, t.insurance, t.tax, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{vehicles.map(vehicle => <TableRow key={vehicle.id} hover>
              <TableCell><Typography fontWeight={800} fontSize={12}>{vehicle.vehicleNumber}</Typography></TableCell>
              <TableCell>{vehicle.registrationNumber || '—'}</TableCell>
              <TableCell>{vehicle.vehicleType}</TableCell>
              <TableCell>{vehicle.ownerName || '—'}</TableCell>
              <TableCell>{vehicle.driverName || '—'}{vehicle.driverMobile && <Typography color="text.secondary" fontSize={10}>{vehicle.driverMobile}</Typography>}</TableCell>
              {[vehicle.fitnessExpiry, vehicle.insuranceExpiry, vehicle.taxTokenExpiry].map((date, index) => {
                const state = expiryState(date, t.valid, t.dueSoon, t.expired, t.notSet);
                return <TableCell key={`${vehicle.id}-${index}`}><Stack spacing={.4}><Typography fontSize={11}>{date ? new Date(date).toLocaleDateString() : '—'}</Typography><Chip size="small" color={state.color} label={state.label} sx={{ width: 'fit-content' }} /></Stack></TableCell>;
              })}
              <TableCell><Chip size="small" color={vehicle.active ? 'success' : 'default'} label={vehicle.active ? t.active : t.inactive} /></TableCell>
              <TableCell><Stack direction="row" spacing={.5}><Button size="small" onClick={() => openHistory(vehicle)}>{t.history}</Button><Button size="small" onClick={() => openEditor(vehicle)}>{t.edit}</Button><Button size="small" color={vehicle.active ? 'warning' : 'success'} onClick={() => toggleActive(vehicle)}>{vehicle.active ? t.inactive : t.active}</Button></Stack></TableCell>
            </TableRow>)}</TableBody>
          </Table></Box>}
    </Paper>

    <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editingVehicle ? t.edit : t.add}</DialogTitle>
      <Box component="form" onSubmit={saveVehicle}>
        <DialogContent><Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {([
            ['vehicleNumber', t.number],
            ['registrationNumber', t.registration],
            ['vehicleType', t.type],
            ['ownerName', t.owner],
            ['driverName', t.driver],
            ['driverMobile', t.mobile],
            ['fitnessExpiry', t.fitness],
            ['insuranceExpiry', t.insurance],
            ['taxTokenExpiry', t.tax],
          ] as Array<[keyof VehicleForm, string]>).map(([field, label]) => {
            const dateField = field.endsWith('Expiry');
            return <TextField key={field} label={label} type={dateField ? 'date' : 'text'} value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} InputLabelProps={dateField ? { shrink: true } : undefined} required={field === 'vehicleNumber' || field === 'vehicleType'} />;
          })}
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setEditorOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained">{t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(historyVehicle)} onClose={() => setHistoryVehicle(null)} fullWidth maxWidth="md">
      <DialogTitle>{historyVehicle ? `${t.movementTitle} · ${historyVehicle.vehicleNumber}` : t.movementTitle}</DialogTitle>
      <DialogContent>
        {historyBusy ? <Stack alignItems="center" py={4}><CircularProgress /></Stack>
          : history.length === 0 ? <Typography color="text.secondary" textAlign="center" py={4}>{t.noMovement}</Typography>
            : <Box sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 650 }}>
              <TableHead><TableRow>{[t.gate, t.direction, t.purpose, t.status, t.factory, t.time].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
              <TableBody>{history.map(movement => <TableRow key={movement.id}>
                <TableCell>{movement.gateNumber}</TableCell>
                <TableCell>{movement.direction}</TableCell>
                <TableCell>{movement.purpose.replaceAll('_', ' ')}</TableCell>
                <TableCell>{movement.status.replaceAll('_', ' ')}</TableCell>
                <TableCell>{movement.factory.name}</TableCell>
                <TableCell>{new Date(movement.enteredAt).toLocaleString()}</TableCell>
              </TableRow>)}</TableBody>
            </Table></Box>}
      </DialogContent>
      <DialogActions><Button onClick={() => setHistoryVehicle(null)}>{t.cancel}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
