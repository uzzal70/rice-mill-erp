'use client';

import React, { useState } from 'react';

export type PrintDocumentType =
  | 'PURCHASE_INVOICE'
  | 'PURCHASE_RECEIPT'
  | 'GATE_PASS'
  | 'WEIGHBRIDGE_TICKET'
  | 'QUALITY_REPORT'
  | 'GRN'
  | 'STOCK_TRANSFER'
  | 'PRODUCTION_REPORT'
  | 'SALES_INVOICE'
  | 'DELIVERY_CHALLAN'
  | 'PAYMENT_RECEIPT'
  | 'MONEY_RECEIPT'
  | 'SUPPLIER_STATEMENT'
  | 'CUSTOMER_STATEMENT';

interface DocumentMeta {
  type: PrintDocumentType;
  title: string;
  titleBn: string;
  category: 'Commercial' | 'Gate & Weigh' | 'Production' | 'Warehouse' | 'Accounts';
  icon: string;
}

const DOCUMENT_CATALOG: DocumentMeta[] = [
  { type: 'PURCHASE_INVOICE', title: 'Purchase Invoice', titleBn: 'ধান ক্রয় চালান', category: 'Commercial', icon: '📄' },
  { type: 'PURCHASE_RECEIPT', title: 'Purchase Receipt', titleBn: 'ক্রয় রসিদ', category: 'Commercial', icon: '🧾' },
  { type: 'GATE_PASS', title: 'Gate Pass', titleBn: 'গেট পাস', category: 'Gate & Weigh', icon: '🚧' },
  { type: 'WEIGHBRIDGE_TICKET', title: 'Weighbridge Ticket', titleBn: 'ওজন স্কেল টিকিট', category: 'Gate & Weigh', icon: '⚖️' },
  { type: 'QUALITY_REPORT', title: 'Quality Report', titleBn: 'গুণগত মান নিয়ন্ত্রণ রিপোর্ট', category: 'Gate & Weigh', icon: '🔬' },
  { type: 'GRN', title: 'Goods Received Note (GRN)', titleBn: 'মাল প্রাপ্তি নোট (জিআরএন)', category: 'Warehouse', icon: '📦' },
  { type: 'STOCK_TRANSFER', title: 'Stock Transfer Note', titleBn: 'গুদাম স্থানান্তর পত্র', category: 'Warehouse', icon: '🔄' },
  { type: 'PRODUCTION_REPORT', title: 'Daily Production Report', titleBn: 'দৈনিক উৎপাদন রিপোর্ট', category: 'Production', icon: '⚙️' },
  { type: 'SALES_INVOICE', title: 'Sales Invoice', titleBn: 'বিক্রয় চালান / বিল', category: 'Commercial', icon: '💰' },
  { type: 'DELIVERY_CHALLAN', title: 'Delivery Challan', titleBn: 'ডেলিভারি চালান', category: 'Warehouse', icon: '🚚' },
  { type: 'PAYMENT_RECEIPT', title: 'Payment Voucher', titleBn: 'পেমেন্ট ভাউচার', category: 'Accounts', icon: '💳' },
  { type: 'MONEY_RECEIPT', title: 'Money Receipt (MR)', titleBn: 'মানি রিসিট', category: 'Accounts', icon: '💵' },
  { type: 'SUPPLIER_STATEMENT', title: 'Supplier Statement', titleBn: 'সরবরাহকারী খতিয়ান', category: 'Accounts', icon: '📑' },
  { type: 'CUSTOMER_STATEMENT', title: 'Customer Statement', titleBn: 'গ্রাহক খতিয়ান', category: 'Accounts', icon: '📊' },
];

export function DocumentPrintingPage() {
  const [selectedType, setSelectedType] = useState<PrintDocumentType>('PURCHASE_INVOICE');
  const [documentId, setDocumentId] = useState<string>('sample-default');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Commercial', 'Gate & Weigh', 'Warehouse', 'Production', 'Accounts'];

  const filteredDocs = activeCategory === 'ALL'
    ? DOCUMENT_CATALOG
    : DOCUMENT_CATALOG.filter((d) => d.category === activeCategory);

  const currentMeta = DOCUMENT_CATALOG.find((d) => d.type === selectedType) || DOCUMENT_CATALOG[0];

  const handlePrint = () => {
    window.print();
  };

  // Helper data matching backend sample models
  const getDocSampleData = () => {
    const today = new Date().toISOString().split('T')[0];
    switch (selectedType) {
      case 'PURCHASE_INVOICE':
        return {
          title: 'PURCHASE INVOICE',
          titleBn: 'ধান ক্রয় চালান',
          docNo: 'PINV-2026-0891',
          date: today,
          refNo: 'PO-2026-4421',
          partyTitle: 'Supplier Information',
          partyName: 'Haji Mokbul Trading Co.',
          partyCode: 'SUP-784',
          partyAddress: 'Mohasthangarh Arat, Bogura',
          partyPhone: '+880 1712-998877',
          items: [
            { sl: 1, name: 'BR-28 Premium Paddy (বিআর-২৮ ধান)', desc: 'Moisture 14.8%, deduction 1.5% applied', qty: '27,974 KG', rate: '৳38.50', deduction: '৳16,401', total: '৳1,076,999' },
          ],
          totalQty: '27,974 KG (699.35 MON)',
          subtotal: '৳1,093,400',
          deductions: '৳16,401',
          grandTotal: '৳1,076,999',
          inWords: 'Taka Ten Lakh Seventy-Six Thousand Nine Hundred Ninety-Nine Only',
          terms: [
            'Payment subject to official weight and quality clearance certified by our mill lab.',
            'Payment will be disbursed via Account Payee Cheque / BEFTN bank transfer.',
            'Standard moisture limit 14.0%. Deductions applied as per approved national procurement schedule.',
          ],
        };
      case 'WEIGHBRIDGE_TICKET':
        return {
          title: 'CERTIFIED WEIGHBRIDGE TICKET',
          titleBn: 'ওজন স্কেল সনদপত্র',
          docNo: 'WT-2026-5541',
          date: today,
          refNo: 'GP-2026-9912',
          partyTitle: 'Transporter & Vehicle Details',
          partyName: 'Desh Transport Agency (Truck # Bogura-Ta 11-7890)',
          partyCode: 'TR-09',
          partyAddress: 'Driver: Md. Shahjahan Miah',
          partyPhone: '+880 1715-442211',
          items: [
            { sl: 1, name: 'Gross Weight (ভরা গাড়ির ওজন)', desc: 'Vehicle loaded with paddy sacks & driver', qty: '36,240 KG', rate: '-', deduction: '-', total: '36,240 KG' },
            { sl: 2, name: 'Tare Weight (খালি গাড়ির ওজন)', desc: 'Vehicle unloaded at Silo Bay #2', qty: '11,420 KG', rate: '-', deduction: '-', total: '11,420 KG' },
            { sl: 3, name: 'Net Weight (প্রকৃত চালানের নিট ওজন)', desc: 'Actual raw grain delivered to Silo #2', qty: '24,820 KG', rate: '-', deduction: '-', total: '24,820 KG' },
          ],
          totalQty: '24,820 KG (620.50 MON)',
          subtotal: '-',
          deductions: '-',
          grandTotal: '24,820 KG Net',
          inWords: 'Net Cargo: Twenty-Four Thousand Eight Hundred Twenty Kilograms Only',
          terms: [
            'Weight certified by Avery Weigh-Tronix 80 MT electronic digital weighbridge (BSTI Approved).',
            'Any discrepancy must be lodged with the weighbridge in-charge prior to vehicle gate departure.',
          ],
        };
      case 'SALES_INVOICE':
        return {
          title: 'COMMERCIAL SALES INVOICE',
          titleBn: 'বাণিজ্যিক বিক্রয় চালান ও ইনভয়েস',
          docNo: 'SINV-2026-1048',
          date: today,
          refNo: 'SO-2026-0742',
          partyTitle: 'Customer / Buyer Details',
          partyName: 'Messrs Al-Madina Rice Agency',
          partyCode: 'CUS-402',
          partyAddress: 'Badamtoli Rice Market, Kotwali, Dhaka-1100',
          partyPhone: '+880 1713-112233',
          items: [
            { sl: 1, name: 'Premium Miniket Rice (মিনিকেট চাল - ৫০ কেজি)', desc: '50 KG Woven PP Bag, double polished sortex clean', qty: '400 BAGS (20,000 KG)', rate: '৳3,400 / Bag', deduction: '৳0', total: '৳1,360,000' },
            { sl: 2, name: 'Rice Bran / Auto Bran (অটো কুঁড়া)', desc: 'High oil bran for feed mill', qty: '40 BAGS (2,000 KG)', rate: '৳1,400 / Bag', deduction: '৳0', total: '৳56,000' },
          ],
          totalQty: '440 BAGS (22,000 KG)',
          subtotal: '৳1,416,000',
          deductions: '৳0',
          grandTotal: '৳1,416,000',
          inWords: 'Taka Fourteen Lakh Sixteen Thousand Only',
          terms: [
            'Rice exempted from standard VAT as per National Board of Revenue (NBR) grain SRO.',
            'Goods once dispatched and signed via Delivery Challan are non-returnable without written authorization.',
            'Settlement via Bank Deposit: Sonar Bangla Auto Rice Mill Ltd., A/C: 102938475601, IBBL.',
          ],
        };
      case 'DELIVERY_CHALLAN':
        return {
          title: 'DELIVERY CHALLAN',
          titleBn: 'ডেলিভারি চালান',
          docNo: 'DC-2026-0814',
          date: today,
          refNo: 'SO-2026-0742',
          partyTitle: 'Consignee & Destination',
          partyName: 'Messrs Al-Madina Rice Agency',
          partyCode: 'CUS-402',
          partyAddress: 'Badamtoli Rice Warehouse, Dhaka',
          partyPhone: 'Driver: Md. Selim Reza (01817-223344)',
          items: [
            { sl: 1, name: 'Premium Miniket Rice 50 KG PP Bags', desc: 'Brand Stamped Factory Sealed Bags', qty: '400 BAGS', rate: '-', deduction: '-', total: '20,000 KG' },
            { sl: 2, name: 'Auto Rice Bran 50 KG Bags', desc: 'Feed Grade Fine Bran', qty: '40 BAGS', rate: '-', deduction: '-', total: '2,000 KG' },
          ],
          totalQty: '440 BAGS (22,000 KG)',
          subtotal: '-',
          deductions: '-',
          grandTotal: '440 Bags Dispatched',
          inWords: 'Four Hundred Forty Bags Only',
          terms: [
            'Carrier is responsible for intact bag counts and moisture protection during road transit.',
            'Consignee must sign and stamp duplicate copy and return with truck driver.',
          ],
        };
      case 'PRODUCTION_REPORT':
        return {
          title: 'DAILY MILLING PRODUCTION REPORT',
          titleBn: 'দৈনিক চাল উৎপাদন রিপোর্ট',
          docNo: 'PROD-2026-1205',
          date: today,
          refNo: 'BATCH-2026-512',
          partyTitle: 'Milling Line & Shift Info',
          partyName: 'Auto Milling Line #1 (Buhler)',
          partyCode: 'LINE-01',
          partyAddress: 'Shift: Day Shift (08:00 AM - 04:30 PM)',
          partyPhone: 'Incharge: Engr. Kamal Hossain',
          items: [
            { sl: 1, name: 'Head Rice - Miniket Premium (প্রধান চাল)', desc: 'Silky sortex polished grain', qty: '26,400 KG', rate: '66.00%', deduction: '-', total: '528 Bags' },
            { sl: 2, name: 'Broken Rice / Khudi (খুদ)', desc: 'Secondary broken grain', qty: '1,200 KG', rate: '3.00%', deduction: '-', total: '24 Bags' },
            { sl: 3, name: 'Rice Bran (কুঁড়া / তুষ)', desc: 'Feed & oil bran', qty: '3,600 KG', rate: '9.00%', deduction: '-', total: '72 Bags' },
            { sl: 4, name: 'Rice Husk / Bhusa (তুষ / ভুসি)', desc: 'Boiler husk fuel', qty: '8,480 KG', rate: '21.20%', deduction: '-', total: 'Bulk' },
          ],
          totalQty: '39,680 KG Output (Input: 40,000 KG)',
          subtotal: 'Process Loss: 320 KG (0.80%)',
          deductions: '-',
          grandTotal: 'Recovery Rate: 69.00% Commercial Rice',
          inWords: 'Total Output: Thirty-Nine Thousand Six Hundred Eighty Kilograms',
          terms: [
            'Production report calibrated against automatic pre-cleaner hopper counters.',
            'Head rice transferred to Finished Godown #1 for immediate packing.',
          ],
        };
      default:
        return {
          title: currentMeta.title.toUpperCase(),
          titleBn: currentMeta.titleBn,
          docNo: `DOC-${selectedType.slice(0, 3)}-2026-0042`,
          date: today,
          refNo: 'REF-2026-101',
          partyTitle: 'Party Information',
          partyName: 'Standard Commercial Enterprise Ltd.',
          partyCode: 'PRT-100',
          partyAddress: 'Industrial Zone, Dinajpur, Bangladesh',
          partyPhone: '+880 1700-112233',
          items: [
            { sl: 1, name: `${currentMeta.title} Primary Transaction Item`, desc: 'Standard verifiable commercial transaction line', qty: '10,000 KG', rate: '৳45.00', deduction: '৳0', total: '৳450,000' },
          ],
          totalQty: '10,000 KG (250 MON)',
          subtotal: '৳450,000',
          deductions: '৳0',
          grandTotal: '৳450,000',
          inWords: 'Taka Four Lakh Fifty Thousand Only',
          terms: [
            'All transactions strictly governed by Bangladesh Agricultural Trade and Mill Standards.',
            'Official audit copy verified and retained in company cloud records.',
          ],
        };
    }
  };

  const doc = getDocSampleData();

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white text-slate-800">
      {/* Print Controls Header - Hidden during actual print */}
      <div className="print:hidden max-w-6xl mx-auto mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖨️</span>
              <h1 className="text-2xl font-bold text-slate-900">Document Printing Hub (A4)</h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">
                14 Types Ready
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Professional A4 print templates with company branding, authorized signatures, BSTI standards, and Bengali localization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-emerald-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print A4 Document (Ctrl+P)
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Document Grid / Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {filteredDocs.map((item) => (
            <button
              key={item.type}
              onClick={() => setSelectedType(item.type)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all text-xs ${
                selectedType === item.type
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="leading-tight">{item.title}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{item.titleBn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* A4 PRINT CANVAS CONTAINER */}
      <div className="flex justify-center">
        <div
          id="printable-a4-document"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 md:p-14 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 flex flex-col justify-between"
          style={{ boxSizing: 'border-box' }}
        >
          {/* TOP SECTION */}
          <div>
            {/* Header with Logo & Mill Information */}
            <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-5 mb-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
                  🌾
                </div>
                <div>
                  <h2 className="text-xl font-black text-emerald-950 tracking-tight">
                    SONAR BANGLA AUTO RICE MILL LTD.
                  </h2>
                  <p className="text-xs font-semibold text-slate-600">
                    সোনার বাংলা অটো রাইস মিলস লিমিটেড
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Plot #42, Industrial Zone, Dinajpur Sadar, Dinajpur, Bangladesh
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Phone: +880 1711-223344 | Email: billing@sonarbanglaricemill.com
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    BIN: 001293847-0201 (Customs & VAT, Bangladesh)
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1 text-[11px] font-bold text-emerald-900 mb-1">
                  MAIN MILLING UNIT-1
                </div>
                <div className="text-[11px] font-mono text-slate-600">ISO 9001:2015 Certified</div>
                <div className="text-[11px] font-mono text-slate-600">BSTI License: BSTI-DNP-442</div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="bg-slate-900 text-white text-center py-2 px-4 rounded-md mb-6">
              <h3 className="text-base font-bold tracking-wide uppercase">{doc.title}</h3>
              <p className="text-xs text-slate-300 font-medium">{doc.titleBn}</p>
            </div>

            {/* Document Metadata & Party Box */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs mb-6">
              <div className="space-y-1.5">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Document No:</span>
                  <span className="font-bold font-mono text-slate-900">{doc.docNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Date (তারিখ):</span>
                  <span className="font-semibold text-slate-900">{doc.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Reference / PO / SO:</span>
                  <span className="font-mono text-slate-800">{doc.refNo}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-l border-slate-200 pl-4">
                <div className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                  {doc.partyTitle}:
                </div>
                <div className="font-semibold text-slate-900">{doc.partyName}</div>
                <div className="text-slate-600 text-[11px]">{doc.partyAddress}</div>
                <div className="text-slate-500 text-[11px]">Contact: {doc.partyPhone}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">SL</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Item Description / বিবরণ</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">Quantity / পরিমাণ</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">Rate / দর</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">Deductions</th>
                    <th className="py-2.5 px-3 text-right">Net Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {doc.items.map((it) => (
                    <tr key={it.sl} className="border-b border-slate-200">
                      <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono">{it.sl}</td>
                      <td className="py-2.5 px-3 border-r border-slate-300">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        <div className="text-[11px] text-slate-500">{it.desc}</div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-right font-medium">{it.qty}</td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono">{it.rate}</td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-rose-600">{it.deduction}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & In Words */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-7 bg-slate-50 p-3 rounded border border-slate-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Amount In Words (কথায়):</span>
                  <p className="font-medium text-slate-900 italic text-[11px] leading-relaxed">
                    {doc.inWords}
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-slate-400">
                  Total Volume: {doc.totalQty}
                </div>
              </div>

              <div className="col-span-5 text-xs space-y-1.5 border border-slate-200 p-3 rounded bg-slate-50">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono">{doc.subtotal}</span>
                </div>
                {doc.deductions !== '-' && (
                  <div className="flex justify-between text-rose-600">
                    <span>Quality / Surcharge:</span>
                    <span className="font-mono">-{doc.deductions}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-300 pt-1 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-800">{doc.grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="border border-slate-200 rounded p-3 text-[11px] text-slate-600 bg-slate-50/50 mb-8">
              <span className="font-bold text-slate-800 block mb-1 uppercase tracking-wider text-[10px]">
                Terms & Conditions / শর্তাবলী:
              </span>
              <ol className="list-decimal list-inside space-y-0.5">
                {doc.terms.map((t, idx) => (
                  <li key={idx} className="leading-tight">{t}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* BOTTOM SECTION: 3 AUTHORIZED SIGNATURE BLOCKS */}
          <div className="pt-8 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-semibold text-slate-800">
                  Prepared By (প্রস্তুতকারী)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Commercial Accounts</div>
              </div>

              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-semibold text-slate-800">
                  Checked By / Store Incharge
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Warehouse / Quality Control</div>
              </div>

              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-900">
                  Authorized Signatory
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Managing Director / Plant Head</div>
              </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-400 flex justify-between items-center print:text-slate-500">
              <span>Automated ERP Generation: Sonar Bangla Rice Mill System v2.0</span>
              <span>Document ID: {doc.docNo}</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

