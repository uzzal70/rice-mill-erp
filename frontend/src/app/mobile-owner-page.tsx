'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Divider,
  Alert,
  Stack,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FactoryIcon from '@mui/icons-material/Factory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ApprovalItem {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  amountOrQty: string;
  submittedAt: string;
}

export function MobileOwnerPage({
  companyId,
  language = 'bn',
}: {
  companyId?: string;
  language?: 'en' | 'bn';
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [phoneFrame, setPhoneFrame] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [pendingList, setPendingList] = useState<ApprovalItem[]>([
    {
      id: 'po-01',
      entityType: 'PURCHASE_ORDER',
      title: 'Paddy Purchase #PO-2026-089',
      subtitle: 'Bismillah Traders · BR-28 (15 Tons)',
      amountOrQty: '৳ 5,40,000',
      submittedAt: 'Today 10:30 AM',
    },
    {
      id: 'exp-02',
      entityType: 'EXPENSE',
      title: 'Boiler Rice Husk Fuel Bill',
      subtitle: 'Factory 1 · 12 Tons Biomass',
      amountOrQty: '৳ 48,000',
      submittedAt: 'Today 11:15 AM',
    },
    {
      id: 'batch-03',
      entityType: 'PRODUCTION_BATCH',
      title: 'Milling Run #MB-104',
      subtitle: 'Line A · Miniket Paddy (8,000 KG)',
      amountOrQty: '66.4% Recovery',
      submittedAt: 'Today 01:45 PM',
    },
  ]);

  const handleApprove = (id: string, title: string) => {
    setPendingList(prev => prev.filter(item => item.id !== id));
    setToastMsg(`✓ Approved: ${title}`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleReject = (id: string, title: string) => {
    setPendingList(prev => prev.filter(item => item.id !== id));
    setToastMsg(`✕ Rejected: ${title}`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const isBn = language === 'bn';

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Banner & Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a365d' }}>
            {isBn ? 'মোবাইল ওনার ককপিট (#67)' : 'Mobile Owner Cockpit (#67)'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? '৭টি মূল ব্যবসায়িক মেট্রিক এবং তাৎক্ষণিক মোবাইল অনুমোদন'
              : '7 Core Executive Metrics (Sales, Production, Profit, Stock, Cash, Bank, Due) & 1-Tap Approvals'}
          </Typography>
        </Box>
        <FormControlLabel
          control={<Switch checked={phoneFrame} onChange={e => setPhoneFrame(e.target.checked)} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SmartphoneIcon fontSize="small" />
              <Typography variant="caption">{isBn ? 'ফোন ফ্রেম' : 'Phone Frame'}</Typography>
            </Box>
          }
        />
      </Box>

      {toastMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {toastMsg}
        </Alert>
      )}

      {/* Main Container - either responsive full width or mobile smartphone frame */}
      <Box
        sx={{
          maxWidth: phoneFrame ? 420 : '100%',
          margin: phoneFrame ? '0 auto' : '0',
          border: phoneFrame ? '12px solid #2d3748' : 'none',
          borderRadius: phoneFrame ? '36px' : '0',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          boxShadow: phoneFrame ? '0 20px 25px -5px rgba(0, 0, 0, 0.2)' : 'none',
        }}
      >
        {/* Mobile Header Bar */}
        <Box sx={{ backgroundColor: '#1a365d', color: '#fff', p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                {isBn ? 'রূপালী অটো রাইস মিল' : 'Rupali Auto Rice Mill'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {isBn ? 'লাইভ ওনার ড্যাশবোর্ড' : 'Live Owner View · Today'}
              </Typography>
            </Box>
            <Chip
              label={isBn ? 'সরাসরি চালু' : 'LIVE'}
              size="small"
              color="success"
              sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
            />
          </Box>
        </Box>

        {/* Mobile Tabs */}
        <Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={isBn ? 'মূল মেট্রিক্স (৭)' : '7 Key Metrics'} sx={{ fontSize: 13, fontWeight: 700 }} />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{isBn ? 'অনুমোদন' : 'Approvals'}</span>
                  {pendingList.length > 0 && (
                    <Chip label={pendingList.length} size="small" color="error" sx={{ height: 18, fontSize: 11 }} />
                  )}
                </Box>
              }
              sx={{ fontSize: 13, fontWeight: 700 }}
            />
          </Tabs>
        </Paper>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 ? (
            /* 7 CORE OWNER METRICS */
            <Grid container spacing={1.5}>
              {/* 1. SALES */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #3182ce' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '১. আজকের বিক্রয় (Sales)' : '1. Sales (Today)'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} color="primary">
                        ৳ ৪,৮৫,০০০
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? 'মোট ভলিউম: ৯,২০০ কেজি · ৩টি চালান' : 'Volume: 9,200 KG · 3 Orders fulfilled'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 2. PRODUCTION */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #38a169' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FactoryIcon sx={{ color: '#38a169' }} />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '২. মাড়াই উৎপাদন (Production)' : '2. Production'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#38a169' }}>
                        ১২,৪০০ KG
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? 'প্রথম চাল: ৮,২০০ কেজি · রিকভারি: ৬৬.২%' : 'Head Rice: 8,200 KG · Yield: 66.2%'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 3. PROFIT */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #805ad5' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MonetizationOnIcon sx={{ color: '#805ad5' }} />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '৩. লাভ (Profit)' : '3. Profit Margin'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#805ad5' }}>
                        ৳ ৮০,০২৫
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? 'আনুমানিক নিট মার্জিন: ১২.৪%' : 'Estimated Net Margin: 12.4%'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 4. STOCK */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #dd6b20' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarehouseIcon sx={{ color: '#dd6b20' }} />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '৪. বর্তমান মজুদ (Stock)' : '4. Warehouse Stock'}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#dd6b20' }}>
                        ১,৯৩৩ {isBn ? 'বস্তা ধান' : 'Bags Paddy'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn
                        ? 'ধান: ১৪৫ টন · চাল: ৮৪ টন (১,৬৮০ বস্তা)'
                        : 'Paddy: 145 Tons · Rice: 84 Tons (1,680 Bags)'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 5. CASH */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #2b6cb0' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWalletIcon color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '৫. নগদ তহবিল (Cash)' : '5. Cash in Hand'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800}>
                        ৳ ৪,২৫,০০০
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? 'মিলের ক্যাশ কাউন্টার ও ড্রয়ার' : 'Factory Safe & Petty Cash'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 6. BANK */}
              <Grid item xs={12} sm={phoneFrame ? 12 : 6}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #319795' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceIcon sx={{ color: '#319795' }} />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '৬. ব্যাংক ব্যালেন্স (Bank)' : '6. Bank Accounts'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#319795' }}>
                        ৳ ৩৮,৫০,০০০
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? '৩টি ব্যাংক অ্যাকাউন্ট (IBBL, Dutch-Bangla, City)' : '3 Active Corporate Accounts'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 7. DUE */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #e53e3e' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentReturnIcon color="error" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {isBn ? '৭. মোট বকেয়া (Due Position)' : '7. Due & Receivables'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} color="error">
                        ৳ ২৪,৫০,০০০
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {isBn ? 'গ্রাহক বকেয়া (পাওনা): ৳ ২৪.৫ লাখ' : 'Receivable: ৳ 24.5 Lakh'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isBn ? 'সরবরাহকারী দেনা: ৳ ১৬.৮ লাখ' : 'Payable: ৳ 16.8 Lakh'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            /* 1-TAP MOBILE MANAGER APPROVALS */
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#2d3748' }}>
                {isBn ? 'অপেক্ষমাণ অনুমোদন তালিকা (১-ট্যাপ)' : 'Manager 1-Tap Approvals Queue'}
              </Typography>

              {pendingList.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#fff' }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {isBn ? 'সব অনুমোদন সম্পন্ন!' : 'All Approvals Cleared!'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isBn ? 'কোনো নতুন রিকোয়েস্ট পেন্ডিং নেই।' : 'No pending transactions awaiting authorization.'}
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={1.5}>
                  {pendingList.map(item => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2, backgroundColor: '#fff' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.subtitle}
                          </Typography>
                        </Box>
                        <Chip label={item.amountOrQty} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Submitted: {item.submittedAt}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApprove(item.id, item.title)}
                          sx={{ fontWeight: 700 }}
                        >
                          {isBn ? 'অনুমোদন' : 'Approve'}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => handleReject(item.id, item.title)}
                          sx={{ fontWeight: 700 }}
                        >
                          {isBn ? 'বাতিল' : 'Reject'}
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

