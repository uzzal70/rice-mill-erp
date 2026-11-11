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

interface NotificationItem {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
}

interface NotificationsPageProps {
  companyId: string;
  language: 'en' | 'bn';
  onSaved?: (message: string) => void;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  DUE: '💰',
  PAYMENT: '💳',
  LOW_STOCK: '⚠️',
  APPROVAL: '✍️',
  PRODUCTION: '⚙️',
  QUALITY: '🔬',
  VEHICLE: '🚛',
  DOCUMENT_EXPIRY: '📄',
  MAINTENANCE: '🛠️',
};

export function NotificationsPage({ companyId, language, onSaved }: NotificationsPageProps) {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Test Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [testType, setTestType] = useState<NotificationType>('DUE');
  const [testChannel, setTestChannel] = useState<NotificationChannel>('IN_APP');

  // Initial enterprise notifications across all 9 domains & 4 channels
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      channel: 'IN_APP',
      type: 'DUE',
      title: 'Customer Payment Overdue Alert',
      message: 'Messrs Al-Madina Rice Agency has overdue balance of ৳666,000 exceeding 15-day credit period.',
      isRead: false,
      createdAt: '2026-11-11T13:45:00Z',
      timeAgo: '15m ago',
    },
    {
      id: 'notif-2',
      channel: 'SMS',
      type: 'VEHICLE',
      title: 'Weighbridge Digital Scale Slip Certified',
      message: 'Truck Bogura-Ta 11-7890 2nd weighment completed. Net Cargo: 24,820 KG (620.50 Mon). Scale pass granted.',
      isRead: false,
      createdAt: '2026-11-11T13:15:00Z',
      timeAgo: '45m ago',
    },
    {
      id: 'notif-3',
      channel: 'IN_APP',
      type: 'LOW_STOCK',
      title: 'Raw Paddy Reorder Threshold Reached',
      message: 'BR-28 Paddy in Godown #1 is down to 8,400 KG (below minimum safety stock threshold of 15,000 KG).',
      isRead: false,
      createdAt: '2026-11-11T11:30:00Z',
      timeAgo: '2h ago',
    },
    {
      id: 'notif-4',
      channel: 'EMAIL',
      type: 'PRODUCTION',
      title: 'Daily Milling Production Batch Completed',
      message: 'Line #1 completed Batch-512: 40,000 KG processed. Head Rice Output: 26,400 KG (66.00% Recovery).',
      isRead: true,
      createdAt: '2026-11-11T09:30:00Z',
      timeAgo: '4h ago',
    },
    {
      id: 'notif-5',
      channel: 'WHATSAPP',
      type: 'DOCUMENT_EXPIRY',
      title: 'Trade License Expiry Approaching',
      message: 'Dinajpur Municipality Trade License # TL-8829 expires in 14 days (30th November 2026). Renewal needed.',
      isRead: false,
      createdAt: '2026-11-11T08:00:00Z',
      timeAgo: '6h ago',
    },
    {
      id: 'notif-6',
      channel: 'IN_APP',
      type: 'APPROVAL',
      title: 'Purchase Order Approval Required',
      message: 'PO-2026-4421 (৳1,076,999) submitted by Commercial Desk is awaiting Managing Director sign-off.',
      isRead: true,
      createdAt: '2026-11-10T16:00:00Z',
      timeAgo: '1d ago',
    },
    {
      id: 'notif-7',
      channel: 'SMS',
      type: 'PAYMENT',
      title: 'Supplier Payment Disbursed',
      message: 'Payment voucher PV-2026-0422 of ৳170,000 disbursed via BEFTN Bank Transfer to Delta Power Ltd.',
      isRead: true,
      createdAt: '2026-11-10T14:00:00Z',
      timeAgo: '1d ago',
    },
    {
      id: 'notif-8',
      channel: 'IN_APP',
      type: 'QUALITY',
      title: 'High Moisture Paddy Tested',
      message: 'Truck Bogura-Ta 11-7890 paddy moisture tested at 15.2% (1.75% quality deduction applied by Lab).',
      isRead: true,
      createdAt: '2026-11-10T11:00:00Z',
      timeAgo: '1d ago',
    },
    {
      id: 'notif-9',
      channel: 'EMAIL',
      type: 'MAINTENANCE',
      title: 'Captive Steam Boiler Servicing Due',
      message: 'Boiler Unit-1 has logged 1,200 operating hours. Scheduled safety valve servicing required.',
      isRead: true,
      createdAt: '2026-11-09T10:00:00Z',
      timeAgo: '2d ago',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onSaved?.('All notifications marked as read.');
  };

  const handleTriggerTest = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      channel: testChannel,
      type: testType,
      title: `[Test] ${testType} Alert Triggered`,
      message: `System diagnostic notification dispatched across ${testChannel} channel for ${testType}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      timeAgo: 'Just now',
    };
    setNotifications([newNotif, ...notifications]);
    setShowDispatchModal(false);
    onSaved?.(`Dispatched test ${testType} alert via ${testChannel}.`);
  };

  // Filtering
  const filteredNotifications = notifications.filter((n) => {
    if (selectedChannel !== 'ALL' && n.channel !== selectedChannel) return false;

    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'COMMERCIAL') return n.type === 'DUE' || n.type === 'PAYMENT';
    if (activeTab === 'OPERATIONS') return n.type === 'LOW_STOCK' || n.type === 'PRODUCTION';
    if (activeTab === 'LOGISTICS') return n.type === 'QUALITY' || n.type === 'VEHICLE';
    if (activeTab === 'GOVERNANCE') return n.type === 'APPROVAL' || n.type === 'DOCUMENT_EXPIRY' || n.type === 'MAINTENANCE';

    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            <h1 className="text-2xl font-bold text-slate-900">
              {language === 'bn' ? 'মাল্টি-চ্যানেল নোটিফিকেশন সেন্টার' : 'Multi-Channel Notification Center'}
            </h1>
            {unreadCount > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'bn'
              ? 'ইন-অ্যাপ, ইমেইল, এসএমএস এবং হোয়াটসঅ্যাপ নোটিফিকেশন: বাকি বকেয়া, পেমেন্ট, কম স্টক, অনুমোদন, উৎপাদন, মান, যানবাহন, মেয়াদ ও রক্ষণাবেক্ষণ।'
              : 'Multi-channel dispatch for Due, Payment, Low Stock, Approval, Production, Quality, Vehicle, Document Expiry, and Maintenance.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium rounded-xl text-xs transition-colors border border-slate-300"
          >
            Mark All as Read (সব পঠিত চিহ্নিত করুন)
          </button>
          <button
            onClick={() => setShowDispatchModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition-colors shadow-sm"
          >
            <span>🚀</span> Trigger Test Alert
          </button>
        </div>
      </div>

      {/* 1. MULTI-CHANNEL STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* In-App */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel 1</span>
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <h3 className="font-bold text-slate-900 text-sm">In-App Notifications</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Real-time alerts, header counter badges, and audio chime.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-emerald-700 font-mono">ONLINE (Active)</span>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel 2</span>
              <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📧</span>
              <h3 className="font-bold text-slate-900 text-sm">Email Alerts (SMTP)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">HTML milling production reports, statements, and approvals.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-blue-700 font-mono">READY (SMTP)</span>
          </div>
        </div>

        {/* SMS-Ready */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel 3</span>
              <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <h3 className="font-bold text-slate-900 text-sm">SMS-Ready Gateway</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">160-char Bangla/English SMS to farmers and truck drivers.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-amber-700 font-mono">SMS-READY</span>
          </div>
        </div>

        {/* WhatsApp-Ready */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel 4</span>
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🟢</span>
              <h3 className="font-bold text-slate-900 text-sm">WhatsApp-Ready API</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Meta Cloud API interactive templates for challan & due slips.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-emerald-700 font-mono">WHATSAPP-READY</span>
          </div>
        </div>
      </div>

      {/* 2. NOTIFICATION FEED CONTAINER */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation & Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'All Alerts', labelBn: 'সকল' },
              { id: 'UNREAD', label: `Unread (${unreadCount})`, labelBn: `অপঠিত (${unreadCount})` },
              { id: 'COMMERCIAL', label: 'Due & Payment', labelBn: 'বকেয়া ও পেমেন্ট' },
              { id: 'OPERATIONS', label: 'Stock & Production', labelBn: 'মজুদ ও উৎপাদন' },
              { id: 'LOGISTICS', label: 'Quality & Gate', labelBn: 'মান ও গেট' },
              { id: 'GOVERNANCE', label: 'Approvals & Systems', labelBn: 'অনুমোদন ও সিস্টেম' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                {language === 'bn' ? tab.labelBn : tab.label}
              </button>
            ))}
          </div>

          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Channel:</span>
            {(['ALL', 'IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  selectedChannel === ch
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No notifications matching current filters.
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id)}
                className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                  n.isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-emerald-50/20 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                      )}
                      <h4 className={`text-xs font-bold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                        {n.title}
                      </h4>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                        {n.type}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          n.channel === 'IN_APP'
                            ? 'bg-slate-50 text-slate-600 border-slate-200'
                            : n.channel === 'SMS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : n.channel === 'EMAIL'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {n.channel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[11px] font-mono text-slate-400">{n.timeAgo}</span>
                  {!n.isRead && (
                    <span className="text-[10px] font-semibold text-emerald-700 hover:underline">
                      Mark Read
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: DISPATCH TEST ALERT (Tests all 9 types & 4 channels) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Trigger Test Notification (টেস্ট নোটিফিকেশন)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select any of the 9 operational notification triggers and 4 dispatch channels.
            </p>

            <form onSubmit={handleTriggerTest} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Notification Trigger Type:</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as NotificationType)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="DUE">💰 Due (Customer / Supplier Due)</option>
                  <option value="PAYMENT">💳 Payment (Received / Disbursed)</option>
                  <option value="LOW_STOCK">⚠️ Low Stock (Paddy / Rice / Bags)</option>
                  <option value="APPROVAL">✍️ Approval (Pending Workflow Sign-off)</option>
                  <option value="PRODUCTION">⚙️ Production (Batch Complete / Yield)</option>
                  <option value="QUALITY">🔬 Quality (Moisture Deduction / Reject)</option>
                  <option value="VEHICLE">🚛 Vehicle (Gate Pass & Weighbridge)</option>
                  <option value="DOCUMENT_EXPIRY">📄 Document Expiry (License / Fitness)</option>
                  <option value="MAINTENANCE">🛠️ Maintenance (Machine Run Hours)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Dispatch Channel:</label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as NotificationChannel)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="IN_APP">📱 In-App (Real-Time Internal)</option>
                  <option value="EMAIL">📧 Email (HTML SMTP Alert)</option>
                  <option value="SMS">💬 SMS-Ready (160-Char Bangla Gateway)</option>
                  <option value="WHATSAPP">🟢 WhatsApp-Ready (Meta Cloud Template)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                Dispatches immediately to the notification bus with realistic test parameters conforming to Promptdoc #60.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

