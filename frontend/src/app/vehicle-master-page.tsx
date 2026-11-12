'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

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
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
      onError(extractApiError(reason, t.failed));
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
    setFieldErrors({});
    setEditorOpen(true);
  }

  async function saveVehicle(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'vehicleNumber', label: t.number, value: form.vehicleNumber, required: true, minLength: 2 },
        { name: 'vehicleType', label: t.type, value: form.vehicleType, required: true, minLength: 2 },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setFormError('');
    setFieldErrors({});
    setSaving(true);
    const payload = {
      companyId,
      vehicleNumber: form.vehicleNumber.trim(),
      vehicleType: form.vehicleType.trim(),
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
      const msg = extractApiError(reason, t.failed);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(vehicle: Vehicle) {
    try {
      await apiRequest(`/vehicles/${vehicle.id}`, { method: 'PATCH', body: JSON.stringify({ companyId, active: !vehicle.active }) });
      onSaved(vehicle.active ? t.inactive : t.active);
      await loadVehicles();
    } catch (reason) {
      onError(extractApiError(reason, t.failed));
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
      onError(extractApiError(reason, t.failed));
      setHistoryVehicle(null);
    } finally {
      setHistoryBusy(false);
    }
  }

  return <Stack spacing={2}>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <AppTextField fieldName="search" label={language === 'bn' ? 'নম্বর, রেজিস্ট্রেশন, চালক খুঁজুন' : 'Search number, registration, driver'} value={search} onValueChange={setSearch} />
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ minWidth: 160 }}>
            <AppSelect
              name="statusFilter"
              label={t.status}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: t.all },
                { value: 'ACTIVE', label: t.activeOnly },
                { value: 'INACTIVE', label: t.inactiveOnly },
              ]}
            />
          </Box>
          <Button variant="contained" onClick={() => openEditor()} sx={{ whiteSpace: 'nowrap' }}>{t.add}</Button>
        </Stack>
      </Stack>
    </Paper>

    <Paper className="workspace-card" elevation={0} sx={{ p: 1.5 }}>
      {busy ? <Stack alignItems="center" py={5}><CircularProgress size={24} /><Typography mt={1} color="text.secondary">{t.loading}</Typography></Stack>
        : vehicles.length === 0 ? <Typography textAlign="center" color="text.secondary" py={5}>{t.noRows}</Typography>
          : <Box sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead><TableRow>{[t.number, t.registration, t.type, t.owner, t.driver, t.fitness, t.insurance, t.tax, t.status, t.actions].map(label => <TableCell key={label} sx={{ whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{vehicles.map(vehicle => <TableRow key={vehicle.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}><Typography fontWeight={800} fontSize={12}>{vehicle.vehicleNumber}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{vehicle.registrationNumber || '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{vehicle.vehicleType}</TableCell>
              <TableCell sx={{ maxWidth: 170 }}><Typography variant="body2" noWrap title={vehicle.ownerName || '—'}>{vehicle.ownerName || '—'}</Typography></TableCell>
              <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap>{vehicle.driverName || '—'}</Typography>{vehicle.driverMobile && <Typography color="text.secondary" fontSize={10}>{vehicle.driverMobile}</Typography>}</TableCell>
              {[vehicle.fitnessExpiry, vehicle.insuranceExpiry, vehicle.taxTokenExpiry].map((date, index) => {
                const state = expiryState(date, t.valid, t.dueSoon, t.expired, t.notSet);
                return <TableCell key={`${vehicle.id}-${index}`} sx={{ whiteSpace: 'nowrap' }}><Stack spacing={.4}><Typography fontSize={11}>{date ? new Date(date).toLocaleDateString() : '—'}</Typography><Chip size="small" color={state.color} label={state.label} sx={{ width: 'fit-content' }} /></Stack></TableCell>;
              })}
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={vehicle.active ? 'success' : 'default'} label={vehicle.active ? t.active : t.inactive} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Stack direction="row" spacing={.5} justifyContent="flex-end"><Button size="small" onClick={() => openHistory(vehicle)}>{t.history}</Button><Button size="small" onClick={() => openEditor(vehicle)}>{t.edit}</Button><Button size="small" color={vehicle.active ? 'warning' : 'success'} onClick={() => toggleActive(vehicle)}>{vehicle.active ? t.inactive : t.active}</Button></Stack></TableCell>
            </TableRow>)}</TableBody>
          </Table></Box>}
    </Paper>

    <FormDialog
      open={editorOpen}
      onClose={() => setEditorOpen(false)}
      onSubmit={saveVehicle}
      title={editingVehicle ? t.edit : t.add}
      error={formError}
      onClearError={() => setFormError('')}
      loading={saving}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={2}>
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
          return (
            <AppTextField
              key={field}
              fieldName={field}
              label={label}
              type={dateField ? 'date' : 'text'}
              value={form[field]}
              errorText={fieldErrors[field]}
              required={field === 'vehicleNumber' || field === 'vehicleType'}
              onValueChange={val => {
                setForm(current => ({ ...current, [field]: val }));
                setFieldErrors(p => ({ ...p, [field]: '' }));
              }}
            />
          );
        })}
      </FormGrid>
    </FormDialog>

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
