'use client';

import React, { useState } from 'react';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationType =
  | 'DUE'
  | 'PAYMENT'
  | 'LOW_STOCK'
  | 'APPROVAL'
  | 'PRODUCTION'
  | 'QUALITY'
  | 'VEHICLE'
  | 'DOCUMENT_EXPIRY'
  | 'MAINTENANCE';

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'SUCCESS';

export type TargetRole =
  | 'OWNER'
  | 'ACCOUNTANT'
  | 'FACTORY_MANAGER'
  | 'STORE_MANAGER'
  | 'PURCHASE_MANAGER'
  | 'SALES_MANAGER'
  | 'GATE_OPERATOR'
  | 'LAB_TECHNICIAN'
  | 'MAINTENANCE_HEAD';

export interface NotificationItem {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  priority: NotificationPriority;
  targetRole: TargetRole;
  targetRoleLabelEn: string;
  targetRoleLabelBn: string;
  refCode?: string;
  refEntity?: string;
  actionPage?: string;
  actionLabelEn?: string;
  actionLabelBn?: string;
  titleEn: string;
  titleBn: string;
  messageEn: string;
  messageBn: string;
  isRead: boolean;
  createdAt: string;
  timeAgoEn: string;
  timeAgoBn: string;
}

interface NotificationsPageProps {
  companyId: string;
  language: 'en' | 'bn';
  onSaved?: (message: string) => void;
  onNavigate?: (pageKey: string) => void;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; labelEn: string; labelBn: string; defaultPage: string }
> = {
  DUE: { icon: '💰', labelEn: 'Customer / Supplier Due', labelBn: 'বকেয়া ও পাওনা', defaultPage: 'sales' },
  PAYMENT: { icon: '💳', labelEn: 'Payment Settlement', labelBn: 'পেমেন্ট ও ভাউচার', defaultPage: 'accounting' },
  LOW_STOCK: { icon: '⚠️', labelEn: 'Low Safety Stock', labelBn: 'কম মজুদ সতর্কতা', defaultPage: 'inventory' },
  APPROVAL: { icon: '✍️', labelEn: 'Pending Approval', labelBn: 'অনুমোদন অপেক্ষমাণ', defaultPage: 'approvals' },
  PRODUCTION: { icon: '⚙️', labelEn: 'Milling Production', labelBn: 'মাড়াই উৎপাদন', defaultPage: 'production' },
  QUALITY: { icon: '🔬', labelEn: 'Quality & Moisture', labelBn: 'মান ও আর্দ্রতা', defaultPage: 'qualityControl' },
  VEHICLE: { icon: '🚛', labelEn: 'Gate & Weighbridge', labelBn: 'গেট ও ওয়েব্রিজ', defaultPage: 'gate' },
  DOCUMENT_EXPIRY: { icon: '📄', labelEn: 'License Expiry', labelBn: 'লাইসেন্স মেয়াদ', defaultPage: 'documents' },
  MAINTENANCE: { icon: '🛠️', labelEn: 'Equipment Maintenance', labelBn: 'যন্ত্রপাতি রক্ষণাবেক্ষণ', defaultPage: 'machines' },
};

const PRIORITY_BADGES: Record<
  NotificationPriority,
  { color: string; labelEn: string; labelBn: string; border: string; bg: string }
> = {
  CRITICAL: { color: '#dc2626', labelEn: 'CRITICAL', labelBn: 'জরুরি', border: '#ef4444', bg: '#fef2f2' },
  HIGH: { color: '#d97706', labelEn: 'HIGH ALERT', labelBn: 'উচ্চ সতর্কতা', border: '#f59e0b', bg: '#fffbeb' },
  NORMAL: { color: '#2563eb', labelEn: 'INFORMATION', labelBn: 'তথ্য', border: '#3b82f6', bg: '#eff6ff' },
  SUCCESS: { color: '#059669', labelEn: 'RESOLVED', labelBn: 'সম্পন্ন', border: '#10b981', bg: '#ecfdf5' },
};

export function NotificationsPage({ companyId, language, onSaved, onNavigate }: NotificationsPageProps) {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Test Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [testType, setTestType] = useState<NotificationType>('DUE');
  const [testChannel, setTestChannel] = useState<NotificationChannel>('IN_APP');
  const [testPriority, setTestPriority] = useState<NotificationPriority>('HIGH');
  const [testTargetRole, setTestTargetRole] = useState<TargetRole>('ACCOUNTANT');

  // Initial comprehensive enterprise notifications with clear audience & reference attribution
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      channel: 'IN_APP',
      type: 'DUE',
      priority: 'CRITICAL',
      targetRole: 'ACCOUNTANT',
      targetRoleLabelEn: 'Chief Accountant & Sales Desk',
      targetRoleLabelBn: 'প্রধান হিসাবরক্ষক ও সেলস বিভাগ',
      refCode: 'CUS-001',
      refEntity: 'Messrs Al-Madina Rice Agency',
      actionPage: 'sales',
      actionLabelEn: 'View Customer Ledger',
      actionLabelBn: 'কাস্টমার লেজার দেখুন',
      titleEn: 'Customer Credit Limit Exceeded & Payment Overdue',
      titleBn: 'গ্রাহকের বাকির সীমা অতিক্রম ও বকেয়া বিলম্বিত',
      messageEn: 'Messrs Al-Madina Rice Agency has an overdue balance of ৳ 666,000 exceeding the authorized 15-day credit period. Further dispatches are on temporary hold.',
      messageBn: 'মেসার্স আল-মদিনা রাইস এজেন্সির বকেয়া ৳ ৬৬৬,০০০ অনুমোদিত ১৫ দিনের ক্রেডিট সীমা অতিক্রম করেছে। পরবর্তী ডেলিভারি সাময়িক স্থগিত আছে।',
      isRead: false,
      createdAt: '2026-11-11T13:45:00Z',
      timeAgoEn: '15 mins ago',
      timeAgoBn: '১৫ মিনিট আগে',
    },
    {
      id: 'notif-2',
      channel: 'SMS',
      type: 'VEHICLE',
      priority: 'NORMAL',
      targetRole: 'GATE_OPERATOR',
      targetRoleLabelEn: 'Weighbridge & Security Gate',
      targetRoleLabelBn: 'ওয়েব্রিজ ও সিকিউরিটি গেট',
      refCode: 'WB-2026-001',
      refEntity: 'Truck Bogura-Metro-T-11-0101',
      actionPage: 'gate',
      actionLabelEn: 'Print Scale Slip',
      actionLabelBn: 'স্কেল স্লিপ প্রিন্ট করুন',
      titleEn: 'Digital Weighbridge Gross & Tare Scaling Certified',
      titleBn: 'ডিজিটাল ওয়েব্রিজ ১ম ও ২য় ওজন প্রত্যয়ন সম্পন্ন',
      messageEn: 'Truck Bogura-Metro-T-11-0101 2nd weighment certified. Gross: 15,400 KG, Tare: 5,400 KG, Net Cargo: 10,000 KG (250.00 Mon). Outward gate pass authorized.',
      messageBn: 'ট্রাক বগুড়া-মেট্রো-ট-১১-০১০১ এর ২য় ওজন সম্পন্ন। গ্রস: ১৫,৪০০ কেজি, টার: ৫,৪০০ কেজি, নেট ধান: ১০,০০০ কেজি (২৫০.০০ মণ)। গেট পাস অনুমোদিত।',
      isRead: false,
      createdAt: '2026-11-11T13:15:00Z',
      timeAgoEn: '45 mins ago',
      timeAgoBn: '৪৫ মিনিট আগে',
    },
    {
      id: 'notif-3',
      channel: 'IN_APP',
      type: 'LOW_STOCK',
      priority: 'HIGH',
      targetRole: 'STORE_MANAGER',
      targetRoleLabelEn: 'Storekeeper & Purchase Manager',
      targetRoleLabelBn: 'গুদাম ইন-চার্জ ও ক্রয় ব্যবস্থাপক',
      refCode: 'PAD-01',
      refEntity: 'Godown A - Raw Paddy Silo',
      actionPage: 'inventory',
      actionLabelEn: 'Check Stack Ledger',
      actionLabelBn: 'স্ট্যাক লেজার দেখুন',
      titleEn: 'Raw Grain Below Safety Buffer Stock Threshold',
      titleBn: 'কাঁচা ধান নিরাপত্তা মজুদের নিচে নেমেছে',
      messageEn: 'BRRI Dhan 28 in Godown A (Stack PAD-01) is down to 8,400 KG, which is below the minimum safety threshold of 15,000 KG. New procurement PO required.',
      messageBn: 'গুদাম এ (স্ট্যাক PAD-01)-তে ব্রি ধান ২৮ এর মজুদ ৮,৪০০ কেজিতে নেমেছে (ন্যূনতম নিরাপত্তা সীমা ১৫,০০০ কেজির নিচে)। নতুন ক্রয় চুক্তি প্রয়োজন।',
      isRead: false,
      createdAt: '2026-11-11T11:30:00Z',
      timeAgoEn: '2 hours ago',
      timeAgoBn: '২ ঘণ্টা আগে',
    },
    {
      id: 'notif-4',
      channel: 'WHATSAPP',
      type: 'APPROVAL',
      priority: 'HIGH',
      targetRole: 'OWNER',
      targetRoleLabelEn: 'Managing Director / Factory Owner',
      targetRoleLabelBn: 'ম্যানেজিং ডিরেক্টর / মিল মালিক',
      refCode: 'PO-2026-4421',
      refEntity: 'Haji Shafiul Grain Traders',
      actionPage: 'procurement',
      actionLabelEn: 'Review & Authorize PO',
      actionLabelBn: 'ক্রয় চুক্তি অনুমোদন করুন',
      titleEn: 'High-Value Procurement Contract Pending Sign-off',
      titleBn: 'বড় অঙ্কের ধান ক্রয় চুক্তি অনুমোদনের জন্য অপেক্ষমাণ',
      messageEn: 'Purchase Order PO-2026-4421 for 40,000 KG Miniket Paddy (৳ 1,480,000) submitted by Commercial Desk is awaiting executive signature.',
      messageBn: '৪০,০০০ কেজি মিনিকেট ধান ক্রয়ের চুক্তি PO-2026-4421 (৳ ১৪,৮০,০০০) কমার্শিয়াল ডেস্ক থেকে জমা দেওয়া হয়েছে এবং আপনার স্বাক্ষরের অপেক্ষায় আছে।',
      isRead: false,
      createdAt: '2026-11-11T10:00:00Z',
      timeAgoEn: '3 hours ago',
      timeAgoBn: '৩ ঘণ্টা আগে',
    },
    {
      id: 'notif-5',
      channel: 'EMAIL',
      type: 'PRODUCTION',
      priority: 'SUCCESS',
      targetRole: 'FACTORY_MANAGER',
      targetRoleLabelEn: 'General Manager & Milling Head',
      targetRoleLabelBn: 'জেনারেল ম্যানেজার ও উৎপাদন প্রধান',
      refCode: 'BAT-2026-001',
      refEntity: 'Auto Milling Line #1',
      actionPage: 'production',
      actionLabelEn: 'Inspect Yield Batch',
      actionLabelBn: 'উৎপাদন রিকভারি দেখুন',
      titleEn: 'Daily Milling Production Batch Completed',
      titleBn: 'দৈনিক স্বয়ংক্রিয় চাল মাড়াই ব্যাচ সম্পন্ন',
      messageEn: 'Batch BAT-2026-001 completed: 4,000 KG BR-28 Paddy processed. Head Rice: 2,600 KG (65.00% Recovery), Broken: 300 KG, Bran: 900 KG. Process loss: 50 KG.',
      messageBn: 'ব্যাচ BAT-2026-001 সম্পন্ন: ৪,০০০ কেজি ব্রি-২৮ ধান মাড়াই। প্রধান চাল: ২,৬০০ কেজি (৬৫.০০% রিকভারি), খুদ: ৩০০ কেজি, কুঁড়া: ৯০০ কেজি। প্রসেস লস: ৫০ কেজি।',
      isRead: true,
      createdAt: '2026-11-11T09:30:00Z',
      timeAgoEn: '4 hours ago',
      timeAgoBn: '৪ ঘণ্টা আগে',
    },
    {
      id: 'notif-6',
      channel: 'IN_APP',
      type: 'QUALITY',
      priority: 'CRITICAL',
      targetRole: 'LAB_TECHNICIAN',
      targetRoleLabelEn: 'Lab In-Charge & Purchase Officer',
      targetRoleLabelBn: 'ল্যাব ইন-চার্জ ও ক্রয় কর্মকর্তা',
      refCode: 'QS-2026-001',
      refEntity: 'Bogura Agro Traders - Gate GT-001',
      actionPage: 'qualityControl',
      actionLabelEn: 'View Quality Lab Report',
      actionLabelBn: 'মান নিয়ন্ত্রণ রিপোর্ট দেখুন',
      titleEn: 'High Moisture Paddy Tested - Deduction Formula Applied',
      titleBn: 'অতিরিক্ত আর্দ্রতার ধান শনাক্ত - কর্তন নীতি প্রযোজ্য',
      messageEn: 'Lab Sample QS-2026-001 moisture measured at 15.8% (above baseline 14.0%). Sliding-scale deduction of 1.80% (180 KG / ৳ 6,300) applied to payable quantity.',
      messageBn: 'ল্যাব নমুনা QS-2026-001 এ আর্দ্রতা ১৫.৮% পরিমাপ করা হয়েছে (বেসলাইন ১৪.০% এর উপরে)। ক্রয় চুক্তিতে ১.৮০% কর্তন (১৮০ কেজি / ৳ ৬,৩০০) স্বয়ংক্রিয়ভাবে প্রযোজ্য।',
      isRead: true,
      createdAt: '2026-11-10T16:00:00Z',
      timeAgoEn: '1 day ago',
      timeAgoBn: '১ দিন আগে',
    },
    {
      id: 'notif-7',
      channel: 'SMS',
      type: 'PAYMENT',
      priority: 'SUCCESS',
      targetRole: 'ACCOUNTANT',
      targetRoleLabelEn: 'Chief Accountant & Supplier Ledger',
      targetRoleLabelBn: 'প্রধান হিসাবরক্ষক ও সরবরাহকারী খতিয়ান',
      refCode: 'PMT-2026-001',
      refEntity: 'Bogura Agro Traders',
      actionPage: 'accounting',
      actionLabelEn: 'Open Money Receipt',
      actionLabelBn: 'পেমেন্ট রসিদ দেখুন',
      titleEn: 'Supplier Paddy Payment Disbursed via Bank Transfer',
      titleBn: 'ব্যাংক স্থানান্তরের মাধ্যমে ধান সরবরাহকারীর পাওনা পরিশোধ',
      messageEn: 'Payment PMT-2026-001 of ৳ 348,250 disbursed via Islami Bank Bangladesh Ltd. Accounts Payable and Bank Book ledgers reconciled.',
      messageBn: 'ইসলামী ব্যাংক বাংলাদেশ লিমিটেডের মাধ্যমে ৳ ৩৪৮,২৫০ পরিশোধ করা হয়েছে। সরবরাহকারীর পাওনা এবং ব্যাংক বুক সমন্বয় করা হয়েছে।',
      isRead: true,
      createdAt: '2026-11-10T14:00:00Z',
      timeAgoEn: '1 day ago',
      timeAgoBn: '১ দিন আগে',
    },
    {
      id: 'notif-8',
      channel: 'IN_APP',
      type: 'DOCUMENT_EXPIRY',
      priority: 'HIGH',
      targetRole: 'FACTORY_MANAGER',
      targetRoleLabelEn: 'Admin Officer & Regulatory Vault',
      targetRoleLabelBn: 'প্রশাসন কর্মকর্তা ও নথিপত্র ভল্ট',
      refCode: 'TL-8829',
      refEntity: 'Bogura City Corporation',
      actionPage: 'documents',
      actionLabelEn: 'View License Vault',
      actionLabelBn: 'লাইসেন্স ভল্ট দেখুন',
      titleEn: 'Factory Trade License Renewal Approaching',
      titleBn: 'কারখানার ট্রেড লাইসেন্স নবায়নের সময় আসন্ন',
      messageEn: 'Trade License # TL-8829 expires in 14 days (30th November 2026). Submit renewal documents to municipality authority to avoid operational penalties.',
      messageBn: 'ট্রেড লাইসেন্স নং TL-8829 এর মেয়াদ আগামী ১৪ দিনের মধ্যে (৩০শে নভেম্বর ২০২৬) শেষ হবে। জরিমানা এড়াতে এখনই নবায়ন আবেদন জমা দিন।',
      isRead: true,
      createdAt: '2026-11-10T11:00:00Z',
      timeAgoEn: '1 day ago',
      timeAgoBn: '১ দিন আগে',
    },
    {
      id: 'notif-9',
      channel: 'EMAIL',
      type: 'MAINTENANCE',
      priority: 'HIGH',
      targetRole: 'MAINTENANCE_HEAD',
      targetRoleLabelEn: 'Maintenance Engineer & Shift In-Charge',
      targetRoleLabelBn: 'রক্ষণাবেক্ষণ ইঞ্জিনিয়ার ও শিফট ইন-চার্জ',
      refCode: 'BLR-01',
      refEntity: 'Captive Steam Boiler Unit-1',
      actionPage: 'machines',
      actionLabelEn: 'Inspect Equipment Logs',
      actionLabelBn: 'যন্ত্রপাতির লগ দেখুন',
      titleEn: 'Captive Steam Boiler Scheduled Servicing Due',
      titleBn: 'স্টিম বয়লার নিয়মিত রক্ষণাবেক্ষণের সময় হয়েছে',
      messageEn: 'Boiler Unit-1 has logged 1,200 continuous operating hours. Mandatory safety valve test and descaling maintenance scheduled before next shift.',
      messageBn: 'বয়লার ইউনিট-১ মোট ১,২০০ ঘণ্টা বিরতিহীনভাবে চলেছে। পরবর্তী শিফটের পূর্বে সেফটি ভালভ পরীক্ষা ও পরিষ্কার করা আবশ্যক।',
      isRead: true,
      createdAt: '2026-11-09T10:00:00Z',
      timeAgoEn: '2 days ago',
      timeAgoBn: '২ দিন আগে',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onSaved?.('All notifications marked as read.');
  };

  const handleActionClick = (notif: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMarkAsRead(notif.id);
    const targetPage = notif.actionPage || TYPE_CONFIG[notif.type]?.defaultPage || 'dashboard';
    if (onNavigate) {
      onNavigate(targetPage);
    }
  };

  const handleTriggerTest = (e: React.FormEvent) => {
    e.preventDefault();
    const typeMeta = TYPE_CONFIG[testType];
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      channel: testChannel,
      type: testType,
      priority: testPriority,
      targetRole: testTargetRole,
      targetRoleLabelEn: testTargetRole.replace('_', ' '),
      targetRoleLabelBn: testTargetRole.replace('_', ' '),
      refCode: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      refEntity: 'Test Operational Facility',
      actionPage: typeMeta.defaultPage,
      actionLabelEn: `View ${typeMeta.labelEn}`,
      actionLabelBn: `${typeMeta.labelBn} দেখুন`,
      titleEn: `[Test Alert] ${typeMeta.labelEn}`,
      titleBn: `[টেস্ট সতর্কতা] ${typeMeta.labelBn}`,
      messageEn: `Diagnostic real-time event dispatched across ${testChannel} channel for ${testTargetRole}. Target recipient verified.`,
      messageBn: `${testChannel} চ্যানেলে ${testTargetRole} এর উদ্দেশ্যে টেস্ট নোটিফিকেশন পাঠানো হয়েছে। প্রাপক যাচাই সম্পন্ন।`,
      isRead: false,
      createdAt: new Date().toISOString(),
      timeAgoEn: 'Just now',
      timeAgoBn: 'এইমাত্র',
    };
    setNotifications([newNotif, ...notifications]);
    setShowDispatchModal(false);
    onSaved?.(`Dispatched test ${testType} alert to ${testTargetRole}.`);
  };

  // Advanced Filtering
  const filteredNotifications = notifications.filter((n) => {
    // Channel filter
    if (selectedChannel !== 'ALL' && n.channel !== selectedChannel) return false;

    // Priority filter
    if (selectedPriority !== 'ALL' && n.priority !== selectedPriority) return false;

    // Audience / Tab filter
    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'MANAGEMENT') return n.targetRole === 'OWNER' || n.targetRole === 'FACTORY_MANAGER';
    if (activeTab === 'ACCOUNTS') return n.targetRole === 'ACCOUNTANT' || n.type === 'DUE' || n.type === 'PAYMENT';
    if (activeTab === 'STORE_LOGISTICS') return n.targetRole === 'STORE_MANAGER' || n.targetRole === 'GATE_OPERATOR' || n.targetRole === 'LAB_TECHNICIAN';
    if (activeTab === 'PRODUCTION_PLANT') return n.targetRole === 'FACTORY_MANAGER' || n.targetRole === 'MAINTENANCE_HEAD' || n.type === 'PRODUCTION';
    if (activeTab === 'CRITICAL') return n.priority === 'CRITICAL' || n.priority === 'HIGH';

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-emerald-50 rounded-xl border border-emerald-200">🔔</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {language === 'bn' ? 'মাল্টি-চ্যানেল নোটিফিকেশন সেন্টার' : 'Enterprise Notification Center'}
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-300 animate-pulse">
                    {unreadCount} {language === 'bn' ? 'টি অপঠিত' : 'Unread'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'কার জন্য কোন নোটিফিকেশন তা সুস্পষ্ট পদবী (Role), রেফারেন্স আইডি এবং তাৎক্ষণিক অ্যাকশন বাটন সহ সাজানো।'
                  : 'Role-targeted operational intelligence: Audience attribution, document reference, priority tagging, and 1-click action links.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold rounded-xl text-xs transition-colors border border-slate-300"
          >
            ✓ {language === 'bn' ? 'সব পঠিত করুন' : 'Mark All Read'}
          </button>
          <button
            onClick={() => setShowDispatchModal(true)}
            className="px-4 py-2 bg-[#1b6a4a] hover:bg-[#104c36] text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>⚡</span> {language === 'bn' ? 'টেস্ট নোটিফিকেশন পাঠান' : 'Trigger Test Alert'}
          </button>
        </div>
      </div>

      {/* 2. Channel Health KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: 'In-App Telemetry', bnName: 'ইন-অ্যাপ বার্তারূপ', icon: '💻', count: notifications.filter((n) => n.channel === 'IN_APP').length, active: true, color: 'emerald' },
          { name: 'SMS Gateways (BRTA/OTP)', bnName: 'এসএমএস গেটওয়ে', icon: '📱', count: notifications.filter((n) => n.channel === 'SMS').length, active: true, color: 'amber' },
          { name: 'Email Dispatch (SMTP)', bnName: 'ইমেইল ভাউচার', icon: '✉️', count: notifications.filter((n) => n.channel === 'EMAIL').length, active: true, color: 'blue' },
          { name: 'WhatsApp Cloud API', bnName: 'হোয়াটসঅ্যাপ ক্লাউড', icon: '💬', count: notifications.filter((n) => n.channel === 'WHATSAPP').length, active: true, color: 'emerald' },
        ].map((ch) => (
          <div key={ch.name} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{ch.icon}</span>
              <div>
                <p className="text-[11px] font-bold text-slate-800 leading-tight">
                  {language === 'bn' ? ch.bnName : ch.name}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">● Connected</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {ch.count}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Notifications Feed Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation & Multi-Level Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 space-y-3">
          {/* Target Audience / Functional Department Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              {language === 'bn' ? 'লক্ষ্য দল:' : 'Audience:'}
            </span>
            {[
              { id: 'ALL', label: 'All Alerts', labelBn: 'সকল' },
              { id: 'CRITICAL', label: 'Critical & High', labelBn: 'জরুরি ও উচ্চ' },
              { id: 'UNREAD', label: `Unread (${unreadCount})`, labelBn: `অপঠিত (${unreadCount})` },
              { id: 'MANAGEMENT', label: 'Owner & MD', labelBn: 'মালিক ও প্রশাসন' },
              { id: 'ACCOUNTS', label: 'Accounts & Dues', labelBn: 'হিসাব ও বকেয়া' },
              { id: 'STORE_LOGISTICS', label: 'Store & Gate', labelBn: 'গুদাম ও গেট' },
              { id: 'PRODUCTION_PLANT', label: 'Production & Plant', labelBn: 'উৎপাদন ও প্ল্যান্ট' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#1b6a4a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                {language === 'bn' ? tab.labelBn : tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Filters: Channels & Priorities */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60 text-xs">
            {/* Channel Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'bn' ? 'চ্যানেল:' : 'Channel:'}
              </span>
              {(['ALL', 'IN_APP', 'SMS', 'EMAIL', 'WHATSAPP'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    selectedChannel === ch
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Priority Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'bn' ? 'জরুরিতা:' : 'Priority:'}
              </span>
              {(['ALL', 'CRITICAL', 'HIGH', 'NORMAL', 'SUCCESS'] as const).map((pr) => (
                <button
                  key={pr}
                  onClick={() => setSelectedPriority(pr)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    selectedPriority === pr
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Enhanced Notification Cards List */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="font-semibold text-slate-600">
                {language === 'bn' ? 'কোনো নোটিফিকেশন পাওয়া যায়নি।' : 'No notifications matching the selected filters.'}
              </p>
              <p className="text-[11px]">
                {language === 'bn' ? 'ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।' : 'Try selecting "All Alerts" to view all system notifications.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const priorityMeta = PRIORITY_BADGES[n.priority] || PRIORITY_BADGES.NORMAL;
              const typeMeta = TYPE_CONFIG[n.type];

              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  style={{ borderLeftColor: priorityMeta.border }}
                  className={`p-4 border-l-4 transition-all hover:bg-slate-50/80 cursor-pointer ${
                    n.isRead ? 'bg-white opacity-80' : 'bg-slate-50/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Main Content & Tags */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Icon Box */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                        {typeMeta?.icon || '🔔'}
                      </div>

                      {/* Content Body */}
                      <div className="min-w-0 space-y-1.5 flex-1">
                        {/* Tags Row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Unread Indicator */}
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
                          )}

                          {/* 1. Target Audience Badge (Crucial for knowing who it belongs to!) */}
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>👤</span>
                            <span>{language === 'bn' ? `প্রাপক: ${n.targetRoleLabelBn}` : `Audience: ${n.targetRoleLabelEn}`}</span>
                          </span>

                          {/* 2. Priority Badge */}
                          <span
                            style={{ color: priorityMeta.color, backgroundColor: priorityMeta.bg, borderColor: priorityMeta.border }}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
                          >
                            {language === 'bn' ? priorityMeta.labelBn : priorityMeta.labelEn}
                          </span>

                          {/* 3. Reference ID Badge */}
                          {n.refCode && (
                            <span className="bg-slate-100 text-slate-800 font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-300">
                              🔖 {n.refCode}
                            </span>
                          )}

                          {/* 4. Channel Badge */}
                          <span
                            className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                              n.channel === 'IN_APP'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : n.channel === 'SMS'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : n.channel === 'EMAIL'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {n.channel}
                          </span>

                          {/* Time */}
                          <span className="text-[11px] font-mono text-slate-400 ml-auto md:ml-0">
                            • {language === 'bn' ? n.timeAgoBn : n.timeAgoEn}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className={`text-xs font-bold ${n.isRead ? 'text-slate-700' : 'text-slate-900 font-extrabold'}`}>
                          {language === 'bn' ? n.titleBn : n.titleEn}
                          {n.refEntity && (
                            <span className="font-normal text-slate-500 text-[11px] ml-1.5">
                              — {n.refEntity}
                            </span>
                          )}
                        </h4>

                        {/* Message Description */}
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {language === 'bn' ? n.messageBn : n.messageEn}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Direct 1-Click Action to relevant ERP module */}
                      <button
                        onClick={(e) => handleActionClick(n, e)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b6a4a] border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs"
                      >
                        <span>{language === 'bn' ? (n.actionLabelBn || 'বিবরণ দেখুন') : (n.actionLabelEn || 'Open Details')}</span>
                        <span>➔</span>
                      </button>

                      {/* Read/Unread Toggle */}
                      <button
                        onClick={(e) => handleToggleRead(n.id, e)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold underline"
                      >
                        {n.isRead ? (language === 'bn' ? 'অপঠিত চিহ্নিত করুন' : 'Mark Unread') : (language === 'bn' ? 'পঠিত চিহ্নিত করুন' : 'Mark Read')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. MODAL: DISPATCH TEST NOTIFICATION */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {language === 'bn' ? 'টেস্ট নোটিফিকেশন তৈরি করুন' : 'Trigger Test Notification'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'bn'
                ? 'যেকোনো বিভাগ, প্রাপক এবং চ্যানেলে টেস্ট নোটিফিকেশন পাঠিয়ে যাচাই করুন।'
                : 'Select recipient role, event trigger type, priority level, and dispatch channel.'}
            </p>

            <form onSubmit={handleTriggerTest} className="space-y-3.5 text-xs">
              {/* Target Role Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'প্রাপক পদবী (Target Role / Audience):' : 'Target Recipient Role (Audience):'}
                </label>
                <select
                  value={testTargetRole}
                  onChange={(e) => setTestTargetRole(e.target.value as TargetRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                >
                  <option value="OWNER">👑 Managing Director / Owner (মালিক ও প্রশাসন)</option>
                  <option value="ACCOUNTANT">📊 Chief Accountant (প্রধান হিসাবরক্ষক)</option>
                  <option value="FACTORY_MANAGER">🏭 Factory Manager (কারখানা ম্যানেজার)</option>
                  <option value="STORE_MANAGER">📦 Storekeeper / Godown (গুদাম ইন-চার্জ)</option>
                  <option value="GATE_OPERATOR">⚖️ Weighbridge & Gate (স্কেল ও গেট ডেস্ক)</option>
                  <option value="PURCHASE_MANAGER">🛒 Purchase Officer (ধান ক্রয় কর্মকর্তা)</option>
                  <option value="SALES_MANAGER">💼 Sales & Recovery (চাল বিক্রয় বিভাগ)</option>
                  <option value="LAB_TECHNICIAN">🔬 Lab In-Charge (মান ও আর্দ্রতা ল্যাব)</option>
                  <option value="MAINTENANCE_HEAD">🛠️ Maintenance Engineer (রক্ষণাবেক্ষণ)</option>
                </select>
              </div>

              {/* Event Trigger Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোটিফিকেশনের ধরন (Event Domain):' : 'Notification Trigger Type:'}
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as NotificationType)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                >
                  <option value="DUE">💰 Due (Customer / Supplier Due Overdue)</option>
                  <option value="PAYMENT">💳 Payment (Received / Disbursed Settlement)</option>
                  <option value="LOW_STOCK">⚠️ Low Stock (Paddy / Rice / Packaging Bags)</option>
                  <option value="APPROVAL">✍️ Approval (Pending Purchase/Expense Sign-off)</option>
                  <option value="PRODUCTION">⚙️ Production (Batch Complete & Recovery Yield)</option>
                  <option value="QUALITY">🔬 Quality (Moisture Deduction & Grain Reject)</option>
                  <option value="VEHICLE">🚛 Vehicle (Gate Pass & Weighbridge Tare/Net)</option>
                  <option value="DOCUMENT_EXPIRY">📄 Document Expiry (Trade License / Insurance)</option>
                  <option value="MAINTENANCE">🛠️ Maintenance (Boiler / Huller Service Due)</option>
                </select>
              </div>

              {/* Priority & Channel */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'জরুরিতা (Priority):' : 'Priority Level:'}
                  </label>
                  <select
                    value={testPriority}
                    onChange={(e) => setTestPriority(e.target.value as NotificationPriority)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="CRITICAL">🔴 Critical (জরুরি)</option>
                    <option value="HIGH">🟠 High (উচ্চ সতর্কতা)</option>
                    <option value="NORMAL">🔵 Normal (তথ্য)</option>
                    <option value="SUCCESS">🟢 Success (সম্পন্ন)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চ্যানেল (Channel):' : 'Channel:'}
                  </label>
                  <select
                    value={testChannel}
                    onChange={(e) => setTestChannel(e.target.value as NotificationChannel)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="IN_APP">💻 In-App Portal</option>
                    <option value="SMS">📱 SMS Gateway</option>
                    <option value="EMAIL">✉️ Email Voucher</option>
                    <option value="WHATSAPP">💬 WhatsApp API</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'নোটিফিকেশনে প্রাপক রোল, রেফারেন্স আইডি এবং সংশ্লিষ্ট পেজে যাওয়ার লিংক যুক্ত থাকবে।'
                  : 'Notice includes recipient role badge, reference identifier, and a 1-click action button navigating to the relevant ERP module.'}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-xs"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b6a4a] hover:bg-[#104c36] text-white rounded-lg font-bold text-xs"
                >
                  {language === 'bn' ? 'নোটিফিকেশন পাঠান' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
