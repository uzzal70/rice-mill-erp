'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, AppBar, Avatar, Box, Button, Chip, CircularProgress, CssBaseline, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, IconButton, InputLabel, MenuItem,
  Paper, Select, Snackbar, Stack, Tab, Tabs, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScaleRoundedIcon from '@mui/icons-material/ScaleRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import { apiDownload, apiRequest, queryString, readSession, Session, writeSession } from '@/lib/api';
import { RolesPage } from './roles-page';
import { AuthSessionsDialog } from './auth-sessions';
import { CompanyPage } from './company-page';
import { FactoryPage } from './factory-page';
import { WarehousePage } from './warehouse-page';
import { PaddyMasterPage } from './paddy-master-page';
import { RiceProductMasterPage } from './rice-product-master-page';
import { ByProductMasterPage } from './by-product-master-page';
import { PackagingMasterPage } from './packaging-master-page';
import { SupplierFarmerMasterPage } from './supplier-farmer-master-page';
import { BrokerMasterPage } from './broker-master-page';
import { VehicleMasterPage } from './vehicle-master-page';
import { QualityControlPage } from './quality-control-page';
import { MoisturePolicyPage } from './moisture-policy-page';
import { PurchaseInvoicePage } from './purchase-invoice-page';
import { LandedCostPage } from './landed-cost-page';
import { StockLedgerPage } from './stock-ledger-page';
import { DryingPage } from './drying-page';
import { ParboilingPage } from './parboiling-page';
import { ProductionPage } from './production-page';
import { RepackingPage } from './repacking-page';
import { SalesPage } from './sales-page';

type Company = { id: string; name: string; code: string };
type Factory = { id: string; name: string; code: string; productionType: string };
type FactorySummary = { id: string; name: string; code: string; gateEntries: number; openGates: number; openPurchases: number; unpostedReceipts: number; stockPositions: number };
type GateAttachment = { id: string; fileName: string; mimeType: string; sizeBytes: number };
type GateEntry = { id: string; gateNumber: string; vehicleNumber: string; driverName?: string | null; direction: string; purpose: string; status: string; enteredAt: string; partnerId?: string | null; itemId?: string | null; partner?: { name: string; type: string } | null; item?: { name: string } | null; weighbridgeTicket?: { netWeight: string; ticketNumber: string } | null; qualitySamples?: Array<{ id: string; sampleNumber: string; status: string; decision?: string | null; measurements?: { moisturePct?: number } }>; attachments?: GateAttachment[] };
type Purchase = { id: string; orderNumber: string; status: string; orderedQuantity: string; payableQuantityKg: string; unitRate: string; adjustedUnitRate: string; moisturePolicyName?: string | null; moistureReceivedPct?: string | null; moistureDeductionQuantityKg?: string | null; brokerCommissionAmount?: string | null; supplier: { name: string }; item: { name: string } };
type GoodsReceipt = { id: string; receiptNumber: string; status: string; quantity: string; purchaseOrder: { orderNumber: string; supplier: { name: string }; item: { name: string } } };
type InventoryRow = { item: { id: string; code: string; name: string; kind: string; baseUnit: string }; stack: { id: string; code: string; godown: { name: string } } | null; onHand: string };
type PartnerOption = { id: string; name: string; type: string };
type ItemOption = { id: string; name: string; kind: string };
type StackOption = { id: string; code: string; godownId: string; godown: { name: string } };
type PageKey = 'dashboard' | 'gate' | 'qualityControl' | 'procurement' | 'receipts' | 'purchaseInvoices' | 'landedCosts' | 'drying' | 'parboiling' | 'production' | 'repacking' | 'sales' | 'inventory' | 'roles' | 'companyMaster' | 'factoryMaster' | 'paddyMaster' | 'riceMaster' | 'byProductMaster' | 'packagingMaster' | 'partnerMaster' | 'brokerMaster' | 'vehicleMaster' | 'moisturePolicies';
type DesignMode = 'advanced' | 'classic';

const translations = {
  en: {
    dashboard: 'Overview', gate: 'Gate & quality', qualityControl: 'Quality lab', procurement: 'Paddy purchases', receipts: 'Goods receipts', purchaseInvoices: 'Purchase invoices', landedCosts: 'Landed cost', drying: 'Drying', parboiling: 'Parboiling', production: 'Milling production', repacking: 'Repacking', sales: 'Sales orders', inventory: 'Stock & warehouse', roles: 'Roles & permissions', companyMaster: 'Company profile', factoryMaster: 'Factories', paddyMaster: 'Paddy varieties', riceMaster: 'Rice products', byProductMaster: 'By-products', packagingMaster: 'Packaging', partnerMaster: 'Customers & suppliers', brokerMaster: 'Brokers', vehicleMaster: 'Vehicles', moisturePolicies: 'Moisture policies',
    operations: 'OPERATIONS', management: 'MANAGEMENT', workspace: 'Rice Mill ERP', tagline: 'Factory operations, clearly in control',
    signin: 'Sign in to your mill', subtitle: 'A single workspace for procurement, stock, and production.', email: 'Email address', password: 'Password', signIn: 'Sign in',
    forgotPassword: 'Forgot password?', sendReset: 'Send reset link', useOtp: 'Use a sign-in code instead', requestOtp: 'Send sign-in code', verifyOtp: 'Verify and sign in',
    oneTimeCode: '6-digit sign-in code', backToSignIn: 'Back to sign in', resetRequested: 'If the account is eligible, reset instructions have been sent.',
    otpRequested: 'If the account is eligible, a sign-in code has been sent.',
    company: 'Company', factory: 'Factory', advanced: 'Advanced', classic: 'Classic', language: 'বাংলা', search: 'Search', logout: 'Sign out',
    live: 'Live operations', today: 'TODAY AT THE MILL', gateQueue: 'Gate entries', openPurchases: 'Purchase orders', openReceipts: 'Unposted receipts', stockLines: 'Stock positions',
    dashboardTitle: 'Mill operations', dashboardSub: 'A live view of the selected factory. Figures are read from operational records.',
    refresh: 'Refresh data', attention: 'Workflow attention', recentGate: 'Recent gate activity', stockSnapshot: 'Stock by stack',
    factoryComparison: 'Factory comparison', factoryComparisonSub: 'Operational counts across active factories. Select a factory above for its detailed view.', openGates: 'Open gates',
    factoryComparisonRestricted: 'Comparison includes only factories your account can access.',
    gateTitle: 'Gate & quality desk', purchasesTitle: 'Paddy procurement', receiptsTitle: 'Goods receiving', inventoryTitle: 'Inventory & warehouse',
    qualityControlTitle: 'Laboratory quality control', qualityControlSub: 'Test incoming paddy, review all quality parameters, and record authorized decisions.',
    rolesTitle: 'Roles & permissions', rolesSub: 'Configure permissions for each company role.',
    companyMasterTitle: 'Company master', companyMasterSub: 'Company identity, contact, and financial defaults.',
    factoryMasterTitle: 'Factory master', factoryMasterSub: 'Factory identity, manager, capacity, and operational type.',
    paddyMasterTitle: 'Paddy master', paddyMasterSub: 'Maintain varieties, local names, crop year, grade, and quality baselines.',
    riceMasterTitle: 'Rice product master', riceMasterSub: 'Configure brands, rice types, composition targets, and packaging labels.',
    byProductMasterTitle: 'By-product master', byProductMasterSub: 'Maintain by-products, reference prices, and ledger activity.',
    packagingMasterTitle: 'Packaging master', packagingMasterSub: 'Configure bag sizes, suppliers, unit costs, and stock.',
    partnerMasterTitle: 'Partner master', partnerMasterSub: 'Maintain company-scoped customer, supplier, and farmer profiles.',
    brokerMasterTitle: 'Broker master', brokerMasterSub: 'Configure broker profiles and protected commission terms.',
    vehicleMasterTitle: 'Vehicle master', vehicleMasterSub: 'Manage registered vehicles, compliance expiry dates, and gate movement history.',
    moisturePoliciesTitle: 'Moisture calculation policies', moisturePoliciesSub: 'Configure and audit moisture-based purchase quantity and rate deductions.',
    purchaseInvoicesTitle: 'Purchase invoices', purchaseInvoicesSub: 'Create a supplier invoice for each posted GRN and review its payable calculation.', landedCostsTitle: 'Landed cost', landedCostsSub: 'Calculate direct paddy costs and receipt unit cost.', dryingTitle: 'Paddy drying', dryingSub: 'Record moisture and weight before and after drying, then post the stock movement.', parboilingTitle: 'Parboiling', parboilingSub: 'Track soaking, steaming and drying stages with measured weights and operating conditions.', productionTitle: 'Milling production', productionSub: 'Capture batch inputs and outputs, recovery, loss, and stock posting.', repackingTitle: 'Rice repacking', repackingSub: 'Convert bulk rice into packaged finished rice and consume bag stock.', salesTitle: 'Sales orders', salesSub: 'Create customer orders at transaction prices and reserve available stock.',
    newGate: 'New gate entry', weigh: 'Record weighing', newSample: 'Create sample', results: 'Record test', accept: 'Accept quality', reject: 'Reject quality', complete: 'Complete gate',
    newPurchase: 'Create purchase', broker: 'Broker (optional)', brokerCommission: 'Broker commission', approve: 'Approve', newReceipt: 'Create GRN', post: 'Post stock', transfer: 'Transfer stock', adjust: 'Adjust stock',
    noRows: 'No matching records yet.', tableGate: 'Gate no.', vehicle: 'Vehicle', purpose: 'Purpose', status: 'Status', time: 'Entry time', net: 'Net weight',
    purchaseNo: 'Purchase no.', supplier: 'Supplier', item: 'Paddy', qty: 'Physical KG', payableQty: 'Payable KG', rate: 'Agreed / KG', adjustedRate: 'Adjusted / KG', moisturePolicy: 'Moisture policy', receiptNo: 'GRN no.', stack: 'Stack', onHand: 'On hand',
    design: 'Design mode', welcome: 'Good morning', connected: 'API connected', disconnected: 'API unavailable',
    entryCreated: 'Gate entry created', loggedOut: 'Signed out', banglaUnavailable: 'বাংলা অনুবাদ পর্যায়ক্রমে যোগ করা হবে', security: 'Account security',
  },
  bn: {
    dashboard: 'সারসংক্ষেপ', gate: 'গেট ও মান', qualityControl: 'মান নিয়ন্ত্রণ', procurement: 'ধান ক্রয়', receipts: 'পণ্য গ্রহণ', purchaseInvoices: 'ক্রয় ইনভয়েস', landedCosts: 'প্রকৃত ক্রয় খরচ', drying: 'ধান শুকানো', parboiling: 'সিদ্ধকরণ', production: 'মাড়াই উৎপাদন', repacking: 'পুনঃপ্যাক', sales: 'বিক্রয় আদেশ', inventory: 'মজুদ ও গুদাম', roles: 'রোল ও অনুমতি', companyMaster: 'কোম্পানি প্রোফাইল', factoryMaster: 'কারখানা', paddyMaster: 'ধানের জাত', riceMaster: 'চালের পণ্য', byProductMaster: 'উপজাত পণ্য', packagingMaster: 'প্যাকেজিং', partnerMaster: 'ক্রেতা ও সরবরাহকারী', brokerMaster: 'ব্রোকার', vehicleMaster: 'যানবাহন', moisturePolicies: 'আর্দ্রতা নীতি',
    operations: 'কার্যক্রম', management: 'ব্যবস্থাপনা', workspace: 'রাইস মিল ERP', tagline: 'কারখানার কার্যক্রম, নিয়ন্ত্রণে',
    signin: 'আপনার মিলে প্রবেশ করুন', subtitle: 'ক্রয়, মজুদ ও উৎপাদনের জন্য একটি কর্মক্ষেত্র।', email: 'ইমেইল ঠিকানা', password: 'পাসওয়ার্ড', signIn: 'প্রবেশ',
    forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?', sendReset: 'রিসেট লিংক পাঠান', useOtp: 'সাইন-ইন কোড ব্যবহার করুন', requestOtp: 'সাইন-ইন কোড পাঠান', verifyOtp: 'যাচাই করে প্রবেশ',
    oneTimeCode: '৬ সংখ্যার সাইন-ইন কোড', backToSignIn: 'সাইন-ইনে ফিরে যান', resetRequested: 'অ্যাকাউন্টটি যোগ্য হলে রিসেট নির্দেশনা পাঠানো হয়েছে।',
    otpRequested: 'অ্যাকাউন্টটি যোগ্য হলে সাইন-ইন কোড পাঠানো হয়েছে।',
    company: 'কোম্পানি', factory: 'কারখানা', advanced: 'অ্যাডভান্সড', classic: 'ক্লাসিক', language: 'English', search: 'খুঁজুন', logout: 'প্রস্থান',
    live: 'সরাসরি কার্যক্রম', today: 'আজকের মিল', gateQueue: 'গেট এন্ট্রি', openPurchases: 'ক্রয় আদেশ', openReceipts: 'অপোস্টেড GRN', stockLines: 'মজুদের অবস্থান',
    dashboardTitle: 'মিল কার্যক্রম', dashboardSub: 'নির্বাচিত কারখানার সরাসরি তথ্য। সংখ্যাগুলো কার্যক্রমের রেকর্ড থেকে নেওয়া।',
    refresh: 'তথ্য হালনাগাদ', attention: 'অপেক্ষমাণ কাজ', recentGate: 'সাম্প্রতিক গেট কার্যক্রম', stockSnapshot: 'স্ট্যাক অনুযায়ী মজুদ',
    factoryComparison: 'কারখানা তুলনা', factoryComparisonSub: 'সক্রিয় কারখানাগুলোর কার্যক্রমের সংখ্যা। বিস্তারিত দেখতে উপরের কারখানা নির্বাচন করুন।', openGates: 'চলমান গেট',
    factoryComparisonRestricted: 'তুলনায় শুধু আপনার অ্যাকাউন্টের অনুমোদিত কারখানাগুলো দেখানো হয়েছে।',
    gateTitle: 'গেট ও মান ডেস্ক', purchasesTitle: 'ধান ক্রয়', receiptsTitle: 'পণ্য গ্রহণ', inventoryTitle: 'মজুদ ও গুদাম',
    qualityControlTitle: 'ল্যাবরেটরি মান নিয়ন্ত্রণ', qualityControlSub: 'আগমনী ধান পরীক্ষা, গুণগত মান পর্যালোচনা এবং অনুমোদিত সিদ্ধান্ত দিন।',
    rolesTitle: 'রোল ও অনুমতি', rolesSub: 'প্রতিটি কোম্পানি রোলের অনুমতি নির্ধারণ করুন।',
    companyMasterTitle: 'কোম্পানি মাস্টার', companyMasterSub: 'কোম্পানির পরিচয়, যোগাযোগ ও আর্থিক ডিফল্ট।',
    factoryMasterTitle: 'কারখানা মাস্টার', factoryMasterSub: 'কারখানার পরিচয়, ব্যবস্থাপক, সক্ষমতা ও কার্যক্রমের ধরন।',
    paddyMasterTitle: 'ধান মাস্টার', paddyMasterSub: 'ধানের জাত, স্থানীয় নাম, ফসলের বছর, মান ও গুণগত মানদণ্ড পরিচালনা করুন।',
    riceMasterTitle: 'চাল পণ্য মাস্টার', riceMasterSub: 'ব্র্যান্ড, চালের ধরন, গঠন ও প্যাকেজিং লেবেল নির্ধারণ করুন।',
    byProductMasterTitle: 'উপজাত পণ্য মাস্টার', byProductMasterSub: 'উপজাত পণ্য, রেফারেন্স মূল্য ও লেজার কার্যক্রম পরিচালনা করুন।',
    packagingMasterTitle: 'প্যাকেজিং মাস্টার', packagingMasterSub: 'ব্যাগের মাপ, সরবরাহকারী, একক খরচ ও মজুদ নির্ধারণ করুন।',
    partnerMasterTitle: 'পার্টনার মাস্টার', partnerMasterSub: 'কোম্পানিভিত্তিক ক্রেতা, সরবরাহকারী ও কৃষক প্রোফাইল পরিচালনা করুন।',
    brokerMasterTitle: 'ব্রোকার মাস্টার', brokerMasterSub: 'ব্রোকার প্রোফাইল ও সুরক্ষিত কমিশন শর্ত নির্ধারণ করুন।',
    vehicleMasterTitle: 'যানবাহন মাস্টার', vehicleMasterSub: 'নিবন্ধিত যানবাহন, মেয়াদ এবং গেট চলাচলের ইতিহাস পরিচালনা করুন।',
    moisturePoliciesTitle: 'আর্দ্রতা হিসাব নীতি', moisturePoliciesSub: 'আর্দ্রতার ভিত্তিতে ক্রয় পরিমাণ ও দর কর্তন নির্ধারণ এবং নিরীক্ষা করুন।',
    purchaseInvoicesTitle: 'ক্রয় ইনভয়েস', purchaseInvoicesSub: 'প্রতিটি পোস্টকৃত GRN-এর সরবরাহকারী ইনভয়েস তৈরি ও প্রদেয় হিসাব পর্যালোচনা করুন।', landedCostsTitle: 'প্রকৃত ক্রয় খরচ', landedCostsSub: 'ধানের সরাসরি খরচ এবং প্রতি একক প্রাপ্তি খরচ হিসাব করুন।', dryingTitle: 'ধান শুকানো', dryingSub: 'শুকানোর আগে ও পরে আর্দ্রতা এবং ওজন নথিভুক্ত করে মজুদ পোস্ট করুন।', parboilingTitle: 'সিদ্ধকরণ', parboilingSub: 'ভেজানো, বাষ্প, শুকানো ধাপ, ওজন এবং প্রক্রিয়ার পরিমাপ নথিভুক্ত করুন।', productionTitle: 'মাড়াই উৎপাদন', productionSub: 'ব্যাচ ইনপুট ও আউটপুট, রিকভারি, ক্ষতি এবং মজুদ পোস্টিং রেকর্ড করুন।', repackingTitle: 'চাল পুনঃপ্যাক', repackingSub: 'বাল্ক চাল থেকে প্যাকেটজাত চাল তৈরি এবং প্যাকেজিং মজুদ ব্যবহার করুন।', salesTitle: 'বিক্রয় আদেশ', salesSub: 'লেনদেন দর দিয়ে ক্রেতার আদেশ তৈরি ও মজুদ সংরক্ষণ করুন।',
    newGate: 'নতুন গেট এন্ট্রি', weigh: 'ওজন যোগ', newSample: 'নমুনা তৈরি', results: 'পরীক্ষার ফল', accept: 'মান গ্রহণ', reject: 'মান বাতিল', complete: 'গেট সম্পন্ন',
    newPurchase: 'ক্রয় তৈরি', broker: 'ব্রোকার (ঐচ্ছিক)', brokerCommission: 'ব্রোকার কমিশন', approve: 'অনুমোদন', newReceipt: 'GRN তৈরি', post: 'মজুদ পোস্ট', transfer: 'মজুদ স্থানান্তর', adjust: 'মজুদ সমন্বয়',
    noRows: 'এখনও কোনো রেকর্ড নেই।', tableGate: 'গেট নং', vehicle: 'গাড়ি', purpose: 'উদ্দেশ্য', status: 'অবস্থা', time: 'প্রবেশের সময়', net: 'নিট ওজন',
    purchaseNo: 'ক্রয় নং', supplier: 'সরবরাহকারী', item: 'ধান', qty: 'ভৌত কেজি', payableQty: 'প্রদেয় কেজি', rate: 'সম্মত দর / কেজি', adjustedRate: 'সমন্বিত দর / কেজি', moisturePolicy: 'আর্দ্রতা নীতি', receiptNo: 'GRN নং', stack: 'স্ট্যাক', onHand: 'মজুদ',
    design: 'ডিজাইন', welcome: 'শুভ সকাল', connected: 'API সংযুক্ত', disconnected: 'API পাওয়া যাচ্ছে না',
    entryCreated: 'গেট এন্ট্রি তৈরি হয়েছে', loggedOut: 'সাইন আউট হয়েছে', banglaUnavailable: 'বাংলা অনুবাদ পর্যায়ক্রমে যোগ করা হবে', security: 'অ্যাকাউন্ট নিরাপত্তা',
  },
} as const;

const navigation: Array<{ key: PageKey; icon: typeof DashboardRoundedIcon; section: 'operations' | 'management' }> = [
  { key: 'dashboard', icon: DashboardRoundedIcon, section: 'operations' },
  { key: 'gate', icon: ScaleRoundedIcon, section: 'operations' },
  { key: 'qualityControl', icon: AssessmentOutlinedIcon, section: 'operations' },
  { key: 'procurement', icon: AgricultureRoundedIcon, section: 'operations' },
  { key: 'receipts', icon: ReceiptLongRoundedIcon, section: 'operations' },
  { key: 'purchaseInvoices', icon: ReceiptLongRoundedIcon, section: 'operations' },
  { key: 'landedCosts', icon: ReceiptLongRoundedIcon, section: 'operations' },
  { key: 'drying', icon: PrecisionManufacturingRoundedIcon, section: 'operations' },
  { key: 'parboiling', icon: PrecisionManufacturingRoundedIcon, section: 'operations' },
  { key: 'production', icon: PrecisionManufacturingRoundedIcon, section: 'operations' },
  { key: 'repacking', icon: Inventory2OutlinedIcon, section: 'operations' },
  { key: 'sales', icon: ReceiptLongRoundedIcon, section: 'operations' },
  { key: 'inventory', icon: WarehouseOutlinedIcon, section: 'management' },
  { key: 'paddyMaster', icon: AgricultureRoundedIcon, section: 'management' },
  { key: 'riceMaster', icon: Inventory2OutlinedIcon, section: 'management' },
  { key: 'byProductMaster', icon: Inventory2OutlinedIcon, section: 'management' },
  { key: 'packagingMaster', icon: Inventory2OutlinedIcon, section: 'management' },
  { key: 'partnerMaster', icon: AgricultureRoundedIcon, section: 'management' },
  { key: 'brokerMaster', icon: BusinessRoundedIcon, section: 'management' },
  { key: 'vehicleMaster', icon: AgricultureRoundedIcon, section: 'management' },
  { key: 'moisturePolicies', icon: AssessmentOutlinedIcon, section: 'management' },
  { key: 'roles', icon: AdminPanelSettingsRoundedIcon, section: 'management' },
  { key: 'companyMaster', icon: BusinessRoundedIcon, section: 'management' },
  { key: 'factoryMaster', icon: PrecisionManufacturingRoundedIcon, section: 'management' },
];

const theme = createTheme({
  palette: { primary: { main: '#1b6a4a', dark: '#104c36' }, background: { default: '#f5f8f5', paper: '#fff' }, success: { main: '#378867' }, warning: { main: '#c88a32' } },
  typography: { fontFamily: '"DM Sans", sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 12 },
});

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
};
type Translation = { [Key in keyof typeof translations.en]: string };

function formatKg(value: string | number | undefined) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '—';
  return `${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 3 }).format(number)} KG`;
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
  if (['COMPLETED', 'APPROVED', 'POSTED', 'RECEIVING'].includes(status)) return 'success';
  if (['ENTRY', 'WEIGHING', 'QUALITY', 'DRAFT', 'SUBMITTED'].includes(status)) return 'warning';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'error';
  return 'default';
}

function StatusTag({ value }: { value: string }) {
  return <Chip size="small" color={statusColor(value)} label={value.replaceAll('_', ' ')} sx={{ height: 24, fontSize: 10, fontWeight: 800, letterSpacing: '.03em' }} />;
}

function LoginView({ onLogin, design, onDesign, language, onLanguage }: {
  onLogin: (session: Session) => void; design: DesignMode; onDesign: () => void; language: 'en' | 'bn'; onLanguage: () => void;
}) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState<'password' | 'otp' | 'forgot'>('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const session = await apiRequest<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, deviceName: 'Rice Mill ERP Web' }),
      }, false);
      writeSession(session);
      onLogin(session);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await apiRequest<{ message: string }>('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false);
      setFeedback(t.resetRequested);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp() {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await apiRequest<{ message: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false);
      setOtpRequested(true);
      setFeedback(t.otpRequested);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await apiRequest<Session>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode, deviceName: 'Rice Mill ERP Web' }),
      }, false);
      writeSession(session);
      onLogin(session);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: 'password' | 'otp' | 'forgot') {
    setMode(next);
    setError('');
    setFeedback('');
    setOtpCode('');
    setOtpRequested(false);
  }

  return (
    <Box className={`login-shell soft-grid ${design === 'classic' ? 'classic-login' : ''}`} sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'center', px: { xs: 2, md: 8 }, py: 4 }}>
      <Box sx={{ maxWidth: 550, mx: { xs: 'auto', md: 'auto' }, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
          <Avatar sx={{ bgcolor: '#1b6a4a', width: 52, height: 52, borderRadius: 3 }}><AgricultureRoundedIcon /></Avatar>
          <Box><Typography className="brand-font" fontWeight={800} fontSize={20}>{t.workspace}</Typography><Typography color="text.secondary" fontSize={12}>{t.tagline}</Typography></Box>
        </Box>
        <Typography className="brand-font" variant="h2" fontWeight={800} lineHeight={1.12} letterSpacing="-2px" sx={{ fontSize: { md: 42, lg: 52 }, mb: 2 }}>From paddy field<br />to finished grain.</Typography>
        <Typography color="text.secondary" fontSize={16} maxWidth={420} lineHeight={1.8}>One clear picture of procurement, quality, stock and production — built around the realities of Bangladesh rice mills.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 5 }}>
          {['Gate & quality', 'Paddy procurement', 'Warehouse control'].map(label => <Chip key={label} size="small" label={label} variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,.7)', borderColor: '#dce8df' }} />)}
        </Stack>
      </Box>
      <Box sx={{ width: '100%', maxWidth: 460, mx: 'auto' }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Avatar sx={{ bgcolor: '#1b6a4a', borderRadius: 2 }}><AgricultureRoundedIcon /></Avatar><Typography className="brand-font" fontWeight={800}>{t.workspace}</Typography>
        </Box>
        <Paper className={`login-card ${design}`} elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: design === 'classic' ? 1 : 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Chip icon={<BusinessRoundedIcon />} label="Bangladesh · BDT" size="small" variant="outlined" />
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={t.design}><IconButton size="small" onClick={onDesign}><PaletteOutlinedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title={t.language}><IconButton size="small" onClick={onLanguage}><LanguageRoundedIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
          </Stack>
          <Typography className="brand-font" variant="h4" fontWeight={800} letterSpacing="-1px" mb={1}>{mode === 'forgot' ? t.forgotPassword : t.signin}</Typography>
          <Typography color="text.secondary" fontSize={14} mb={3}>{t.subtitle}</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {feedback && <Alert severity="success" sx={{ mb: 2 }}>{feedback}</Alert>}
          <Box component="form" onSubmit={mode === 'forgot' ? sendPasswordReset : mode === 'otp' ? event => { event.preventDefault(); if (otpRequested) void verifyOtp(event); } : submit}>
            <Stack spacing={2}>
              <TextField autoComplete="username" label={t.email} type="email" value={email} onChange={event => setEmail(event.target.value)} required fullWidth />
              {mode === 'password' && <>
                <TextField autoComplete="current-password" label={t.password} type="password" value={password} onChange={event => setPassword(event.target.value)} required fullWidth />
                <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ minHeight: 48, borderRadius: design === 'classic' ? 1 : 2 }}>
                  {busy ? <CircularProgress color="inherit" size={20} /> : t.signIn}
                </Button>
              </>}
              {mode === 'forgot' && <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ minHeight: 48, borderRadius: design === 'classic' ? 1 : 2 }}>
                {busy ? <CircularProgress color="inherit" size={20} /> : t.sendReset}
              </Button>}
              {mode === 'otp' && !otpRequested && <Button type="button" variant="contained" size="large" disabled={busy} onClick={() => void requestOtp()} sx={{ minHeight: 48, borderRadius: design === 'classic' ? 1 : 2 }}>
                {busy ? <CircularProgress color="inherit" size={20} /> : t.requestOtp}
              </Button>}
              {mode === 'otp' && otpRequested && <>
                <TextField autoComplete="one-time-code" label={t.oneTimeCode} value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric', maxLength: 6, pattern: '\\d{6}' }} required fullWidth />
                <Button type="submit" variant="contained" size="large" disabled={busy || otpCode.length !== 6} sx={{ minHeight: 48, borderRadius: design === 'classic' ? 1 : 2 }}>
                  {busy ? <CircularProgress color="inherit" size={20} /> : t.verifyOtp}
                </Button>
              </>}
            </Stack>
          </Box>
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} mt={2}>
            {mode === 'password' && <>
              <Button size="small" onClick={() => changeMode('forgot')}>{t.forgotPassword}</Button>
              <Button size="small" onClick={() => changeMode('otp')}>{t.useOtp}</Button>
            </>}
            {mode !== 'password' && <Button size="small" onClick={() => changeMode('password')}>{t.backToSignIn}</Button>}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Typography color="text.secondary" fontSize={12}>Secure sign-in · Role controlled · Factory scoped</Typography>
        </Paper>
      </Box>
    </Box>
  );
}

function EntryDialog({ open, onClose, companyId, factoryId, onSaved, t }: {
  open: boolean; onClose: () => void; companyId: string; factoryId: string; onSaved: () => void; t: Translation;
}) {
  const [vehicles, setVehicles] = useState<Array<{ id: string; vehicleNumber: string }>>([]);
  const [partners, setPartners] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [gateNumber, setGateNumber] = useState('');
  const [direction, setDirection] = useState('INWARD');
  const [purpose, setPurpose] = useState('PROCUREMENT');
  const [challanNumber, setChallanNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [enteredAt, setEnteredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiRequest<Array<{ id: string; vehicleNumber: string }>>(`/vehicles?${queryString({ companyId, factoryId, page: 1, pageSize: 100, active: true })}`),
      apiRequest<Array<{ id: string; name: string; type: string }>>(`/partners?${queryString({ companyId, page: 1, pageSize: 100 })}`),
      apiRequest<Array<{ id: string; name: string; kind: string }>>(`/items?${queryString({ companyId, page: 1, pageSize: 100 })}`),
    ]).then(([vehicleRows, partnerRows, itemRows]) => {
      setVehicles(vehicleRows);
      setPartners(partnerRows.filter(row => ['SUPPLIER', 'FARMER', 'CUSTOMER'].includes(row.type)));
      setItems(itemRows);
    }).catch(reason => setError(messageOf(reason)));
  }, [open, companyId, factoryId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/gate/entries', {
        method: 'POST',
        body: JSON.stringify({
          companyId, factoryId, gateNumber, direction, purpose,
          ...(vehicleId ? { vehicleId } : { vehicleNumber }),
          ...(driverName ? { driverName } : {}),
          ...(driverMobile ? { driverMobile } : {}),
          ...(partnerId ? { partnerId } : {}),
          ...(itemId ? { itemId } : {}),
          ...(challanNumber ? { challanNumber } : {}),
          ...(referenceNumber ? { referenceNumber } : {}),
          ...(remarks ? { remarks } : {}),
          enteredAt: new Date(enteredAt).toISOString(),
        }),
      });
      onSaved();
      onClose();
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle className="brand-font" fontWeight={800}>{t.newGate}</DialogTitle>
    <Box component="form" onSubmit={submit}>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label={t.tableGate} value={gateNumber} onChange={event => setGateNumber(event.target.value)} required />
          <FormControl fullWidth><InputLabel>Gate direction</InputLabel><Select label="Gate direction" value={direction} onChange={event => setDirection(event.target.value)}>{['INWARD', 'OUTWARD'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>Visit purpose</InputLabel><Select label="Visit purpose" value={purpose} onChange={event => setPurpose(event.target.value)}>{['PROCUREMENT', 'SALES', 'TRANSFER', 'TOLL_MILLING', 'OTHER'].map(value => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>{t.vehicle}</InputLabel><Select label={t.vehicle} value={vehicleId} onChange={event => setVehicleId(event.target.value)}><MenuItem value="">Enter an unregistered vehicle</MenuItem>{vehicles.map(row => <MenuItem key={row.id} value={row.id}>{row.vehicleNumber}</MenuItem>)}</Select></FormControl>
          {!vehicleId && <TextField label={t.vehicle} value={vehicleNumber} onChange={event => setVehicleNumber(event.target.value)} required />}
          <TextField label="Driver name" value={driverName} onChange={event => setDriverName(event.target.value)} />
          <TextField label="Driver mobile" value={driverMobile} onChange={event => setDriverMobile(event.target.value)} />
          <FormControl fullWidth><InputLabel>Supplier / customer</InputLabel><Select label="Supplier / customer" value={partnerId} onChange={event => setPartnerId(event.target.value)}><MenuItem value="">Not selected</MenuItem>{partners.map(row => <MenuItem key={row.id} value={row.id}>{row.name} · {row.type}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>{t.item}</InputLabel><Select label={t.item} value={itemId} onChange={event => setItemId(event.target.value)}><MenuItem value="">Not selected</MenuItem>{items.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select></FormControl>
          <TextField label="Gate date and time" type="datetime-local" value={enteredAt} onChange={event => setEnteredAt(event.target.value)} InputLabelProps={{ shrink: true }} required />
          <TextField label="Challan number" value={challanNumber} onChange={event => setChallanNumber(event.target.value)} />
          <TextField label="Reference number" value={referenceNumber} onChange={event => setReferenceNumber(event.target.value)} />
          <TextField label="Remarks" value={remarks} onChange={event => setRemarks(event.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={18} /> : 'Create entry'}</Button></DialogActions>
    </Box>
  </Dialog>;
}

function ActionDialog({ open, onClose, onDone, title, action, fields, t }: {
  open: boolean; onClose: () => void; onDone: () => void; title: string; action: (values: Record<string, string>) => Promise<void>;
  fields: Array<{ name: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'select'; options?: Array<{ value: string; label: string }>; required?: boolean; defaultValue?: string }>;
  t: Translation;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setValues(Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? ''])));
  }, [open, fields]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await action(values); onDone(); onClose(); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle className="brand-font" fontWeight={800}>{title}</DialogTitle>
    <Box component="form" onSubmit={submit}>
      <DialogContent><Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {fields.map(field => field.type === 'select'
          ? <FormControl fullWidth key={field.name}><InputLabel>{field.label}</InputLabel><Select label={field.label} value={values[field.name] ?? ''} required={field.required} onChange={event => setValues(prev => ({ ...prev, [field.name]: event.target.value }))}>{(field.options ?? []).map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
          : <TextField key={field.name} label={field.label} type={field.type ?? 'text'} value={values[field.name] ?? ''} onChange={event => setValues(prev => ({ ...prev, [field.name]: event.target.value }))} required={field.required} inputProps={field.type === 'number' ? { min: 0, step: 'any' } : undefined} />)}
      </Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={18} /> : 'Save'}</Button></DialogActions>
    </Box>
  </Dialog>;
}

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [factorySummaries, setFactorySummaries] = useState<FactorySummary[]>([]);
  const [factoryComparisonRestricted, setFactoryComparisonRestricted] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [page, setPage] = useState<PageKey>('dashboard');
  const [design, setDesign] = useState<DesignMode>('advanced');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [gateEntries, setGateEntries] = useState<GateEntry[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [partnerOptions, setPartnerOptions] = useState<PartnerOption[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<PartnerOption[]>([]);
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [stackOptions, setStackOptions] = useState<StackOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [entryDialog, setEntryDialog] = useState(false);
  const [action, setAction] = useState<{ title: string; fields: Array<{ name: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'select'; options?: Array<{ value: string; label: string }>; required?: boolean; defaultValue?: string }>; run: (values: Record<string, string>) => Promise<void> } | null>(null);
  const [actionTarget, setActionTarget] = useState('');
  const [search, setSearch] = useState('');
  const t = translations[language];
  const isClassic = design === 'classic';

  useEffect(() => {
    setSession(readSession());
    setDesign(window.localStorage.getItem('rice-mill-design') === 'classic' ? 'classic' : 'advanced');
    setLanguage(window.localStorage.getItem('rice-mill-language') === 'bn' ? 'bn' : 'en');
    setReady(true);
  }, []);

  const loadCompanies = useCallback(async () => {
    const rows = await apiRequest<Company[]>('/companies');
    setCompanies(rows);
    setCompanyId(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id ?? '');
  }, []);

  const loadFactories = useCallback(async (selectedCompany: string) => {
    if (!selectedCompany) { setFactories([]); setFactoryId(''); return; }
    const rows = await apiRequest<Factory[]>(`/factories?${queryString({ companyId: selectedCompany })}`);
    setFactories(rows);
    setFactoryId(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id ?? '');
  }, []);

  const loadData = useCallback(async () => {
    if (!companyId || !factoryId) return;
    setBusy(true);
    setError('');
    const scope = queryString({ companyId, factoryId, page: 1, pageSize: 50 });
    const results = await Promise.allSettled([
      apiRequest<GateEntry[]>(`/gate/entries?${scope}`),
      apiRequest<Purchase[]>(`/procurement/purchases?${scope}`),
      apiRequest<GoodsReceipt[]>(`/goods-receipts?${scope}`),
      apiRequest<InventoryRow[]>(`/inventory/stock?${scope}`),
    ]);
    const failures: string[] = [];
    if (results[0].status === 'fulfilled') setGateEntries(results[0].value ?? []);
    else failures.push(messageOf(results[0].reason));
    if (results[1].status === 'fulfilled') setPurchases(results[1].value ?? []);
    else failures.push(messageOf(results[1].reason));
    if (results[2].status === 'fulfilled') setReceipts(results[2].value ?? []);
    else failures.push(messageOf(results[2].reason));
    if (results[3].status === 'fulfilled') setInventory(results[3].value ?? []);
    else failures.push(messageOf(results[3].reason));
    if (failures.length) setError(failures[0]);
    setBusy(false);
  }, [companyId, factoryId]);

  useEffect(() => {
    if (!session) return;
    loadCompanies().catch(reason => setError(messageOf(reason)));
  }, [session, loadCompanies]);

  useEffect(() => {
    if (!companyId) return;
    loadFactories(companyId).catch(reason => setError(messageOf(reason)));
  }, [companyId, loadFactories]);

  useEffect(() => {
    if (!session || !companyId || !factories.length) { setFactorySummaries([]); setFactoryComparisonRestricted(false); return; }
    let active = true;
    Promise.allSettled(factories.map(factory =>
      apiRequest<FactorySummary[]>(`/dashboard/factory-comparison?${queryString({ companyId, factoryId: factory.id })}`),
    )).then(results => {
      if (!active) return;
      setFactorySummaries(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));
      setFactoryComparisonRestricted(results.some(result => result.status === 'rejected'));
    });
    return () => { active = false; };
  }, [session, companyId, factories]);

  useEffect(() => {
    if (session && companyId && factoryId) loadData();
  }, [session, companyId, factoryId, loadData]);

  useEffect(() => {
    if (!session || !companyId || !factoryId) return;
    Promise.all([
      apiRequest<PartnerOption[]>(`/partners?${queryString({ companyId, page: 1, pageSize: 100 })}`),
      apiRequest<ItemOption[]>(`/items?${queryString({ companyId, page: 1, pageSize: 100, kind: 'PADDY' })}`),
      apiRequest<StackOption[]>(`/stacks?${queryString({ companyId, factoryId })}`),
    ]).then(([partners, items, stacks]) => {
      setPartnerOptions(partners.filter(row => row.type === 'SUPPLIER' || row.type === 'FARMER'));
      setBrokerOptions(partners.filter(row => row.type === 'BROKER'));
      setItemOptions(items);
      setStackOptions(stacks);
    }).catch(reason => setError(messageOf(reason)));
  }, [session, companyId, factoryId]);

  const selectedCompany = companies.find(row => row.id === companyId);
  const selectedFactory = factories.find(row => row.id === factoryId);
  const openGates = gateEntries.filter(row => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(row.status));
  const openPurchases = purchases.filter(row => !['POSTED', 'CANCELLED'].includes(row.status));
  const unpostedReceipts = receipts.filter(row => row.status !== 'POSTED');
  const filteredGates = useMemo(() => gateEntries.filter(row => `${row.gateNumber} ${row.vehicleNumber} ${row.purpose} ${row.status}`.toLowerCase().includes(search.toLowerCase())), [gateEntries, search]);
  const filteredPurchases = useMemo(() => purchases.filter(row => `${row.orderNumber} ${row.supplier.name} ${row.item.name} ${row.status}`.toLowerCase().includes(search.toLowerCase())), [purchases, search]);
  const filteredReceipts = useMemo(() => receipts.filter(row => `${row.receiptNumber} ${row.purchaseOrder.supplier.name} ${row.status}`.toLowerCase().includes(search.toLowerCase())), [receipts, search]);

  function toggleDesign() {
    const next = design === 'advanced' ? 'classic' : 'advanced';
    setDesign(next);
    window.localStorage.setItem('rice-mill-design', next);
  }
  function toggleLanguage() {
    const next = language === 'en' ? 'bn' : 'en';
    setLanguage(next);
    window.localStorage.setItem('rice-mill-language', next);
  }
  async function logout() {
    try { if (session) await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) }); }
    catch { /* local sign-out remains available when the server is unreachable */ }
    writeSession(null);
    setSession(null);
    setToast(t.loggedOut);
  }

  function openAction(title: string, fields: Array<{ name: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'select'; options?: Array<{ value: string; label: string }>; required?: boolean; defaultValue?: string }>, run: (values: Record<string, string>) => Promise<void>, target = '') {
    setAction({ title, fields, run });
    setActionTarget(target);
  }

  function startWeighing(entry: GateEntry) {
    const now = new Date();
    const first = new Date(now.getTime() - 60000).toISOString().slice(0, 16);
    const second = now.toISOString().slice(0, 16);
    openAction(t.weigh, [
      { name: 'ticketNumber', label: 'Ticket number', required: true },
      { name: 'grossWeight', label: 'Gross weight (KG)', type: 'number', required: true },
      { name: 'tareWeight', label: 'Tare weight (KG)', type: 'number', required: true },
      { name: 'firstWeightAt', label: 'First weight time', type: 'datetime-local', required: true, defaultValue: first },
      { name: 'secondWeightAt', label: 'Second weight time', type: 'datetime-local', required: true, defaultValue: second },
    ], async values => {
      await apiRequest(`/gate/entries/${entry.id}/weighbridge`, { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...values, firstWeightAt: new Date(values.firstWeightAt).toISOString(), secondWeightAt: new Date(values.secondWeightAt).toISOString() }) });
      setToast('Weighbridge ticket recorded');
    });
  }

  function startSample(entry: GateEntry) {
    openAction(t.newSample, [
      { name: 'sampleNumber', label: 'Sample number', required: true },
      { name: 'sampleType', label: 'Sample stage', type: 'select', required: true, options: ['GATE', 'PIT', 'FINAL'].map(value => ({ value, label: value })) },
    ], async values => {
      await apiRequest(`/gate/entries/${entry.id}/quality-samples`, { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...values }) });
      setToast('Quality sample created');
    });
  }

  function startResults(sampleId: string) {
    openAction(t.results, [
      { name: 'moisturePct', label: 'Moisture %', type: 'number' },
      { name: 'foreignMatterPct', label: 'Foreign matter %', type: 'number' },
      { name: 'brokenPct', label: 'Broken %', type: 'number' },
      { name: 'damagedPct', label: 'Damaged %', type: 'number' },
      { name: 'discoloredPct', label: 'Discolored %', type: 'number' },
      { name: 'immaturePct', label: 'Immature %', type: 'number' },
      { name: 'chalkyPct', label: 'Chalky %', type: 'number' },
      { name: 'purityPct', label: 'Purity %', type: 'number' },
      { name: 'otherPct', label: 'Other %', type: 'number' },
      { name: 'comments', label: 'Lab comments' },
    ], async values => {
      const fields = ['moisturePct', 'foreignMatterPct', 'brokenPct', 'damagedPct', 'discoloredPct', 'immaturePct', 'chalkyPct', 'purityPct', 'otherPct'];
      const payload: Record<string, unknown> = { companyId, factoryId, comments: values.comments };
      fields.forEach(key => { if (values[key] !== '') payload[key] = Number(values[key]); });
      await apiRequest(`/quality/samples/${sampleId}/results`, { method: 'POST', body: JSON.stringify(payload) });
      setToast('Quality results recorded');
    });
  }

  async function uploadGateAttachment(entry: GateEntry, file: File) {
    try {
      const body = new FormData();
      body.append('file', file);
      await apiRequest(`/gate/entries/${entry.id}/attachments?${queryString({ companyId, factoryId })}`, { method: 'POST', body });
      setToast('Gate attachment uploaded');
      await loadData();
    } catch (reason) { setError(messageOf(reason)); }
  }

  async function downloadGateAttachment(entry: GateEntry, attachment: GateAttachment) {
    try {
      const blob = await apiDownload(`/gate/entries/${entry.id}/attachments/${attachment.id}?${queryString({ companyId, factoryId })}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(messageOf(reason)); }
  }

  function startPurchase(entry: GateEntry) {
    const moistureSamples = entry.qualitySamples?.filter(sample =>
      sample.status === 'APPROVED' && sample.decision === 'ACCEPT' && typeof sample.measurements?.moisturePct === 'number') ?? [];
    openAction(t.newPurchase, [
      { name: 'orderNumber', label: t.purchaseNo, required: true },
      { name: 'supplierId', label: t.supplier, type: 'select', required: true, options: partnersForForms.filter(option => !entry.partnerId || option.value === entry.partnerId) },
      { name: 'brokerId', label: t.broker, type: 'select', options: [{ value: '', label: language === 'bn' ? 'কোনো ব্রোকার নেই' : 'No broker' }, ...brokerOptions.map(row => ({ value: row.id, label: row.name }))] },
      { name: 'itemId', label: t.item, type: 'select', required: true, options: paddyForForms.filter(option => !entry.itemId || option.value === entry.itemId) },
      { name: 'destinationStackId', label: t.stack, type: 'select', required: true, options: stackForForms },
      ...(moistureSamples.length > 1 ? [{
        name: 'qualitySampleId',
        label: language === 'bn' ? 'আর্দ্রতার নমুনা' : 'Moisture sample',
        type: 'select' as const,
        required: true,
        options: moistureSamples.map(sample => ({ value: sample.id, label: `${sample.sampleNumber} · ${sample.measurements?.moisturePct}%` })),
      }] : []),
      { name: 'unitRate', label: t.rate, type: 'number', required: true },
    ], async values => {
      const selectedStack = stackOptions.find(stack => stack.id === values.destinationStackId);
      if (!selectedStack) throw new Error('Select a valid destination stack.');
      await apiRequest('/procurement/purchases', { method: 'POST', body: JSON.stringify({ companyId, factoryId, gateEntryId: entry.id, ...values, ...(values.brokerId ? { brokerId: values.brokerId } : {}), ...(values.qualitySampleId ? { qualitySampleId: values.qualitySampleId } : {}), destinationGodownId: selectedStack.godownId }) });
      setToast('Purchase order created');
    });
  }

  function startReceipt(purchase: Purchase) {
    openAction(t.newReceipt, [
      { name: 'receiptNumber', label: t.receiptNo, required: true },
      { name: 'quantity', label: t.qty, type: 'number', required: true, defaultValue: purchase.orderedQuantity },
    ], async values => {
      await apiRequest('/goods-receipts', { method: 'POST', body: JSON.stringify({ companyId, factoryId, purchaseOrderId: purchase.id, ...values }) });
      setToast('Goods receipt created');
    });
  }

  function actionForGate(entry: GateEntry) {
    const actions = [];
    if (entry.status === 'ENTRY') actions.push(<Button key="weigh" size="small" startIcon={<ScaleRoundedIcon />} onClick={() => startWeighing(entry)}>{t.weigh}</Button>);
    if (entry.status === 'QUALITY') {
      actions.push(<Button key="sample" size="small" onClick={() => startSample(entry)}>{t.newSample}</Button>);
      entry.qualitySamples?.filter(sample => sample.status === 'SAMPLE').forEach(sample => actions.push(<Button key={sample.id} size="small" onClick={() => startResults(sample.id)}>{t.results}</Button>));
      entry.qualitySamples?.filter(sample => sample.status === 'TESTED').forEach(sample => {
        actions.push(<Button key={`${sample.id}-accept`} size="small" color="success" onClick={() => apiRequest(`/quality/samples/${sample.id}/approve`, { method: 'POST', body: JSON.stringify({ companyId, factoryId, decision: 'ACCEPT' }) }).then(() => { setToast('Quality accepted'); loadData(); }).catch(reason => setError(messageOf(reason)))}>{t.accept}</Button>);
        actions.push(<Button key={`${sample.id}-reject`} size="small" color="error" onClick={() => apiRequest(`/quality/samples/${sample.id}/approve`, { method: 'POST', body: JSON.stringify({ companyId, factoryId, decision: 'REJECT' }) }).then(() => { setToast('Quality rejected'); loadData(); }).catch(reason => setError(messageOf(reason)))}>{t.reject}</Button>);
      });
    }
    if (entry.status === 'RECEIVING' && entry.direction === 'INWARD' && entry.purpose === 'PROCUREMENT') actions.push(<Button key="purchase" size="small" variant="contained" onClick={() => startPurchase(entry)}>{t.newPurchase}</Button>);
    if (entry.status === 'RECEIVING' && entry.purpose !== 'PROCUREMENT') actions.push(<Button key="complete" size="small" onClick={() => apiRequest(`/gate/entries/${entry.id}/complete`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }).then(() => { setToast('Gate entry completed'); loadData(); }).catch(reason => setError(messageOf(reason)))}>{t.complete}</Button>);
    return <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap">{actions}</Stack>;
  }

  const partnersForForms = useMemo(() => partnerOptions.map(row => ({ value: row.id, label: row.name })), [partnerOptions]);
  const paddyForForms = useMemo(() => itemOptions.filter(row => row.kind === 'PADDY').map(row => ({ value: row.id, label: row.name })), [itemOptions]);
  const stackForForms = useMemo(() => stackOptions.map(row => ({ value: row.id, label: `${row.godown.name} · ${row.code}` })), [stackOptions]);

  const drawer = <Box sx={{ width: 256, height: '100%', px: 2, py: 2.5, display: 'flex', flexDirection: 'column' }}>
    <Stack direction="row" alignItems="center" spacing={1.4} sx={{ px: 1, mb: 4 }}>
      <Avatar sx={{ bgcolor: '#e4b85e', color: '#173e2e', width: 40, height: 40, borderRadius: 2 }}><AgricultureRoundedIcon /></Avatar>
      <Box><Typography className="brand-font" fontWeight={800} fontSize={15} color="white">{t.workspace}</Typography><Typography fontSize={10} color="rgba(255,255,255,.55)">MILL OPERATIONS</Typography></Box>
    </Stack>
    {(['operations', 'management'] as const).map(section => <Box key={section} sx={{ mb: 2 }}>
      <Typography sx={{ px: 1.5, mb: 1, fontSize: 10, letterSpacing: '.12em', fontWeight: 800, color: 'rgba(255,255,255,.42)' }}>{t[section]}</Typography>
      <Stack spacing={0.4}>{navigation.filter(item => item.section === section).map(item => {
        const Icon = item.icon;
        return <Button key={item.key} className={`nav-item ${page === item.key ? 'active' : ''}`} fullWidth startIcon={<Icon fontSize="small" />} onClick={() => { setPage(item.key); setMobileOpen(false); }} sx={{ justifyContent: 'flex-start', py: 1.05, px: 1.5, fontSize: 13 }}>{t[item.key]}</Button>;
      })}</Stack>
    </Box>)}
    <Box sx={{ flex: 1 }} />
    <Paper elevation={0} sx={{ bgcolor: 'rgba(255,255,255,.08)', p: 1.5, color: 'white', mb: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1}><CheckCircleOutlineRoundedIcon sx={{ color: '#8ac5a5', fontSize: 16 }} /><Typography fontSize={11} fontWeight={700}>{t.connected}</Typography></Stack>
      <Typography fontSize={10} color="rgba(255,255,255,.55)" mt={.5}>REST · PostgreSQL · RBAC</Typography>
    </Paper>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 1 }}>
      <Avatar sx={{ bgcolor: '#527b67', width: 33, height: 33, fontSize: 13 }}>{session?.user.fullName?.[0] ?? 'U'}</Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap fontSize={12} fontWeight={700} color="white">{session?.user.fullName}</Typography><Typography noWrap fontSize={10} color="rgba(255,255,255,.55)">{session?.user.email}</Typography></Box>
      <Tooltip title={t.logout}><IconButton size="small" onClick={logout} sx={{ color: 'rgba(255,255,255,.65)' }}><LogoutRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
    <Button fullWidth size="small" startIcon={<SecurityRoundedIcon fontSize="small" />} onClick={() => setSecurityOpen(true)}
      sx={{ justifyContent: 'flex-start', color: 'rgba(255,255,255,.75)', px: 1.5 }}>{t.security}</Button>
  </Box>;

  if (!ready) return <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (!session) return <ThemeProvider theme={theme}><CssBaseline /><LoginView onLogin={setSession} design={design} onDesign={toggleDesign} language={language} onLanguage={toggleLanguage} /></ThemeProvider>;

  return <ThemeProvider theme={theme}><CssBaseline />
    <Box className={`erp-root ${isClassic ? 'classic' : ''}`} sx={{ display: 'flex' }}>
      <Box className="sidebar" sx={{ width: 256, flexShrink: 0, minHeight: '100vh', position: 'fixed', inset: '0 auto 0 0', zIndex: 1100, display: { xs: 'none', md: 'block' } }}>{drawer}</Box>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ className: 'sidebar' }}>{drawer}</Drawer>
      <Box sx={{ width: { xs: '100%', md: 'calc(100% - 256px)' }, ml: { xs: 0, md: '256px' }, minHeight: '100vh' }}>
        <AppBar position="sticky" color="inherit" elevation={0} className="topbar">
          <Toolbar sx={{ minHeight: '70px !important', gap: 1.5, px: { xs: 1.5, sm: 3 } }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuRoundedIcon /></IconButton>
            <Box sx={{ flex: 1, minWidth: 110 }}>
              <Typography className="brand-font" fontWeight={800} fontSize={16}>{t[page]}</Typography>
              <Typography color="text.secondary" fontSize={11}>{selectedCompany?.name ?? t.workspace} · {selectedFactory?.name ?? 'Select a factory'}</Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: { xs: 110, sm: 165 } }}>
              <InputLabel>{t.company}</InputLabel>
              <Select label={t.company} value={companyId} onChange={event => { setFactories([]); setFactoryId(''); setFactorySummaries([]); setCompanyId(event.target.value); }}>{companies.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: 105, sm: 155 } }}>
              <InputLabel>{t.factory}</InputLabel>
              <Select label={t.factory} value={factoryId} onChange={event => setFactoryId(event.target.value)}>{factories.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select>
            </FormControl>
            <Tooltip title={t.design}><IconButton onClick={toggleDesign} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><PaletteOutlinedIcon /></IconButton></Tooltip>
            <Tooltip title={t.language}><IconButton onClick={toggleLanguage}><LanguageRoundedIcon /></IconButton></Tooltip>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1600, mx: 'auto' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={3}>
            <Box><Typography className="brand-font" variant="h4" fontWeight={800} letterSpacing="-1.4px">{page === 'dashboard' ? t.dashboardTitle : page === 'companyMaster' ? t.companyMasterTitle : page === 'factoryMaster' ? t.factoryMasterTitle : page === 'paddyMaster' ? t.paddyMasterTitle : page === 'riceMaster' ? t.riceMasterTitle : page === 'byProductMaster' ? t.byProductMasterTitle : page === 'packagingMaster' ? t.packagingMasterTitle : page === 'partnerMaster' ? t.partnerMasterTitle : page === 'brokerMaster' ? t.brokerMasterTitle : page === 'vehicleMaster' ? t.vehicleMasterTitle : page === 'qualityControl' ? t.qualityControlTitle : t[`${page}Title` as 'gateTitle' | 'purchasesTitle' | 'receiptsTitle' | 'inventoryTitle' | 'rolesTitle' | 'moisturePoliciesTitle' | 'purchaseInvoicesTitle' | 'landedCostsTitle' | 'dryingTitle' | 'parboilingTitle' | 'productionTitle' | 'repackingTitle' | 'salesTitle']}</Typography><Typography color="text.secondary" fontSize={13} mt={.5}>{page === 'dashboard' ? t.dashboardSub : page === 'roles' ? t.rolesSub : page === 'companyMaster' ? t.companyMasterSub : page === 'factoryMaster' ? t.factoryMasterSub : page === 'paddyMaster' ? t.paddyMasterSub : page === 'riceMaster' ? t.riceMasterSub : page === 'byProductMaster' ? t.byProductMasterSub : page === 'packagingMaster' ? t.packagingMasterSub : page === 'partnerMaster' ? t.partnerMasterSub : page === 'brokerMaster' ? t.brokerMasterSub : page === 'vehicleMaster' ? t.vehicleMasterSub : page === 'qualityControl' ? t.qualityControlSub : page === 'moisturePolicies' ? t.moisturePoliciesSub : page === 'purchaseInvoices' ? t.purchaseInvoicesSub : page === 'landedCosts' ? t.landedCostsSub : page === 'drying' ? t.dryingSub : page === 'parboiling' ? t.parboilingSub : page === 'production' ? t.productionSub : page === 'repacking' ? t.repackingSub : page === 'sales' ? t.salesSub : `${selectedFactory?.name ?? ''} · ${selectedCompany?.code ?? ''}`}</Typography></Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {page !== 'dashboard' && page !== 'roles' && page !== 'companyMaster' && page !== 'factoryMaster' && page !== 'paddyMaster' && page !== 'riceMaster' && page !== 'byProductMaster' && page !== 'packagingMaster' && page !== 'partnerMaster' && page !== 'brokerMaster' && page !== 'vehicleMaster' && page !== 'qualityControl' && page !== 'moisturePolicies' && page !== 'purchaseInvoices' && page !== 'landedCosts' && page !== 'drying' && page !== 'parboiling' && page !== 'production' && page !== 'repacking' && page !== 'sales' && <TextField size="small" placeholder={t.search} value={search} onChange={event => setSearch(event.target.value)} InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ width: { xs: 150, sm: 220 } }} />}
              {page !== 'roles' && page !== 'companyMaster' && page !== 'factoryMaster' && page !== 'paddyMaster' && page !== 'riceMaster' && page !== 'byProductMaster' && page !== 'packagingMaster' && page !== 'partnerMaster' && page !== 'brokerMaster' && page !== 'vehicleMaster' && page !== 'qualityControl' && page !== 'moisturePolicies' && page !== 'purchaseInvoices' && page !== 'landedCosts' && page !== 'drying' && page !== 'parboiling' && page !== 'production' && page !== 'repacking' && page !== 'sales' && <Button variant="outlined" startIcon={busy ? <CircularProgress size={15} /> : <AutorenewRoundedIcon />} onClick={loadData} disabled={busy}>{t.refresh}</Button>}
            </Stack>
          </Stack>

          {page === 'dashboard' && <DashboardPage t={t} gateEntries={gateEntries} openGates={openGates} openPurchases={openPurchases} unpostedReceipts={unpostedReceipts} inventory={inventory} factorySummaries={factorySummaries} factoryComparisonRestricted={factoryComparisonRestricted} onNavigate={setPage} />}
          {page === 'gate' && <GatePage t={t} entries={filteredGates} onNew={() => setEntryDialog(true)} onAction={actionForGate} onUploadAttachment={uploadGateAttachment} onDownloadAttachment={downloadGateAttachment} />}
          {page === 'procurement' && <ProcurementPage t={t} purchases={filteredPurchases} receipts={receipts} onNewReceipt={startReceipt} onApprove={purchase => apiRequest(`/procurement/purchases/${purchase.id}/approve`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }).then(() => { setToast('Purchase approved'); loadData(); }).catch(reason => setError(messageOf(reason)))} />}
          {page === 'receipts' && <ReceiptsPage t={t} receipts={filteredReceipts} onApprove={receipt => apiRequest(`/goods-receipts/${receipt.id}/approve`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }).then(() => { setToast('GRN approved'); loadData(); }).catch(reason => setError(messageOf(reason)))} onPost={receipt => apiRequest(`/goods-receipts/${receipt.id}/post`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }).then(() => { setToast('Stock posted from GRN'); loadData(); }).catch(reason => setError(messageOf(reason)))} />}
          {page === 'inventory' && <Stack spacing={2}><StockLedgerPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} /><WarehousePage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} /></Stack>}
          {page === 'paddyMaster' && <PaddyMasterPage companyId={companyId} language={language} onSaved={setToast} />}
          {page === 'riceMaster' && <RiceProductMasterPage companyId={companyId} language={language} onSaved={setToast} />}
          {page === 'byProductMaster' && <ByProductMasterPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'packagingMaster' && <PackagingMasterPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'partnerMaster' && <SupplierFarmerMasterPage companyId={companyId} language={language} onSaved={setToast} />}
          {page === 'brokerMaster' && <BrokerMasterPage companyId={companyId} language={language} onSaved={setToast} />}
          {page === 'vehicleMaster' && <VehicleMasterPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} onError={setError} />}
          {page === 'qualityControl' && <QualityControlPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} onError={setError} />}
          {page === 'moisturePolicies' && <MoisturePolicyPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'purchaseInvoices' && <PurchaseInvoicePage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'landedCosts' && <LandedCostPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'drying' && <DryingPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'parboiling' && <ParboilingPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'production' && <ProductionPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'repacking' && <RepackingPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'sales' && <SalesPage companyId={companyId} factoryId={factoryId} language={language} onSaved={setToast} />}
          {page === 'roles' && <RolesPage companyId={companyId} language={language} onSaved={setToast} onError={setError} />}
          {page === 'companyMaster' && <CompanyPage
            companies={companies}
            companyId={companyId}
            language={language}
            onCompanyChanged={setCompanyId}
            onSaved={(message, createdCompany) => {
              setToast(message);
              if (createdCompany) setCompanyId(createdCompany.id);
              void loadCompanies();
            }}
            onCompanyCreated={setCompanyId}
            onError={setError}
          />}
          {page === 'factoryMaster' && <FactoryPage
            companies={companies}
            companyId={companyId}
            language={language}
            onCompanyChanged={setCompanyId}
            onSaved={message => {
              setToast(message);
              void loadFactories(companyId);
            }}
            onError={setError}
          />}
        </Box>
      </Box>
      <EntryDialog open={entryDialog} onClose={() => setEntryDialog(false)} companyId={companyId} factoryId={factoryId} onSaved={() => { setToast(t.entryCreated); loadData(); }} t={t} />
      {session && <AuthSessionsDialog
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        language={language}
        currentSessionId={session.sessionId}
        onCurrentSessionRevoked={() => {
          writeSession(null);
          setSession(null);
          setSecurityOpen(false);
          setToast(t.loggedOut);
        }}
        onMessage={setToast}
      />}
      {action && <ActionDialog key={`${action.title}-${actionTarget}`} open onClose={() => setAction(null)} onDone={() => { setAction(null); loadData(); }} title={action.title} fields={action.fields} action={action.run} t={t} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}><Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert></Snackbar>
    </Box>
  </ThemeProvider>;
}

function DashboardPage({ t, gateEntries, openGates, openPurchases, unpostedReceipts, inventory, factorySummaries, factoryComparisonRestricted, onNavigate }: {
  t: Translation; gateEntries: GateEntry[]; openGates: GateEntry[]; openPurchases: Purchase[]; unpostedReceipts: GoodsReceipt[]; inventory: InventoryRow[]; factorySummaries: FactorySummary[]; factoryComparisonRestricted: boolean; onNavigate: (page: PageKey) => void;
}) {
  const metrics = [
    { label: t.gateQueue, value: gateEntries.length, icon: ScaleRoundedIcon, tint: '#eaf3ed', color: '#347453', note: `${openGates.length} active in workflow` },
    { label: t.openPurchases, value: openPurchases.length, icon: AgricultureRoundedIcon, tint: '#fcf2e3', color: '#b67a23', note: 'Not fully received' },
    { label: t.openReceipts, value: unpostedReceipts.length, icon: ReceiptLongRoundedIcon, tint: '#edf0fa', color: '#5d68a1', note: 'Awaiting stock posting' },
    { label: t.stockLines, value: inventory.length, icon: Inventory2OutlinedIcon, tint: '#eef4f3', color: '#3c7d78', note: 'Item / stack balances' },
  ];
  const priority = openGates.slice(0, 5);
  return <Stack spacing={3}>
    <Stack direction="row" alignItems="center" spacing={1}><Chip icon={<CheckCircleOutlineRoundedIcon />} label={t.live} size="small" color="success" variant="outlined" /><Typography color="text.secondary" fontSize={12}>{t.today} · Operational records only</Typography></Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return <Paper key={metric.label} className="metric-card" elevation={0} sx={{ p: { xs: 1.8, sm: 2.3 }, animation: `rise .35s ease ${index * 70}ms both` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: metric.tint, color: metric.color }}><Icon fontSize="small" /></Box>
            <AssessmentOutlinedIcon sx={{ color: '#c5d0c8', fontSize: 18 }} />
          </Stack>
          <Typography className="brand-font" fontSize={{ xs: 25, sm: 30 }} fontWeight={800}>{metric.value}</Typography>
          <Typography fontSize={12} fontWeight={700} mt={.3}>{metric.label}</Typography>
          <Typography fontSize={10} color="text.secondary" mt={.5}>{metric.note}</Typography>
        </Paper>;
      })}
    </Box>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Box mb={2}><Typography className="brand-font" fontWeight={800}>{t.factoryComparison}</Typography><Typography fontSize={11} color="text.secondary">{t.factoryComparisonSub}</Typography></Box>
      {factoryComparisonRestricted && <Alert severity="info" sx={{ mb: 1.5 }}>{t.factoryComparisonRestricted}</Alert>}
      <Stack spacing={1}>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(150px,1.5fr) repeat(5,minmax(90px,1fr))', gap: 1, px: 1.5 }}>
          {[t.factory, t.gateQueue, t.openGates, t.openPurchases, t.openReceipts, t.stockLines].map(label => <Typography key={label} fontSize={10} color="text.secondary" fontWeight={800}>{label}</Typography>)}
        </Box>
        {factorySummaries.length ? factorySummaries.map(factory => <Box key={factory.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(150px,1.5fr) repeat(5,minmax(90px,1fr))' }, gap: 1, alignItems: 'center', p: 1.5, border: '1px solid #e8eee9', borderRadius: 2 }}>
          <Typography gridColumn={{ xs: '1 / -1', md: 'auto' }} fontWeight={800} fontSize={12}>{factory.name} <Typography component="span" color="text.secondary" fontSize={10}>· {factory.code}</Typography></Typography>
          {[factory.gateEntries, factory.openGates, factory.openPurchases, factory.unpostedReceipts, factory.stockPositions].map((value, index) => <Box key={`${factory.id}-${index}`}><Typography display={{ xs: 'block', md: 'none' }} color="text.secondary" fontSize={10}>{[t.gateQueue, t.openGates, t.openPurchases, t.openReceipts, t.stockLines][index]}</Typography><Typography fontWeight={800} fontSize={13}>{value}</Typography></Box>)}
        </Box>) : <EmptyState text={t.noRows} />}
      </Stack>
    </Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr .8fr' }, gap: 2 }}>
      <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box><Typography className="brand-font" fontWeight={800}>{t.attention}</Typography><Typography fontSize={11} color="text.secondary">Operational work in progress</Typography></Box>
          <Button size="small" onClick={() => onNavigate('gate')}>{t.gate}</Button>
        </Stack>
        {priority.length ? <Stack divider={<Divider flexItem />} spacing={0}>{priority.map(entry => <Stack key={entry.id} direction="row" alignItems="center" spacing={1.5} py={1.3}>
          <Avatar sx={{ bgcolor: '#edf4ee', color: '#347453', width: 35, height: 35 }}><ScaleRoundedIcon fontSize="small" /></Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} fontSize={13}>{entry.gateNumber} · {entry.vehicleNumber}</Typography><Typography color="text.secondary" fontSize={11}>{entry.purpose.replaceAll('_', ' ')} · {entry.weighbridgeTicket ? formatKg(entry.weighbridgeTicket.netWeight) : 'Awaiting weighing'}</Typography></Box>
          <StatusTag value={entry.status} />
        </Stack>)}</Stack> : <EmptyState text={t.noRows} />}
      </Paper>
      <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}><WarehouseOutlinedIcon color="primary" /><Box><Typography className="brand-font" fontWeight={800}>{t.stockSnapshot}</Typography><Typography color="text.secondary" fontSize={11}>Ledger-derived quantities</Typography></Box></Stack>
        {inventory.length ? <Stack divider={<Divider flexItem />} spacing={0}>{inventory.slice(0, 6).map((row, index) => <Stack key={`${row.item.id}-${row.stack?.id ?? index}`} direction="row" alignItems="center" spacing={1.3} py={1.1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ['#49835f', '#dfaa57', '#648eaa', '#829a75'][index % 4] }} />
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap fontSize={12} fontWeight={700}>{row.item.name}</Typography><Typography color="text.secondary" fontSize={10}>{row.stack?.godown.name ?? 'No stack'} / {row.stack?.code ?? '—'}</Typography></Box>
          <Typography fontWeight={800} fontSize={12}>{formatKg(row.onHand)}</Typography>
        </Stack>)}</Stack> : <EmptyState text={t.noRows} />}
      </Paper>
    </Box>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}><Box><Typography className="brand-font" fontWeight={800}>{t.recentGate}</Typography><Typography fontSize={11} color="text.secondary">Latest gate records at this factory</Typography></Box><Button size="small" onClick={() => onNavigate('gate')}>Open gate desk</Button></Stack>
      <GateTable t={t} entries={gateEntries.slice(0, 6)} onAction={() => undefined} compact />
    </Paper>
  </Stack>;
}

function EmptyState({ text }: { text: string }) {
  return <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}><Inventory2OutlinedIcon sx={{ opacity: .25, fontSize: 30, mb: 1 }} /><Typography fontSize={12}>{text}</Typography></Box>;
}

function GatePage({ t, entries, onNew, onAction, onUploadAttachment, onDownloadAttachment }: {
  t: Translation;
  entries: GateEntry[];
  onNew: () => void;
  onAction: (entry: GateEntry) => React.ReactNode;
  onUploadAttachment: (entry: GateEntry, file: File) => void;
  onDownloadAttachment: (entry: GateEntry, attachment: GateAttachment) => void;
}) {
  return <Stack spacing={2}>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5}>
        <Stack direction="row" spacing={1} alignItems="center"><ScaleRoundedIcon color="primary" /><Box><Typography fontWeight={800} fontSize={14}>Gate → weighing → lab approval</Typography><Typography color="text.secondary" fontSize={11}>Sample decision unlocks procurement; gate records remain traceable.</Typography></Box></Stack>
        <Button variant="contained" onClick={onNew}>{t.newGate}</Button>
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <GateTable t={t} entries={entries} onAction={onAction} onUploadAttachment={onUploadAttachment} onDownloadAttachment={onDownloadAttachment} />
    </Paper>
  </Stack>;
}

function GateTable({ t, entries, onAction, compact = false, onUploadAttachment, onDownloadAttachment }: {
  t: Translation;
  entries: GateEntry[];
  onAction: (entry: GateEntry) => React.ReactNode;
  compact?: boolean;
  onUploadAttachment?: (entry: GateEntry, file: File) => void;
  onDownloadAttachment?: (entry: GateEntry, attachment: GateAttachment) => void;
}) {
  if (!entries.length) return <EmptyState text={t.noRows} />;
  return <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: compact ? 700 : 1050 }}>
    <thead><tr>{[t.tableGate, t.vehicle, 'Direction', t.purpose, 'Supplier/customer · material', t.net, t.status, ...(compact ? [] : ['Quality', 'Actions'])].map(label => <Box component="th" key={label} className="table-head" sx={{ textAlign: 'left', py: 1.2, px: 1.25, borderBottom: '1px solid var(--line)' }}>{label}</Box>)}</tr></thead>
    <tbody>{entries.map(entry => <tr key={entry.id}>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><Typography fontWeight={800} fontSize={12}>{entry.gateNumber}</Typography><Typography color="text.secondary" fontSize={10}>{new Date(entry.enteredAt).toLocaleString()}</Typography></Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><Typography fontSize={12}>{entry.vehicleNumber}</Typography>{entry.driverName && <Typography color="text.secondary" fontSize={10}>{entry.driverName}</Typography>}</Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 11 }}>{entry.direction}</Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 11 }}>{entry.purpose.replaceAll('_', ' ')}</Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><Typography fontSize={11}>{entry.partner?.name ?? '—'}</Typography><Typography color="text.secondary" fontSize={10}>{entry.item?.name ?? '—'}</Typography></Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 11 }}>{entry.weighbridgeTicket ? formatKg(entry.weighbridgeTicket.netWeight) : '—'}</Box>
      <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><StatusTag value={entry.status} /></Box>
      {!compact && <>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><Stack spacing={.5}>{entry.qualitySamples?.map(sample => <Typography key={sample.id} fontSize={10}>{sample.sampleNumber} · {sample.status}</Typography>) ?? '—'}</Stack></Box>
        <Box component="td" sx={{ py: 1, px: 1, borderBottom: '1px solid var(--line)' }}>
          <Stack spacing={.75}>
            {onAction(entry)}
            <Stack direction="row" gap={.5} flexWrap="wrap">
              {entry.attachments?.map(attachment => <Button key={attachment.id} size="small" startIcon={<DownloadRoundedIcon />} onClick={() => onDownloadAttachment?.(entry, attachment)} sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>{attachment.fileName}</Button>)}
              {onUploadAttachment && <Button component="label" size="small" startIcon={<AttachFileRoundedIcon />} sx={{ textTransform: 'none' }}>
                Attach file
                <input hidden type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onUploadAttachment(entry, file);
                  event.currentTarget.value = '';
                }} />
              </Button>}
            </Stack>
          </Stack>
        </Box>
      </>}
    </tr>)}</tbody>
  </Box></Box>;
}

function ProcurementPage({ t, purchases, receipts, onNewReceipt, onApprove }: { t: Translation; purchases: Purchase[]; receipts: GoodsReceipt[]; onNewReceipt: (purchase: Purchase) => void; onApprove: (purchase: Purchase) => void }) {
  return <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" px={1} py={1.5}><Box><Typography className="brand-font" fontWeight={800}>Gate-linked paddy purchases</Typography><Typography color="text.secondary" fontSize={11}>Orders use accepted quality and weighbridge net weight.</Typography></Box><Chip size="small" label={`${purchases.length} orders`} /></Stack>
    {!purchases.length ? <EmptyState text={t.noRows} /> : <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
      <thead><tr>{[t.purchaseNo, t.supplier, t.item, t.qty, t.payableQty, t.rate, t.adjustedRate, t.moisturePolicy, t.brokerCommission, t.status, 'Actions'].map(label => <Box component="th" key={label} className="table-head" sx={{ textAlign: 'left', py: 1.2, px: 1.25, borderBottom: '1px solid var(--line)' }}>{label}</Box>)}</tr></thead>
      <tbody>{purchases.map(row => <tr key={row.id}>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontWeight: 800, fontSize: 12 }}>{row.orderNumber}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.supplier.name}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.item.name}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{formatKg(row.orderedQuantity)}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{formatKg(row.payableQuantityKg)}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>৳ {row.unitRate}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>৳ {row.adjustedUnitRate}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.moisturePolicyName ? `${row.moisturePolicyName} · ${row.moistureReceivedPct}% · −${formatKg(row.moistureDeductionQuantityKg ?? undefined)}` : '—'}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.brokerCommissionAmount == null ? '—' : `৳ ${Number(row.brokerCommissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><StatusTag value={row.status} /></Box>
        <Box component="td" sx={{ py: 1, px: 1, borderBottom: '1px solid var(--line)' }}><Stack direction="row" spacing={.5}>{row.status === 'DRAFT' && <Button size="small" onClick={() => onApprove(row)}>{t.approve}</Button>}{row.status === 'APPROVED' && <Button size="small" variant="contained" onClick={() => onNewReceipt(row)}>{t.newReceipt}</Button>}</Stack></Box>
      </tr>)}</tbody>
    </Box></Box>}
    <Divider sx={{ my: 2 }} /><Typography fontWeight={800} fontSize={12} px={1}>GRN activity · {receipts.length}</Typography>
  </Paper>;
}

function ReceiptsPage({ t, receipts, onApprove, onPost }: { t: Translation; receipts: GoodsReceipt[]; onApprove: (receipt: GoodsReceipt) => void; onPost: (receipt: GoodsReceipt) => void }) {
  return <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" px={1} py={1.5}><Box><Typography className="brand-font" fontWeight={800}>Goods receipt notes</Typography><Typography color="text.secondary" fontSize={11}>Posting a GRN creates the stock-ledger movement.</Typography></Box><Chip size="small" label={`${receipts.length} receipts`} /></Stack>
    {!receipts.length ? <EmptyState text={t.noRows} /> : <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
      <thead><tr>{[t.receiptNo, t.purchaseNo, t.supplier, t.item, t.qty, t.status, 'Actions'].map(label => <Box component="th" key={label} className="table-head" sx={{ textAlign: 'left', py: 1.2, px: 1.25, borderBottom: '1px solid var(--line)' }}>{label}</Box>)}</tr></thead>
      <tbody>{receipts.map(row => <tr key={row.id}>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontWeight: 800, fontSize: 12 }}>{row.receiptNumber}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 11 }}>{row.purchaseOrder.orderNumber}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.purchaseOrder.supplier.name}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.purchaseOrder.item.name}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{formatKg(row.quantity)}</Box>
        <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)' }}><StatusTag value={row.status} /></Box>
        <Box component="td" sx={{ py: 1, px: 1, borderBottom: '1px solid var(--line)' }}><Stack direction="row" spacing={.5}>{row.status === 'DRAFT' && <Button size="small" onClick={() => onApprove(row)}>{t.approve}</Button>}{row.status === 'APPROVED' && <Button size="small" variant="contained" onClick={() => onPost(row)}>{t.post}</Button>}</Stack></Box>
      </tr>)}</tbody>
    </Box></Box>}
  </Paper>;
}

function InventoryPage({ t, rows }: { t: Translation; rows: InventoryRow[] }) {
  return <Stack spacing={2}>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}><WarehouseOutlinedIcon color="primary" /><Box><Typography className="brand-font" fontWeight={800}>Movement ledger balances</Typography><Typography color="text.secondary" fontSize={11}>Derived from receipts, transfers and adjustments; no mutable stock counter.</Typography></Box></Stack>
      {!rows.length ? <EmptyState text={t.noRows} /> : <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead><tr>{['Item code', t.item, 'Godown', t.stack, t.onHand].map(label => <Box component="th" key={label} className="table-head" sx={{ textAlign: 'left', py: 1.2, px: 1.25, borderBottom: '1px solid var(--line)' }}>{label}</Box>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.item.id}-${row.stack?.id ?? index}`}>
          <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 11, color: 'text.secondary' }}>{row.item.code}</Box>
          <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 12 }}>{row.item.name}</Box>
          <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.stack?.godown.name ?? '—'}</Box>
          <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontSize: 12 }}>{row.stack?.code ?? '—'}</Box>
          <Box component="td" sx={{ py: 1.5, px: 1.25, borderBottom: '1px solid var(--line)', fontWeight: 800, fontSize: 12 }}>{formatKg(row.onHand)}</Box>
        </tr>)}</tbody>
      </Box></Box>}
    </Paper>
    <Alert severity="info" icon={<PrecisionManufacturingRoundedIcon />}>Warehouse master creation and audited transfer/adjustment APIs are available in the backend. The form controls for these exceptional stock operations are intentionally not exposed until a supervisor approval/correction workflow is added.</Alert>
  </Stack>;
}
