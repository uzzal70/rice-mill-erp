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
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Trips, 1: Fuel Logs, 2: Vehicles, 3: Maintenance

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

  const handleCreateVehicle = async () => {
    try {
      await apiRequest(`/fleet/vehicles?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleNumber: vNumber,
          vehicleType: vType,
          ownerName: vOwner || undefined,
          driverName: vDriver || undefined,
          driverMobile: vMobile || undefined,
          fitnessExpiry: vFitnessExpiry || undefined,
          insuranceExpiry: vInsuranceExpiry || undefined,
          taxTokenExpiry: vTaxTokenExpiry || undefined,
        }),
      });
      onSaved(isBn ? 'নতুন যানবাহন সফলভাবে যুক্ত হয়েছে।' : 'Vehicle registered successfully.');
      setVehicleDialogOpen(false);
      setVNumber('');
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Error creating vehicle');
    }
  };

  const handleCreateTrip = async () => {
    try {
      await apiRequest(`/fleet/trips?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: tVehicleId,
          factoryId: factoryId || undefined,
          tripNumber: tTripNumber,
          driverName: tDriverName,
          driverPhone: tDriverPhone || undefined,
          tripDate: tTripDate,
          origin: tOrigin,
          destination: tDestination,
          startOdometer: Number(tStartOdo),
          endOdometer: Number(tEndOdo),
          cargoDescription: tCargoDesc || undefined,
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
    } catch (err: any) {
      alert(err.message || 'Error recording trip');
    }
  };

  const handleCreateFuelLog = async () => {
    try {
      await apiRequest(`/fleet/fuel-logs?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: fVehicleId || undefined,
          factoryId: factoryId || undefined,
          logDate: fLogDate,
          fuelType: fFuelType,
          quantityLiters: Number(fQuantity),
          ratePerLiter: Number(fRate),
          odometerReading: fOdometer ? Number(fOdometer) : undefined,
          fillingStation: fStation || undefined,
          invoiceOrSlipNumber: fSlipNumber || undefined,
          driverOrOperator: fDriver || undefined,
        }),
      });
      onSaved(isBn ? 'জ্বালানি লগ সফলভাবে সংরক্ষণ করা হয়েছে।' : 'Fuel entry saved successfully.');
      setFuelDialogOpen(false);
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Error saving fuel log');
    }
  };

  const handleCreateMaintenance = async () => {
    try {
      await apiRequest(`/fleet/maintenance?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: mVehicleId,
          maintenanceType: mType,
          serviceDate: mDate,
          odometerReading: mOdometer ? Number(mOdometer) : undefined,
          cost: Number(mCost),
          serviceCenter: mCenter || undefined,
          description: mDesc || undefined,
          nextServiceDueKm: mNextDueKm ? Number(mNextDueKm) : undefined,
        }),
      });
      onSaved(isBn ? 'সার্ভিসিং রেকর্ড সফলভাবে সংরক্ষিত হয়েছে।' : 'Maintenance entry saved successfully.');
      setMaintenanceDialogOpen(false);
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Error saving maintenance');
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
            onClick={() => setTripDialogOpen(true)}
          >
            {isBn ? 'নতুন ট্রিপ লগ' : 'Record Trip'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<LocalGasStationRoundedIcon />}
            onClick={() => setFuelDialogOpen(true)}
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
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'সর্বশেষ ট্রিপ ও মাইলেজ হিসাব' : 'Recent Vehicle Trips & Distance Records'}
            </Typography>
            <Button size="small" variant="contained" onClick={() => setTripDialogOpen(true)}>
              {isBn ? '+ ট্রিপ যোগ করুন' : '+ Record Trip'}
            </Button>
          </Stack>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell><strong>{isBn ? 'ট্রিপ নং' : 'Trip #'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'গাড়ি ও চালক' : 'Vehicle & Driver'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'রুট (উৎস → গন্তব্য)' : 'Route'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'ওডোমিটার (কিমি)' : 'Odometer (KM)'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'দূরত্ব' : 'Distance'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'জ্বালানি খরচ' : 'Fuel Cost'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'জ্বালানি/কিমি' : 'Fuel/KM'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'পরিবহন/কিমি' : 'Cost/KM'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
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
                    <TableCell sx={{ fontWeight: 600 }}>{t.tripNumber}</TableCell>
                    <TableCell>{new Date(t.tripDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.vehicle?.vehicleNumber || 'N/A'}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.driverName}</Typography>
                    </TableCell>
                    <TableCell>{t.origin} → {t.destination}</TableCell>
                    <TableCell align="right">{Number(t.startOdometer)} - {Number(t.endOdometer)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{Number(t.distanceKm)} KM</TableCell>
                    <TableCell align="right">৳{Number(t.fuelCost).toLocaleString()}</TableCell>
                    <TableCell align="right">৳{Number(t.fuelCostPerKm).toFixed(2)}</TableCell>
                    <TableCell align="right">৳{Number(t.transportCostPerKm).toFixed(2)}</TableCell>
                    <TableCell>
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
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'জ্বালানি ভাউচার ও তেলের খরচ লগ' : 'Fuel Purchase & Dispense Records'}
            </Typography>
            <Button size="small" variant="contained" color="secondary" onClick={() => setFuelDialogOpen(true)}>
              {isBn ? '+ জ্বালানি ভাউচার' : '+ Add Fuel Voucher'}
            </Button>
          </Stack>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'গাড়ি / ইকুইপমেন্ট' : 'Vehicle / Equipment'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'তেলের ধরন' : 'Fuel Type'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'পরিমাণ (লিটার)' : 'Quantity (L)'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'দর (৳/লিটার)' : 'Rate (৳/L)'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'মোট খরচ' : 'Total Cost'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'পাম্প / ফিলিং স্টেশন' : 'Filling Station'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'স্লিপ নং' : 'Slip #'}</strong></TableCell>
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
                    <TableCell>{new Date(f.logDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{f.vehicle?.vehicleNumber || (f.machineId ? `Machine: ${f.machineId}` : 'Plant Generator')}</TableCell>
                    <TableCell><Chip size="small" label={f.fuelType} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{Number(f.quantityLiters).toFixed(2)} L</TableCell>
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
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'যানবাহন মাস্টার তালিকা ও কাগজপত্র' : 'Company Fleet & Vehicle Directory'}
            </Typography>
            <Button size="small" variant="contained" onClick={() => setVehicleDialogOpen(true)}>
              {isBn ? '+ নতুন গাড়ি যোগ' : '+ Add Vehicle'}
            </Button>
          </Stack>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell><strong>{isBn ? 'যানবাহন নম্বর' : 'Vehicle Number'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'ধরন' : 'Type'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'নিয়মিত চালক' : 'Assigned Driver'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'মোবাইল' : 'Contact'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'ফিটনেস মেয়াদ' : 'Fitness Expiry'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'বীমা মেয়াদ' : 'Insurance Expiry'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'ট্যাক্স টোকেন' : 'Tax Token'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
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
                    <TableCell sx={{ fontWeight: 600 }}>{v.vehicleNumber}</TableCell>
                    <TableCell><Chip size="small" label={v.vehicleType} /></TableCell>
                    <TableCell>{v.driverName || '-'}</TableCell>
                    <TableCell>{v.driverMobile || '-'}</TableCell>
                    <TableCell>{v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{v.taxTokenExpiry ? new Date(v.taxTokenExpiry).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
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
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isBn ? 'যানবাহন মেরামত ও পর্যায়ক্রমিক সার্ভিসিং লগ' : 'Vehicle Maintenance & Workshop Repairs'}
            </Typography>
            <Button size="small" variant="contained" onClick={() => setMaintenanceDialogOpen(true)}>
              {isBn ? '+ সার্ভিসিং এন্ট্রি' : '+ Record Maintenance'}
            </Button>
          </Stack>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell><strong>{isBn ? 'তারিখ' : 'Service Date'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'যানবাহন' : 'Vehicle'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'সার্ভিস টাইপ' : 'Type'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'ওডোমিটার (কিমি)' : 'Odometer'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'মোট খরচ' : 'Cost'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'ওয়ার্কশপ' : 'Workshop / Center'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'বিবরণ' : 'Description'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'পরবর্তী সার্ভিস (কিমি)' : 'Next Due (KM)'}</strong></TableCell>
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
                    <TableCell>{new Date(m.serviceDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{m.vehicle?.vehicleNumber || 'N/A'}</TableCell>
                    <TableCell><Chip size="small" label={m.maintenanceType} /></TableCell>
                    <TableCell align="right">{m.odometerReading ? `${Number(m.odometerReading)} KM` : '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>৳{Number(m.cost).toLocaleString()}</TableCell>
                    <TableCell>{m.serviceCenter || '-'}</TableCell>
                    <TableCell>{m.description || '-'}</TableCell>
                    <TableCell align="right">{m.nextServiceDueKm ? `${Number(m.nextServiceDueKm)} KM` : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog: Add Vehicle */}
      <Dialog open={vehicleDialogOpen} onClose={() => setVehicleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isBn ? 'নতুন যানবাহন নিবন্ধন' : 'Register Vehicle'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label={isBn ? 'গাড়ি নম্বর (উদাঃ DHAKA-METRO-TA-11-2345)' : 'Vehicle Number'}
            value={vNumber}
            onChange={(e) => setVNumber(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label={isBn ? 'যানবাহনের ধরন' : 'Vehicle Type'}
            value={vType}
            onChange={(e) => setVType(e.target.value)}
            fullWidth
          />
          <TextField
            label={isBn ? 'মালিকের নাম' : 'Owner Name'}
            value={vOwner}
            onChange={(e) => setVOwner(e.target.value)}
            fullWidth
          />
          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'চালকের নাম' : 'Driver Name'}
              value={vDriver}
              onChange={(e) => setVDriver(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'মোবাইল নম্বর' : 'Driver Mobile'}
              value={vMobile}
              onChange={(e) => setVMobile(e.target.value)}
              fullWidth
            />
          </Stack>
          <Divider>{isBn ? 'কাগজপত্রের মেয়াদ' : 'Document Expiry Dates'}</Divider>
          <TextField
            label={isBn ? 'ফিটনেস সার্টিফিকেট মেয়াদ' : 'Fitness Expiry Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={vFitnessExpiry}
            onChange={(e) => setVFitnessExpiry(e.target.value)}
            fullWidth
          />
          <TextField
            label={isBn ? 'বীমা মেয়াদ' : 'Insurance Expiry Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={vInsuranceExpiry}
            onChange={(e) => setVInsuranceExpiry(e.target.value)}
            fullWidth
          />
          <TextField
            label={isBn ? 'ট্যাক্স টোকেন মেয়াদ' : 'Tax Token Expiry Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={vTaxTokenExpiry}
            onChange={(e) => setVTaxTokenExpiry(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialogOpen(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button variant="contained" onClick={handleCreateVehicle} disabled={!vNumber.trim()}>
            {isBn ? 'সংরক্ষণ করুন' : 'Register Vehicle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Record Trip */}
      <Dialog open={tripDialogOpen} onClose={() => setTripDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isBn ? 'নতুন ট্রিপ ও মাইলেজ এন্ট্রি' : 'Record Vehicle Trip'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Stack direction="row" gap={2}>
            <TextField
              select
              SelectProps={{ native: true }}
              label={isBn ? 'যানবাহন নির্বাচন' : 'Select Vehicle'}
              value={tVehicleId}
              onChange={(e) => setTVehicleId(e.target.value)}
              required
              fullWidth
            >
              <option value="">{isBn ? '-- গাড়ি বেছে নিন --' : '-- Choose Vehicle --'}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} ({v.vehicleType})
                </option>
              ))}
            </TextField>
            <TextField
              label={isBn ? 'ট্রিপ নম্বর' : 'Trip Number'}
              value={tTripNumber}
              onChange={(e) => setTTripNumber(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'চালকের নাম' : 'Driver Name'}
              value={tDriverName}
              onChange={(e) => setTDriverName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={isBn ? 'চালক মোবাইল' : 'Driver Mobile'}
              value={tDriverPhone}
              onChange={(e) => setTDriverPhone(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'ট্রিপের তারিখ' : 'Trip Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={tTripDate}
              onChange={(e) => setTTripDate(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'যাত্রার উৎস' : 'Origin'}
              value={tOrigin}
              onChange={(e) => setTOrigin(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'গন্তব্য' : 'Destination'}
              value={tDestination}
              onChange={(e) => setTDestination(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'শুরুর ওডোমিটার (কিমি)' : 'Start Odometer (KM)'}
              type="number"
              value={tStartOdo}
              onChange={(e) => setTStartOdo(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={isBn ? 'শেষ ওডোমিটার (কিমি)' : 'End Odometer (KM)'}
              type="number"
              value={tEndOdo}
              onChange={(e) => setTEndOdo(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={isBn ? 'গণনাকৃত দূরত্ব' : 'Calculated Distance'}
              value={`${previewDistance} KM`}
              disabled
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'মালপত্রের বিবরণ' : 'Cargo Description'}
              value={tCargoDesc}
              onChange={(e) => setTCargoDesc(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'ওজন (কেজি)' : 'Cargo Weight (KG)'}
              type="number"
              value={tCargoWeight}
              onChange={(e) => setTCargoWeight(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'জ্বালানি খরচ (৳)' : 'Fuel Cost (BDT)'}
              type="number"
              value={tFuelCost}
              onChange={(e) => setTFuelCost(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'টোল ও অন্যান্য খরচ (৳)' : 'Toll / Other (BDT)'}
              type="number"
              value={tTollCost}
              onChange={(e) => setTTollCost(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'ফ্রেইট আয় (৳)' : 'Freight Revenue (BDT)'}
              type="number"
              value={tFreightAmount}
              onChange={(e) => setTFreightAmount(e.target.value)}
              fullWidth
            />
          </Stack>

          {/* Real-time Calculation Summary Card */}
          <Paper sx={{ p: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {isBn ? 'স্বয়ংক্রিয়ভাবে গণনাকৃত হার:' : 'Auto Calculated Metrics:'}
            </Typography>
            <Stack direction="row" gap={4}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTripDialogOpen(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button
            variant="contained"
            onClick={handleCreateTrip}
            disabled={!tVehicleId || !tDriverName.trim() || previewDistance <= 0}
          >
            {isBn ? 'ট্রিপ সংরক্ষণ করুন' : 'Save Trip'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Record Fuel Log */}
      <Dialog open={fuelDialogOpen} onClose={() => setFuelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isBn ? 'জ্বালানি খরচ ভাউচার এন্ট্রি' : 'Fuel Voucher Entry'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            select
            SelectProps={{ native: true }}
            label={isBn ? 'যানবাহন (ঐচ্ছিক)' : 'Vehicle (Optional)'}
            value={fVehicleId}
            onChange={(e) => setFVehicleId(e.target.value)}
            fullWidth
          >
            <option value="">{isBn ? '-- সাধারণ / মিল জেনারেটর --' : '-- Mill Generator / Equipment --'}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber}
              </option>
            ))}
          </TextField>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'তারিখ' : 'Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={fLogDate}
              onChange={(e) => setFLogDate(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'জ্বালানির ধরন' : 'Fuel Type'}
              value={fFuelType}
              onChange={(e) => setFFuelType(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'পরিমাণ (লিটার)' : 'Quantity (Liters)'}
              type="number"
              value={fQuantity}
              onChange={(e) => setFQuantity(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={isBn ? 'প্রতি লিটার দর (৳)' : 'Rate Per Liter (BDT)'}
              type="number"
              value={fRate}
              onChange={(e) => setFRate(e.target.value)}
              required
              fullWidth
            />
          </Stack>

          <Paper sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isBn ? 'মোট প্রদেয় বিল:' : 'Total Fuel Cost:'} ৳{(Number(fQuantity || 0) * Number(fRate || 0)).toLocaleString()}
            </Typography>
          </Paper>

          <TextField
            label={isBn ? 'বর্তমান ওডোমিটার রিডিং (কিমি)' : 'Current Odometer (KM)'}
            type="number"
            value={fOdometer}
            onChange={(e) => setFOdometer(e.target.value)}
            fullWidth
          />

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'ফিলিং স্টেশন / পাম্প' : 'Filling Station'}
              value={fStation}
              onChange={(e) => setFStation(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'ইনভয়েস / স্লিপ নম্বর' : 'Invoice / Slip #'}
              value={fSlipNumber}
              onChange={(e) => setFSlipNumber(e.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            label={isBn ? 'চালক / অপারেটর' : 'Driver / Operator'}
            value={fDriver}
            onChange={(e) => setFDriver(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFuelDialogOpen(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleCreateFuelLog}
            disabled={Number(fQuantity) <= 0 || Number(fRate) <= 0}
          >
            {isBn ? 'ভাউচার সংরক্ষণ করুন' : 'Save Fuel Log'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Record Maintenance */}
      <Dialog open={maintenanceDialogOpen} onClose={() => setMaintenanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isBn ? 'সার্ভিসিং ও মেরামত রেকর্ড' : 'Record Vehicle Maintenance'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            select
            SelectProps={{ native: true }}
            label={isBn ? 'যানবাহন নির্বাচন' : 'Vehicle'}
            value={mVehicleId}
            onChange={(e) => setMVehicleId(e.target.value)}
            required
            fullWidth
          >
            <option value="">{isBn ? '-- গাড়ি বেছে নিন --' : '-- Select Vehicle --'}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber}
              </option>
            ))}
          </TextField>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'মেরামত/সার্ভিস ধরন' : 'Maintenance Type'}
              value={mType}
              onChange={(e) => setMType(e.target.value)}
              fullWidth
            />
            <TextField
              label={isBn ? 'সার্ভিসের তারিখ' : 'Service Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" gap={2}>
            <TextField
              label={isBn ? 'মোট খরচ (৳)' : 'Cost (BDT)'}
              type="number"
              value={mCost}
              onChange={(e) => setMCost(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={isBn ? 'ওডোমিটার (কিমি)' : 'Odometer (KM)'}
              type="number"
              value={mOdometer}
              onChange={(e) => setMOdometer(e.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            label={isBn ? 'সার্ভিস সেন্টার / ওয়ার্কশপ' : 'Service Workshop'}
            value={mCenter}
            onChange={(e) => setMCenter(e.target.value)}
            fullWidth
          />

          <TextField
            label={isBn ? 'কাজের বিবরণ ও স্পেয়ার পার্টস' : 'Description & Spare Parts'}
            multiline
            rows={2}
            value={mDesc}
            onChange={(e) => setMDesc(e.target.value)}
            fullWidth
          />

          <TextField
            label={isBn ? 'পরবর্তী সার্ভিসের নির্ধারিত মাইলেজ (কিমি)' : 'Next Service Due (KM)'}
            type="number"
            value={mNextDueKm}
            onChange={(e) => setMNextDueKm(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialogOpen(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button
            variant="contained"
            onClick={handleCreateMaintenance}
            disabled={!mVehicleId || Number(mCost) <= 0}
          >
            {isBn ? 'সার্ভিসিং সংরক্ষণ করুন' : 'Save Maintenance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

