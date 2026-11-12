'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppAutocomplete, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface FleetPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

export function FleetPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: FleetPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Trips, 1: Fuel Logs, 2: Vehicles, 3: Maintenance
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Dialogs
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);

  // Vehicle Form State
  const [vNumber, setVNumber] = useState('');
  const [vType, setVType] = useState('TRUCK_10_TON');
  const [vOwner, setVOwner] = useState('');
  const [vDriver, setVDriver] = useState('');
  const [vMobile, setVMobile] = useState('');
  const [vFitnessExpiry, setVFitnessExpiry] = useState('');
  const [vInsuranceExpiry, setVInsuranceExpiry] = useState('');
  const [vTaxTokenExpiry, setVTaxTokenExpiry] = useState('');

  // Trip Form State
  const [tVehicleId, setTVehicleId] = useState('');
  const [tTripNumber, setTTripNumber] = useState(`TRIP-${Date.now().toString().slice(-6)}`);
  const [tDriverName, setTDriverName] = useState('');
  const [tDriverPhone, setTDriverPhone] = useState('');
  const [tTripDate, setTTripDate] = useState(new Date().toISOString().slice(0, 10));
  const [tOrigin, setTOrigin] = useState('Central Rice Mill');
  const [tDestination, setTDestination] = useState('Dhaka Wholesale Market');
  const [tStartOdo, setTStartOdo] = useState('10000');
  const [tEndOdo, setTEndOdo] = useState('10350');
  const [tCargoDesc, setTCargoDesc] = useState('Miniket Premium Rice 50kg bags');
  const [tCargoWeight, setTCargoWeight] = useState('15000');
  const [tFreightAmount, setTFreightAmount] = useState('35000');
  const [tFuelCost, setTFuelCost] = useState('9000');
  const [tTollCost, setTTollCost] = useState('1500');

  // Fuel Form State
  const [fVehicleId, setFVehicleId] = useState('');
  const [fLogDate, setFLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [fFuelType, setFFuelType] = useState('DIESEL');
  const [fQuantity, setFQuantity] = useState('80');
  const [fRate, setFRate] = useState('108.50');
  const [fOdometer, setFOdometer] = useState('10350');
  const [fStation, setFStation] = useState('Padma Oil Pump');
  const [fSlipNumber, setFSlipNumber] = useState('');
  const [fDriver, setFDriver] = useState('');

  // Maintenance Form State
  const [mVehicleId, setMVehicleId] = useState('');
  const [mType, setMType] = useState('PERIODIC_SERVICING');
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mOdometer, setMOdometer] = useState('');
  const [mCost, setMCost] = useState('6500');
  const [mCenter, setMCenter] = useState('Workshop & Spare Center');
  const [mDesc, setMDesc] = useState('Engine oil, filter replacement and brake shoe tune-up');
  const [mNextDueKm, setMNextDueKm] = useState('15000');

  // Queries
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['fleet-analytics', companyId],
    queryFn: () => apiRequest<any>(`/fleet/analytics?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ['fleet-vehicles', companyId],
    queryFn: () => apiRequest<any[]>(`/fleet/vehicles?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: trips = [], refetch: refetchTrips } = useQuery({
    queryKey: ['fleet-trips', companyId],
    queryFn: () => apiRequest<any[]>(`/fleet/trips?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: fuelLogs = [], refetch: refetchFuelLogs } = useQuery({
    queryKey: ['fleet-fuel-logs', companyId],
    queryFn: () => apiRequest<any[]>(`/fleet/fuel-logs?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: maintenances = [], refetch: refetchMaintenances } = useQuery({
    queryKey: ['fleet-maintenance', companyId],
    queryFn: () => apiRequest<any[]>(`/fleet/maintenance?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const handleRefresh = () => {
    refetchAnalytics();
    refetchVehicles();
    refetchTrips();
    refetchFuelLogs();
    refetchMaintenances();
  };

  const openVehicleDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setVehicleDialogOpen(true);
  };

  const openTripDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setTripDialogOpen(true);
  };

  const openFuelDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setFuelDialogOpen(true);
  };

  const openMaintenanceDialog = () => {
    setErrorMsg(null);
    setFieldErrors({});
    setMaintenanceDialogOpen(true);
  };

  const handleCreateVehicle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'vNumber', label: isBn ? 'গাড়ি নম্বর' : 'Vehicle Number', value: vNumber, required: true },
        { name: 'vType', label: isBn ? 'যানবাহনের ধরন' : 'Vehicle Type', value: vType, required: true },
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
      await apiRequest(`/fleet/vehicles?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleNumber: vNumber.trim(),
          vehicleType: vType.trim(),
          ownerName: vOwner.trim() || undefined,
          driverName: vDriver.trim() || undefined,
          driverMobile: vMobile.trim() || undefined,
          fitnessExpiry: vFitnessExpiry || undefined,
          insuranceExpiry: vInsuranceExpiry || undefined,
          taxTokenExpiry: vTaxTokenExpiry || undefined,
        }),
      });
      onSaved(isBn ? 'নতুন যানবাহন সফলভাবে যুক্ত হয়েছে।' : 'Vehicle registered successfully.');
      setVehicleDialogOpen(false);
      setVNumber('');
      handleRefresh();
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error creating vehicle');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTrip = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rules: FieldRule[] = [
      { name: 'tVehicleId', label: isBn ? 'যানবাহন নির্বাচন' : 'Select Vehicle', value: tVehicleId, required: true, isSelect: true },
      { name: 'tTripNumber', label: isBn ? 'ট্রিপ নম্বর' : 'Trip Number', value: tTripNumber, required: true },
      { name: 'tDriverName', label: isBn ? 'চালকের নাম' : 'Driver Name', value: tDriverName, required: true },
      { name: 'tTripDate', label: isBn ? 'ট্রিপের তারিখ' : 'Trip Date', value: tTripDate, required: true, type: 'date' },
      { name: 'tOrigin', label: isBn ? 'যাত্রার উৎস' : 'Origin', value: tOrigin, required: true },
      { name: 'tDestination', label: isBn ? 'গন্তব্য' : 'Destination', value: tDestination, required: true },
      { name: 'tStartOdo', label: isBn ? 'শুরুর ওডোমিটার' : 'Start Odometer', value: tStartOdo, required: true, type: 'nonNegativeNumber' },
      {
        name: 'tEndOdo',
        label: isBn ? 'শেষ ওডোমিটার' : 'End Odometer',
        value: tEndOdo,
        required: true,
        type: 'nonNegativeNumber',
        custom: (val) =>
          Number(val) <= Number(tStartOdo || 0)
            ? isBn
              ? 'শেষ ওডোমিটার অবশ্যই শুরুর ওডোমিটারের চেয়ে বড় হতে হবে।'
              : 'End odometer must be greater than start odometer.'
            : null,
      },
    ];
    if (tCargoWeight.trim()) rules.push({ name: 'tCargoWeight', label: isBn ? 'ওজন' : 'Cargo Weight', value: tCargoWeight, type: 'nonNegativeNumber' });
    if (tFuelCost.trim()) rules.push({ name: 'tFuelCost', label: isBn ? 'জ্বালানি খরচ' : 'Fuel Cost', value: tFuelCost, type: 'nonNegativeNumber' });
    if (tTollCost.trim()) rules.push({ name: 'tTollCost', label: isBn ? 'টোল খরচ' : 'Toll Cost', value: tTollCost, type: 'nonNegativeNumber' });
    if (tFreightAmount.trim()) rules.push({ name: 'tFreightAmount', label: isBn ? 'ফ্রেইট আয়' : 'Freight Revenue', value: tFreightAmount, type: 'nonNegativeNumber' });

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
      await apiRequest(`/fleet/trips?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: tVehicleId,
          factoryId: factoryId || undefined,
          tripNumber: tTripNumber.trim(),
          driverName: tDriverName.trim(),
          driverPhone: tDriverPhone.trim() || undefined,
          tripDate: tTripDate,
          origin: tOrigin.trim(),
          destination: tDestination.trim(),
          startOdometer: Number(tStartOdo),
          endOdometer: Number(tEndOdo),
          cargoDescription: tCargoDesc.trim() || undefined,
          cargoWeightKg: tCargoWeight ? Number(tCargoWeight) : undefined,
          freightAmount: tFreightAmount ? Number(tFreightAmount) : 0,
          fuelCost: tFuelCost ? Number(tFuelCost) : 0,
          tollOtherCost: tTollCost ? Number(tTollCost) : 0,
        }),
      });
      onSaved(isBn ? 'ট্রিপ সফলভাবে সংরক্ষণ করা হয়েছে।' : 'Trip recorded successfully.');
      setTripDialogOpen(false);
      setTTripNumber(`TRIP-${Date.now().toString().slice(-6)}`);
      handleRefresh();
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error recording trip');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFuelLog = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rules: FieldRule[] = [
      { name: 'fLogDate', label: isBn ? 'তারিখ' : 'Date', value: fLogDate, required: true, type: 'date' },
      { name: 'fFuelType', label: isBn ? 'জ্বালানির ধরন' : 'Fuel Type', value: fFuelType, required: true },
      { name: 'fQuantity', label: isBn ? 'পরিমাণ (লিটার)' : 'Quantity (Liters)', value: fQuantity, required: true, type: 'positiveNumber' },
      { name: 'fRate', label: isBn ? 'প্রতি লিটার দর' : 'Rate Per Liter', value: fRate, required: true, type: 'positiveNumber' },
    ];
    if (fOdometer.trim()) rules.push({ name: 'fOdometer', label: isBn ? 'ওডোমিটার রিডিং' : 'Odometer', value: fOdometer, type: 'nonNegativeNumber' });

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
      await apiRequest(`/fleet/fuel-logs?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: fVehicleId || undefined,
          factoryId: factoryId || undefined,
          logDate: fLogDate,
          fuelType: fFuelType.trim(),
          quantityLiters: Number(fQuantity),
          ratePerLiter: Number(fRate),
          odometerReading: fOdometer ? Number(fOdometer) : undefined,
          fillingStation: fStation.trim() || undefined,
          invoiceOrSlipNumber: fSlipNumber.trim() || undefined,
          driverOrOperator: fDriver.trim() || undefined,
        }),
      });
      onSaved(isBn ? 'জ্বালানি লগ সফলভাবে সংরক্ষণ করা হয়েছে।' : 'Fuel entry saved successfully.');
      setFuelDialogOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error saving fuel log');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateMaintenance = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rules: FieldRule[] = [
      { name: 'mVehicleId', label: isBn ? 'যানবাহন নির্বাচন' : 'Vehicle', value: mVehicleId, required: true, isSelect: true },
      { name: 'mType', label: isBn ? 'সার্ভিস ধরন' : 'Maintenance Type', value: mType, required: true },
      { name: 'mDate', label: isBn ? 'সার্ভিসের তারিখ' : 'Service Date', value: mDate, required: true, type: 'date' },
      { name: 'mCost', label: isBn ? 'মোট খরচ' : 'Cost (BDT)', value: mCost, required: true, type: 'positiveNumber' },
    ];
    if (mOdometer.trim()) rules.push({ name: 'mOdometer', label: isBn ? 'ওডোমিটার' : 'Odometer', value: mOdometer, type: 'nonNegativeNumber' });
    if (mNextDueKm.trim()) rules.push({ name: 'mNextDueKm', label: isBn ? 'পরবর্তী সার্ভিস' : 'Next Service Due', value: mNextDueKm, type: 'nonNegativeNumber' });

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
      await apiRequest(`/fleet/maintenance?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: mVehicleId,
          maintenanceType: mType.trim(),
          serviceDate: mDate,
          odometerReading: mOdometer ? Number(mOdometer) : undefined,
          cost: Number(mCost),
          serviceCenter: mCenter.trim() || undefined,
          description: mDesc.trim() || undefined,
          nextServiceDueKm: mNextDueKm ? Number(mNextDueKm) : undefined,
        }),
      });
      onSaved(isBn ? 'সার্ভিসিং রেকর্ড সফলভাবে সংরক্ষিত হয়েছে।' : 'Maintenance entry saved successfully.');
      setMaintenanceDialogOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error saving maintenance');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Calculations for Trip modal preview
  const previewDistance = Math.max(0, Number(tEndOdo || 0) - Number(tStartOdo || 0));
  const previewTotalTransportCost = Number(tFuelCost || 0) + Number(tTollCost || 0);
  const previewFuelCostPerKm = previewDistance > 0 ? (Number(tFuelCost || 0) / previewDistance).toFixed(2) : '0.00';
  const previewTransportCostPerKm = previewDistance > 0 ? (previewTotalTransportCost / previewDistance).toFixed(2) : '0.00';

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Title & Actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'যানবাহন ও জ্বালানি ব্যবস্থাপনা (Fleet & Fuel Desk)' : 'Vehicle & Fuel Management (Fleet Desk)'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'ট্রিপ ট্র্যাকিং, জ্বালানি খরচ/কিমি, মাইলেজ ও মেইনটেন্যান্স হিসাব'
              : 'Trip tracking, fuel cost/KM, mileage logs, and preventive maintenance'}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={handleRefresh}>
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={openTripDialog}
          >
            {isBn ? 'নতুন ট্রিপ লগ' : 'Record Trip'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<LocalGasStationRoundedIcon />}
            onClick={openFuelDialog}
          >
            {isBn ? 'জ্বালানি ভাউচার' : 'Fuel Voucher'}
          </Button>
        </Stack>
      </Stack>

      {/* Compliance Overdue / Due Soon Alert */}
      {analytics?.complianceAlerts?.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {isBn ? 'কাগজপত্রের মেয়াদ সংক্রান্ত সতর্কতা:' : 'Vehicle Document Compliance Alerts:'}
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {analytics.complianceAlerts.map((a: any, idx: number) => (
              <Chip
                key={idx}
                size="small"
                color={a.isExpired ? 'error' : 'warning'}
                label={`${a.vehicleNumber} - ${a.type} (${new Date(a.expiryDate).toLocaleDateString()})`}
              />
            ))}
          </Stack>
        </Alert>
      )}

      {/* Fleet KPI Metric Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Card sx={{ flex: 1, borderLeft: '4px solid #1976d2' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'সক্রিয় যানবাহন ও ট্রিপ' : 'Fleet Size & Trips'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {analytics?.totalVehicles ?? 0} {isBn ? 'টি গাড়ি' : 'Units'} / {analytics?.totalTrips ?? 0} {isBn ? 'ট্রিপ' : 'Trips'}
            </Typography>
            <Typography variant="caption" color="primary">
              {isBn ? `মোট দূরত্ব: ${analytics?.totalDistanceKm?.toLocaleString() ?? 0} কিমি` : `Distance: ${analytics?.totalDistanceKm?.toLocaleString() ?? 0} KM`}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #ed6c02' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'জ্বালানি খরচ / কিমি' : 'Avg Fuel Cost / KM'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              ৳ {analytics?.avgFuelCostPerKm?.toFixed(2) ?? '0.00'} / KM
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? `মোট জ্বালানি: ${analytics?.totalFuelLiters?.toLocaleString() ?? 0} লিটার` : `Fuel Consumed: ${analytics?.totalFuelLiters?.toLocaleString() ?? 0} L`}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'পরিবহন খরচ / কিমি' : 'Avg Transport Cost / KM'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              ৳ {analytics?.avgTransportCostPerKm?.toFixed(2) ?? '0.00'} / KM
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? `মোট খরচ: ৳${analytics?.totalTransportCost?.toLocaleString() ?? 0}` : `Total Cost: ৳${analytics?.totalTransportCost?.toLocaleString() ?? 0}`}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #9c27b0' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'মোট ফ্রেইট আয় ও সার্ভিস খরচ' : 'Freight Revenue & Service'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              ৳ {analytics?.totalFreightRevenue?.toLocaleString() ?? 0}
            </Typography>
            <Typography variant="caption" color="secondary">
              {isBn ? `সার্ভিসিং ব্যয়: ৳${analytics?.totalMaintenanceExpense?.toLocaleString() ?? 0}` : `Maintenance: ৳${analytics?.totalMaintenanceExpense?.toLocaleString() ?? 0}`}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<LocalShippingRoundedIcon />} iconPosition="start" label={isBn ? 'ট্রিপ ও মাইলেজ রেজিস্টার' : 'Trips & Mileage'} />
          <Tab icon={<LocalGasStationRoundedIcon />} iconPosition="start" label={isBn ? 'জ্বালানি লগ রেজিস্টার' : 'Fuel Log'} />
          <Tab icon={<SpeedRoundedIcon />} iconPosition="start" label={isBn ? 'যানবাহন তালিকা' : 'Vehicle Registry'} />
          <Tab icon={<BuildRoundedIcon />} iconPosition="start" label={isBn ? 'সার্ভিসিং ও মেরামত' : 'Maintenance & Repair'} />
        </Tabs>
      </Paper>

      {/* Tab 0: Trips & Mileage */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'সর্বশেষ ট্রিপ ও মাইলেজ হিসাব' : 'Recent Vehicle Trips & Distance Records'}
            </Typography>
            <Button size="small" variant="contained" onClick={() => setTripDialogOpen(true)}>
              {isBn ? '+ ট্রিপ যোগ করুন' : '+ Record Trip'}
            </Button>
          </Stack>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ট্রিপ নং' : 'Trip #'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'গাড়ি ও চালক' : 'Vehicle & Driver'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'রুট (উৎস → গন্তব্য)' : 'Route'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ওডোমিটার (কিমি)' : 'Odometer (KM)'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'দূরত্ব' : 'Distance'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'জ্বালানি খরচ' : 'Fuel Cost'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'জ্বালানি/কিমি' : 'Fuel/KM'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পরিবহন/কিমি' : 'Cost/KM'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    {isBn ? 'কোনো ট্রিপের তথ্য পাওয়া যায়নি।' : 'No vehicle trips recorded yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t.tripNumber}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(t.tripDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{t.vehicle?.vehicleNumber || 'N/A'}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{t.driverName}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={`${t.origin} → ${t.destination}`}>{t.origin} → {t.destination}</Typography></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(t.startOdometer)} - {Number(t.endOdometer)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(t.distanceKm)} KM</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(t.fuelCost).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(t.fuelCostPerKm).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(t.transportCostPerKm).toFixed(2)}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" color="success" label={t.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 1: Fuel Log */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'জ্বালানি ভাউচার ও তেলের খরচ লগ' : 'Fuel Purchase & Dispense Records'}
            </Typography>
            <Button size="small" variant="contained" color="secondary" onClick={() => setFuelDialogOpen(true)}>
              {isBn ? '+ জ্বালানি ভাউচার' : '+ Add Fuel Voucher'}
            </Button>
          </Stack>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'গাড়ি / ইকুইপমেন্ট' : 'Vehicle / Equipment'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তেলের ধরন' : 'Fuel Type'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পরিমাণ (লিটার)' : 'Quantity (L)'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'দর (৳/লিটার)' : 'Rate (৳/L)'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মোট খরচ' : 'Total Cost'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পাম্প / ফিলিং স্টেশন' : 'Filling Station'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'স্লিপ নং' : 'Slip #'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fuelLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    {isBn ? 'কোনো জ্বালানি লগ এন্ট্রি নেই।' : 'No fuel log entries found.'}
                  </TableCell>
                </TableRow>
              ) : (
                fuelLogs.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(f.logDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.vehicle?.vehicleNumber || (f.machineId ? `Machine: ${f.machineId}` : 'Plant Generator')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={f.fuelType} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(f.quantityLiters).toFixed(2)} L</TableCell>
                    <TableCell align="right">৳{Number(f.ratePerLiter).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>৳{Number(f.totalCost).toLocaleString()}</TableCell>
                    <TableCell>{f.fillingStation || '-'}</TableCell>
                    <TableCell>{f.invoiceOrSlipNumber || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 2: Vehicle Directory */}
      {activeTab === 2 && (
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'যানবাহন মাস্টার তালিকা ও কাগজপত্র' : 'Company Fleet & Vehicle Directory'}
            </Typography>
            <Button size="small" variant="contained" onClick={openVehicleDialog}>
              {isBn ? '+ নতুন গাড়ি যোগ' : '+ Add Vehicle'}
            </Button>
          </Stack>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'যানবাহন নম্বর' : 'Vehicle Number'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ধরন' : 'Type'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'নিয়মিত চালক' : 'Assigned Driver'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মোবাইল' : 'Contact'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফিটনেস মেয়াদ' : 'Fitness Expiry'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বীমা মেয়াদ' : 'Insurance Expiry'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ট্যাক্স টোকেন' : 'Tax Token'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    {isBn ? 'কোনো যানবাহন নিবন্ধিত নেই।' : 'No vehicles registered in fleet.'}
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{v.vehicleNumber}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={v.vehicleType} /></TableCell>
                    <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap title={v.driverName || '-'}>{v.driverName || '-'}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{v.driverMobile || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{v.taxTokenExpiry ? new Date(v.taxTokenExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" color={v.active ? 'success' : 'default'} label={v.active ? 'Active' : 'Inactive'} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 3: Maintenance & Servicing */}
      {activeTab === 3 && (
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'যানবাহন মেরামত ও পর্যায়ক্রমিক সার্ভিসিং লগ' : 'Vehicle Maintenance & Workshop Repairs'}
            </Typography>
            <Button size="small" variant="contained" onClick={openMaintenanceDialog}>
              {isBn ? '+ সার্ভিসিং এন্ট্রি' : '+ Record Maintenance'}
            </Button>
          </Stack>
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তারিখ' : 'Service Date'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'যানবাহন' : 'Vehicle'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'সার্ভিস টাইপ' : 'Type'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ওডোমিটার (কিমি)' : 'Odometer'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মোট খরচ' : 'Cost'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ওয়ার্কশপ' : 'Workshop / Center'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বিবরণ' : 'Description'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পরবর্তী সার্ভিস (কিমি)' : 'Next Due (KM)'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    {isBn ? 'কোনো সার্ভিসিং লগ নেই।' : 'No maintenance entries recorded.'}
                  </TableCell>
                </TableRow>
              ) : (
                maintenances.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(m.serviceDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{m.vehicle?.vehicleNumber || 'N/A'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={m.maintenanceType} /></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{m.odometerReading ? `${Number(m.odometerReading)} KM` : '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(m.cost).toLocaleString()}</TableCell>
                    <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={m.serviceCenter || '-'}>{m.serviceCenter || '-'}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={m.description || '-'}>{m.description || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{m.nextServiceDueKm ? `${Number(m.nextServiceDueKm)} KM` : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog: Add Vehicle */}
      <FormDialog
        open={vehicleDialogOpen}
        onClose={() => !busy && setVehicleDialogOpen(false)}
        onSubmit={handleCreateVehicle}
        title={isBn ? 'নতুন যানবাহন নিবন্ধন' : 'Register Vehicle'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ করুন' : 'Register Vehicle'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppTextField
            fieldName="vNumber"
            required
            label={isBn ? 'গাড়ি নম্বর (উদাঃ DHAKA-METRO-TA-11-2345)' : 'Vehicle Number'}
            value={vNumber}
            errorText={fieldErrors.vNumber}
            onValueChange={(val) => {
              setVNumber(val);
              setFieldErrors((p) => ({ ...p, vNumber: '' }));
            }}
          />
          <AppTextField
            fieldName="vType"
            required
            label={isBn ? 'যানবাহনের ধরন' : 'Vehicle Type'}
            value={vType}
            errorText={fieldErrors.vType}
            onValueChange={(val) => {
              setVType(val);
              setFieldErrors((p) => ({ ...p, vType: '' }));
            }}
          />
          <AppTextField
            fieldName="vOwner"
            label={isBn ? 'মালিকের নাম' : 'Owner Name'}
            value={vOwner}
            onValueChange={(val) => setVOwner(val)}
          />
          <AppTextField
            fieldName="vDriver"
            label={isBn ? 'চালকের নাম' : 'Driver Name'}
            value={vDriver}
            onValueChange={(val) => setVDriver(val)}
          />
          <AppTextField
            fieldName="vMobile"
            label={isBn ? 'মোবাইল নম্বর' : 'Driver Mobile'}
            value={vMobile}
            onValueChange={(val) => setVMobile(val)}
          />
        </FormGrid>

        <FormSection title={isBn ? 'কাগজপত্রের মেয়াদ' : 'Document Expiry Dates'}>
          <FormGrid columns={{ xs: 1, sm: 3 }}>
            <AppTextField
              fieldName="vFitnessExpiry"
              label={isBn ? 'ফিটনেস সার্টিফিকেট মেয়াদ' : 'Fitness Expiry Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={vFitnessExpiry}
              onValueChange={(val) => setVFitnessExpiry(val)}
            />
            <AppTextField
              fieldName="vInsuranceExpiry"
              label={isBn ? 'বীমা মেয়াদ' : 'Insurance Expiry Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={vInsuranceExpiry}
              onValueChange={(val) => setVInsuranceExpiry(val)}
            />
            <AppTextField
              fieldName="vTaxTokenExpiry"
              label={isBn ? 'ট্যাক্স টোকেন মেয়াদ' : 'Tax Token Expiry Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={vTaxTokenExpiry}
              onValueChange={(val) => setVTaxTokenExpiry(val)}
            />
          </FormGrid>
        </FormSection>
      </FormDialog>

      {/* Dialog: Record Trip */}
      <FormDialog
        open={tripDialogOpen}
        onClose={() => !busy && setTripDialogOpen(false)}
        onSubmit={handleCreateTrip}
        title={isBn ? 'নতুন ট্রিপ ও মাইলেজ এন্ট্রি' : 'Record Vehicle Trip'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'ট্রিপ সংরক্ষণ করুন' : 'Save Trip'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="md"
      >
        <FormSection title={isBn ? 'যানবাহন ও চালক' : 'Vehicle & Driver'}>
          <FormGrid columns={{ xs: 1, sm: 2 }}>
            <AppAutocomplete
              fieldName="tVehicleId"
              required
              label={isBn ? 'যানবাহন নির্বাচন' : 'Select Vehicle'}
              value={tVehicleId}
              errorText={fieldErrors.tVehicleId}
              options={vehicles.map((v) => ({
                value: v.id,
                label: v.vehicleNumber,
                badge: v.vehicleType,
              }))}
              emptyMessage={isBn ? 'কোনো গাড়ি নিবন্ধিত নেই — আগে গাড়ি যোগ করুন' : 'No vehicles registered — add a vehicle first'}
              onChange={(val) => {
                setTVehicleId(val);
                setFieldErrors((p) => ({ ...p, tVehicleId: '' }));
              }}
            />
            <AppTextField
              fieldName="tTripNumber"
              required
              label={isBn ? 'ট্রিপ নম্বর' : 'Trip Number'}
              value={tTripNumber}
              errorText={fieldErrors.tTripNumber}
              onValueChange={(val) => {
                setTTripNumber(val);
                setFieldErrors((p) => ({ ...p, tTripNumber: '' }));
              }}
            />
          </FormGrid>

          <FormGrid columns={{ xs: 1, sm: 3 }} sx={{ mt: 2 }}>
            <AppTextField
              fieldName="tDriverName"
              required
              label={isBn ? 'চালকের নাম' : 'Driver Name'}
              value={tDriverName}
              errorText={fieldErrors.tDriverName}
              onValueChange={(val) => {
                setTDriverName(val);
                setFieldErrors((p) => ({ ...p, tDriverName: '' }));
              }}
            />
            <AppTextField
              fieldName="tDriverPhone"
              label={isBn ? 'চালক মোবাইল' : 'Driver Mobile'}
              value={tDriverPhone}
              onValueChange={(val) => setTDriverPhone(val)}
            />
            <AppTextField
              fieldName="tTripDate"
              required
              label={isBn ? 'ট্রিপের তারিখ' : 'Trip Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={tTripDate}
              errorText={fieldErrors.tTripDate}
              onValueChange={(val) => {
                setTTripDate(val);
                setFieldErrors((p) => ({ ...p, tTripDate: '' }));
              }}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={isBn ? 'রুট ও ওডোমিটার' : 'Route & Odometer'}>
          <FormGrid columns={{ xs: 1, sm: 2 }}>
            <AppTextField
              fieldName="tOrigin"
              required
              label={isBn ? 'যাত্রার উৎস' : 'Origin'}
              value={tOrigin}
              errorText={fieldErrors.tOrigin}
              onValueChange={(val) => {
                setTOrigin(val);
                setFieldErrors((p) => ({ ...p, tOrigin: '' }));
              }}
            />
            <AppTextField
              fieldName="tDestination"
              required
              label={isBn ? 'গন্তব্য' : 'Destination'}
              value={tDestination}
              errorText={fieldErrors.tDestination}
              onValueChange={(val) => {
                setTDestination(val);
                setFieldErrors((p) => ({ ...p, tDestination: '' }));
              }}
            />
          </FormGrid>

          <FormGrid columns={{ xs: 1, sm: 3 }} sx={{ mt: 2 }}>
            <AppTextField
              fieldName="tStartOdo"
              required
              label={isBn ? 'শুরুর ওডোমিটার (কিমি)' : 'Start Odometer (KM)'}
              type="number"
              unit="KM"
              value={tStartOdo}
              errorText={fieldErrors.tStartOdo}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTStartOdo(val);
                setFieldErrors((p) => ({ ...p, tStartOdo: '', tEndOdo: '' }));
              }}
            />
            <AppTextField
              fieldName="tEndOdo"
              required
              label={isBn ? 'শেষ ওডোমিটার (কিমি)' : 'End Odometer (KM)'}
              type="number"
              unit="KM"
              value={tEndOdo}
              errorText={fieldErrors.tEndOdo}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTEndOdo(val);
                setFieldErrors((p) => ({ ...p, tEndOdo: '' }));
              }}
            />
            <AppTextField
              fieldName="tDistancePreview"
              label={isBn ? 'গণনাকৃত দূরত্ব' : 'Calculated Distance'}
              value={`${previewDistance} KM`}
              InputProps={{ readOnly: true }}
              helperText={isBn ? 'স্বয়ংক্রিয়ভাবে হিসাবকৃত' : 'Auto-calculated'}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={isBn ? 'মালপত্র ও খরচ-আয়' : 'Cargo & Trip Financials'}>
          <FormGrid columns={{ xs: 1, sm: 2 }}>
            <AppTextField
              fieldName="tCargoDesc"
              label={isBn ? 'মালপত্রের বিবরণ' : 'Cargo Description'}
              value={tCargoDesc}
              onValueChange={(val) => setTCargoDesc(val)}
            />
            <AppTextField
              fieldName="tCargoWeight"
              label={isBn ? 'ওজন (কেজি)' : 'Cargo Weight (KG)'}
              type="number"
              unit="KG"
              value={tCargoWeight}
              errorText={fieldErrors.tCargoWeight}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTCargoWeight(val);
                setFieldErrors((p) => ({ ...p, tCargoWeight: '' }));
              }}
            />
          </FormGrid>

          <FormGrid columns={{ xs: 1, sm: 3 }} sx={{ mt: 2 }}>
            <AppTextField
              fieldName="tFuelCost"
              label={isBn ? 'জ্বালানি খরচ (৳)' : 'Fuel Cost (BDT)'}
              type="number"
              prefixText="৳"
              value={tFuelCost}
              errorText={fieldErrors.tFuelCost}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTFuelCost(val);
                setFieldErrors((p) => ({ ...p, tFuelCost: '' }));
              }}
            />
            <AppTextField
              fieldName="tTollCost"
              label={isBn ? 'টোল ও অন্যান্য খরচ (৳)' : 'Toll / Other (BDT)'}
              type="number"
              prefixText="৳"
              value={tTollCost}
              errorText={fieldErrors.tTollCost}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTTollCost(val);
                setFieldErrors((p) => ({ ...p, tTollCost: '' }));
              }}
            />
            <AppTextField
              fieldName="tFreightAmount"
              label={isBn ? 'ফ্রেইট আয় (৳)' : 'Freight Revenue (BDT)'}
              type="number"
              prefixText="৳"
              value={tFreightAmount}
              errorText={fieldErrors.tFreightAmount}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setTFreightAmount(val);
                setFieldErrors((p) => ({ ...p, tFreightAmount: '' }));
              }}
            />
          </FormGrid>
        </FormSection>

        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {isBn ? 'স্বয়ংক্রিয়ভাবে গণনাকৃত হার:' : 'Auto Calculated Metrics:'}
          </Typography>
          <Stack direction="row" gap={4} flexWrap="wrap">
            <Typography variant="body2">
              <strong>{isBn ? 'মোট পরিবহন খরচ:' : 'Total Transport Cost:'}</strong> ৳{previewTotalTransportCost.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>{isBn ? 'জ্বালানি খরচ/কিমি:' : 'Fuel Cost/KM:'}</strong> ৳{previewFuelCostPerKm} / KM
            </Typography>
            <Typography variant="body2">
              <strong>{isBn ? 'পরিবহন খরচ/কিমি:' : 'Transport Cost/KM:'}</strong> ৳{previewTransportCostPerKm} / KM
            </Typography>
          </Stack>
        </Paper>
      </FormDialog>

      {/* Dialog: Record Fuel Log */}
      <FormDialog
        open={fuelDialogOpen}
        onClose={() => !busy && setFuelDialogOpen(false)}
        onSubmit={handleCreateFuelLog}
        title={isBn ? 'জ্বালানি খরচ ভাউচার এন্ট্রি' : 'Fuel Voucher Entry'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'ভাউচার সংরক্ষণ করুন' : 'Save Fuel Log'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        submitColor="secondary"
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppAutocomplete
              fieldName="fVehicleId"
              label={isBn ? 'যানবাহন (ঐচ্ছিক — খালি রাখলে মিল জেনারেটর)' : 'Vehicle (Optional — blank for Mill Generator)'}
              value={fVehicleId}
              options={vehicles.map((v) => ({
                value: v.id,
                label: v.vehicleNumber,
                badge: v.vehicleType,
              }))}
              emptyMessage={isBn ? 'কোনো গাড়ি নেই — মিল জেনারেটরের জন্য খালি রাখুন' : 'No vehicles — leave blank for mill generator'}
              onChange={(val) => setFVehicleId(val)}
            />
          </Box>

          <AppTextField
            fieldName="fLogDate"
            required
            label={isBn ? 'তারিখ' : 'Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={fLogDate}
            errorText={fieldErrors.fLogDate}
            onValueChange={(val) => {
              setFLogDate(val);
              setFieldErrors((p) => ({ ...p, fLogDate: '' }));
            }}
          />
          <AppTextField
            fieldName="fFuelType"
            required
            label={isBn ? 'জ্বালানির ধরন' : 'Fuel Type'}
            value={fFuelType}
            errorText={fieldErrors.fFuelType}
            onValueChange={(val) => {
              setFFuelType(val);
              setFieldErrors((p) => ({ ...p, fFuelType: '' }));
            }}
          />

          <AppTextField
            fieldName="fQuantity"
            required
            label={isBn ? 'পরিমাণ (লিটার)' : 'Quantity (Liters)'}
            type="number"
            unit="L"
            value={fQuantity}
            errorText={fieldErrors.fQuantity}
            inputProps={{ min: 0, step: '.1' }}
            onValueChange={(val) => {
              setFQuantity(val);
              setFieldErrors((p) => ({ ...p, fQuantity: '' }));
            }}
          />
          <AppTextField
            fieldName="fRate"
            required
            label={isBn ? 'প্রতি লিটার দর (৳)' : 'Rate Per Liter (BDT)'}
            type="number"
            prefixText="৳"
            value={fRate}
            errorText={fieldErrors.fRate}
            inputProps={{ min: 0, step: '.01' }}
            onValueChange={(val) => {
              setFRate(val);
              setFieldErrors((p) => ({ ...p, fRate: '' }));
            }}
          />
        </FormGrid>

        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isBn ? 'মোট প্রদেয় বিল:' : 'Total Fuel Cost:'} ৳{(Number(fQuantity || 0) * Number(fRate || 0)).toLocaleString()}
          </Typography>
        </Paper>

        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppTextField
            fieldName="fOdometer"
            label={isBn ? 'বর্তমান ওডোমিটার রিডিং (কিমি)' : 'Current Odometer (KM)'}
            type="number"
            unit="KM"
            value={fOdometer}
            errorText={fieldErrors.fOdometer}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setFOdometer(val);
              setFieldErrors((p) => ({ ...p, fOdometer: '' }));
            }}
          />
          <AppTextField
            fieldName="fStation"
            label={isBn ? 'ফিলিং স্টেশন / পাম্প' : 'Filling Station'}
            value={fStation}
            onValueChange={(val) => setFStation(val)}
          />
          <AppTextField
            fieldName="fSlipNumber"
            label={isBn ? 'ইনভয়েস / স্লিপ নম্বর' : 'Invoice / Slip #'}
            value={fSlipNumber}
            onValueChange={(val) => setFSlipNumber(val)}
          />
          <AppTextField
            fieldName="fDriver"
            label={isBn ? 'চালক / অপারেটর' : 'Driver / Operator'}
            value={fDriver}
            onValueChange={(val) => setFDriver(val)}
          />
        </FormGrid>
      </FormDialog>

      {/* Dialog: Record Maintenance */}
      <FormDialog
        open={maintenanceDialogOpen}
        onClose={() => !busy && setMaintenanceDialogOpen(false)}
        onSubmit={handleCreateMaintenance}
        title={isBn ? 'সার্ভিসিং ও মেরামত রেকর্ড' : 'Record Vehicle Maintenance'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সার্ভিসিং সংরক্ষণ করুন' : 'Save Maintenance'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppAutocomplete
              fieldName="mVehicleId"
              required
              label={isBn ? 'যানবাহন নির্বাচন' : 'Vehicle'}
              value={mVehicleId}
              errorText={fieldErrors.mVehicleId}
              options={vehicles.map((v) => ({
                value: v.id,
                label: v.vehicleNumber,
                badge: v.vehicleType,
              }))}
              emptyMessage={isBn ? 'কোনো গাড়ি নিবন্ধিত নেই — আগে গাড়ি যোগ করুন' : 'No vehicles registered — add a vehicle first'}
              onChange={(val) => {
                setMVehicleId(val);
                setFieldErrors((p) => ({ ...p, mVehicleId: '' }));
              }}
            />
          </Box>

          <AppTextField
            fieldName="mType"
            required
            label={isBn ? 'মেরামত/সার্ভিস ধরন' : 'Maintenance Type'}
            value={mType}
            errorText={fieldErrors.mType}
            onValueChange={(val) => {
              setMType(val);
              setFieldErrors((p) => ({ ...p, mType: '' }));
            }}
          />
          <AppTextField
            fieldName="mDate"
            required
            label={isBn ? 'সার্ভিসের তারিখ' : 'Service Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={mDate}
            errorText={fieldErrors.mDate}
            onValueChange={(val) => {
              setMDate(val);
              setFieldErrors((p) => ({ ...p, mDate: '' }));
            }}
          />

          <AppTextField
            fieldName="mCost"
            required
            label={isBn ? 'মোট খরচ (৳)' : 'Cost (BDT)'}
            type="number"
            prefixText="৳"
            value={mCost}
            errorText={fieldErrors.mCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setMCost(val);
              setFieldErrors((p) => ({ ...p, mCost: '' }));
            }}
          />
          <AppTextField
            fieldName="mOdometer"
            label={isBn ? 'ওডোমিটার (কিমি)' : 'Odometer (KM)'}
            type="number"
            unit="KM"
            value={mOdometer}
            errorText={fieldErrors.mOdometer}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setMOdometer(val);
              setFieldErrors((p) => ({ ...p, mOdometer: '' }));
            }}
          />

          <AppTextField
            fieldName="mCenter"
            label={isBn ? 'সার্ভিস সেন্টার / ওয়ার্কশপ' : 'Service Workshop'}
            value={mCenter}
            onValueChange={(val) => setMCenter(val)}
          />
          <AppTextField
            fieldName="mNextDueKm"
            label={isBn ? 'পরবর্তী সার্ভিসের নির্ধারিত মাইলেজ (কিমি)' : 'Next Service Due (KM)'}
            type="number"
            unit="KM"
            value={mNextDueKm}
            errorText={fieldErrors.mNextDueKm}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setMNextDueKm(val);
              setFieldErrors((p) => ({ ...p, mNextDueKm: '' }));
            }}
          />
        </FormGrid>

        <AppTextField
          fieldName="mDesc"
          label={isBn ? 'কাজের বিবরণ ও স্পেয়ার পার্টস' : 'Description & Spare Parts'}
          multiline
          rows={2}
          value={mDesc}
          onValueChange={(val) => setMDesc(val)}
        />
      </FormDialog>
    </Box>
  );
}

