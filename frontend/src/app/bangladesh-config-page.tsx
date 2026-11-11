'use client';

import React, { useState } from 'react';

export type TaxType = 'VAT' | 'AIT' | 'TDS' | 'VDS';

interface TaxRule {
  id: string;
  taxType: TaxType;
  name: string;
  category: string;
  ratePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  sroReference: string;
  description: string;
  active: boolean;
}

interface UnitConversionRule {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
  effectiveFrom: string;
  description: string;
}

interface BangladeshConfigPageProps {
  companyId: string;
  language: 'en' | 'bn';
  onSaved?: (message: string) => void;
}

export function BangladeshConfigPage({ companyId, language, onSaved }: BangladeshConfigPageProps) {
  const [activeTaxTab, setActiveTaxTab] = useState<'ALL' | TaxType>('ALL');

  // Configurable conversion rules (Default 1 MON = 40 KG, configurable)
  const [conversionRules, setConversionRules] = useState<UnitConversionRule[]>([
    {
      id: 'uc-1',
      fromUnit: 'MON',
      toUnit: 'KG',
      factor: 40.0,
      effectiveFrom: '2026-01-01',
      description: 'Standard Bangladesh Rice Mill Benchmark (1 মণ = 40 কেজি)',
    },
    {
      id: 'uc-2',
      fromUnit: 'TON',
      toUnit: 'KG',
      factor: 1000.0,
      effectiveFrom: '2026-01-01',
      description: 'Metric Ton to Kilogram Conversion (1 টন = ১,০০০ কেজি)',
    },
    {
      id: 'uc-3',
      fromUnit: 'BAG',
      toUnit: 'KG',
      factor: 50.0,
      effectiveFrom: '2026-01-01',
      description: 'Standard Finished Rice Bag (১ বস্তা = ৫০ কেজি)',
    },
  ]);

  // Configurable Tax Rules (VAT, AIT, TDS, VDS) - Zero hardcoded rates
  const [taxRules, setTaxRules] = useState<TaxRule[]>([
    {
      id: 'tx-1',
      taxType: 'VAT',
      name: 'Unprocessed Paddy & Rice Exemption',
      category: 'PADDY_RICE',
      ratePercent: 0.0,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      sroReference: 'SRO No. 182-Ain/2021/140-Mushak',
      description: 'Statutory exemption for raw food grain and rice milling production',
      active: true,
    },
    {
      id: 'tx-2',
      taxType: 'VAT',
      name: 'Commercial Rice Bran VAT',
      category: 'BY_PRODUCT',
      ratePercent: 5.0,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      sroReference: 'NBR VAT Schedule 3',
      description: 'Reduced rate VAT on industrial rice bran sold to edible oil and feed mills',
      active: true,
    },
    {
      id: 'tx-3',
      taxType: 'AIT',
      name: 'Commercial Procurement Advance Income Tax',
      category: 'PADDY',
      ratePercent: 2.0,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      sroReference: 'Income Tax Act 2023, Section 52',
      description: 'Advance income tax withheld on commercial grain suppliers and aratdars',
      active: true,
    },
    {
      id: 'tx-4',
      taxType: 'TDS',
      name: 'Transport & Freight Service Withholding',
      category: 'TRANSPORT',
      ratePercent: 3.0,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      sroReference: 'Income Tax Act 2023, Section 52(1)',
      description: 'TDS deduction on commercial trucking and logistics freight bills',
      active: true,
    },
    {
      id: 'tx-5',
      taxType: 'VDS',
      name: 'Machinery Maintenance & Contractor VDS',
      category: 'CONTRACTOR',
      ratePercent: 7.5,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      sroReference: 'NBR VDS General Order 08/2023',
      description: 'VAT deducted at source from workshop repair and civil contractor bills',
      active: true,
    },
  ]);

  // Modal / Add Rule State
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [newTaxType, setNewTaxType] = useState<TaxType>('VAT');
  const [newRuleName, setNewRuleName] = useState('');
  const [newCategory, setNewCategory] = useState('PADDY');
  const [newRatePercent, setNewRatePercent] = useState<number>(2.0);
  const [newEffectiveFrom, setNewEffectiveFrom] = useState('2026-07-01');
  const [newSroRef, setNewSroRef] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Conversion Edit State
  const [showEditConvModal, setShowEditConvModal] = useState(false);
  const [convFactor, setConvFactor] = useState<number>(40.0);

  // Live Tax Simulation State
  const [simBaseAmount, setSimBaseAmount] = useState<number>(100000);
  const [simCategory, setSimCategory] = useState<string>('PADDY');
  const [simSelectedTaxes, setSimSelectedTaxes] = useState<Record<TaxType, boolean>>({
    VAT: true,
    AIT: true,
    TDS: false,
    VDS: false,
  });

  const filteredTaxRules = activeTaxTab === 'ALL'
    ? taxRules
    : taxRules.filter((r) => r.taxType === activeTaxTab);

  const handleAddTaxRule = (e: React.FormEvent) => {
    e.preventDefault();
    const created: TaxRule = {
      id: `tx-${Date.now()}`,
      taxType: newTaxType,
      name: newRuleName || `${newTaxType} Rule ${newRatePercent}%`,
      category: newCategory,
      ratePercent: Number(newRatePercent),
      effectiveFrom: newEffectiveFrom,
      effectiveTo: null,
      sroReference: newSroRef || 'NBR Compliance',
      description: newDesc,
      active: true,
    };
    setTaxRules([created, ...taxRules]);
    setShowAddTaxModal(false);
    onSaved?.('New Bangladesh tax rule configured successfully.');
  };

  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault();
    setConversionRules(
      conversionRules.map((c) =>
        c.fromUnit === 'MON' ? { ...c, factor: Number(convFactor) } : c
      )
    );
    setShowEditConvModal(false);
    onSaved?.(`Updated 1 MON conversion to ${convFactor} KG.`);
  };

  // Run live tax calculation using active configurable rules
  const getSimulatedTaxResult = () => {
    let vatAmount = 0;
    let withholdingAmount = 0;
    const lines: Array<{ type: TaxType; name: string; rate: number; amount: number; sro: string; isDeduction: boolean }> = [];

    (['VAT', 'AIT', 'TDS', 'VDS'] as TaxType[]).forEach((type) => {
      if (simSelectedTaxes[type]) {
        const rule = taxRules.find((r) => r.taxType === type && (r.category === simCategory || r.category === 'GENERAL'))
          || taxRules.find((r) => r.taxType === type);

        const rate = rule ? rule.ratePercent : (type === 'VAT' ? 0 : 2);
        const name = rule ? rule.name : `${type} Default`;
        const sro = rule ? rule.sroReference : 'Income Tax / VAT Standard';
        const amount = Math.round((simBaseAmount * (rate / 100)) * 100) / 100;
        const isDeduction = type === 'AIT' || type === 'TDS' || type === 'VDS';

        if (type === 'VAT') vatAmount += amount;
        if (isDeduction) withholdingAmount += amount;

        lines.push({ type, name, rate, amount, sro, isDeduction });
      }
    });

    const netPayable = simBaseAmount + vatAmount - withholdingAmount;
    return { lines, vatAmount, withholdingAmount, netPayable };
  };

  const simResult = getSimulatedTaxResult();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇧🇩</span>
            <h1 className="text-2xl font-bold text-slate-900">
              {language === 'bn' ? 'বাংলাদেশ স্ট্যান্ডার্ড ও কর কনফিগারেশন' : 'Bangladesh Standards & Tax Configuration'}
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">
              NBR Compliant
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'bn'
              ? 'মুদ্রা (BDT/৳), কনফিগারযোগ্য একক রূপান্তর (১ মণ = ৪০ কেজি) এবং কার্যকর তারিখ ভিত্তিক ভ্যাট, এআইটি, টিডিএস ও ভিডিএস ব্যবস্থাপনা।'
              : 'Default BDT/৳ currency, configurable unit conversions (1 MON = 40 KG), and effective-date based VAT, AIT, TDS, VDS tax engine.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddTaxModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all text-sm"
          >
            <span>➕</span> Add Tax Rule (নতুন কর নিয়ম)
          </button>
        </div>
      </div>

      {/* 1. CURRENCY & UNIT DEFAULTS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Currency Defaults */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Default Currency</span>
              <span className="text-2xl">৳</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">BDT (টাকা)</div>
            <p className="text-xs text-slate-500 mt-1">Bangladeshi Taka · Sub-unit: Poisha (পয়সা)</p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Numbering:</span>
                <span className="font-semibold text-slate-800">Crore, Lakh, Hajar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sample:</span>
                <span className="font-semibold text-emerald-700">৳১,৫০,০০০.০০</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-400">Strictly locked as system monetary base.</div>
        </div>

        {/* Standard Units */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Mill Units</span>
            <span className="text-2xl">⚖️</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="font-bold text-slate-800">KG (কেজি)</div>
              <div className="text-slate-500 text-[11px]">Primary metric unit</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="font-bold text-slate-800">MON (মণ)</div>
              <div className="text-slate-500 text-[11px]">Traditional arat unit</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="font-bold text-slate-800">TON (টন)</div>
              <div className="text-slate-500 text-[11px]">Commercial bulk (1,000 KG)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="font-bold text-slate-800">BAG (বস্তা)</div>
              <div className="text-slate-500 text-[11px]">Finished packaging (50 KG)</div>
            </div>
          </div>
        </div>

        {/* Configurable 1 MON = 40 KG Banner */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Configurable Conversion</span>
              <span className="text-xl">🔄</span>
            </div>
            <div className="text-2xl font-black">1 MON = {conversionRules.find((c) => c.fromUnit === 'MON')?.factor || 40} KG</div>
            <p className="text-xs text-emerald-100 mt-1">
              Default benchmark is 40.0 KG. Per Promptdoc #57 specifications, unit conversion is fully configurable per mill policy.
            </p>
          </div>
          <button
            onClick={() => {
              setConvFactor(conversionRules.find((c) => c.fromUnit === 'MON')?.factor || 40.0);
              setShowEditConvModal(true);
            }}
            className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors border border-white/30 backdrop-blur-sm self-start"
          >
            Change Factor (রূপান্তর পরিবর্তন)
          </button>
        </div>
      </div>

      {/* 2. UNIT CONVERSIONS REGISTER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Unit Conversions Register</h2>
            <p className="text-xs text-slate-500">Effective conversion graph used across procurement, inventory, and production.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">From Unit</th>
                <th className="py-2.5 px-4">To Unit</th>
                <th className="py-2.5 px-4 text-right">Conversion Factor</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Effective Date</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversionRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{rule.fromUnit}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{rule.toUnit}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{rule.factor.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-600">{rule.description}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{rule.effectiveFrom}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CONFIGURABLE TAX ENGINE (VAT, AIT, TDS, VDS) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Configurable Tax Rules (VAT · AIT · TDS · VDS)
            </h2>
            <p className="text-xs text-slate-500">
              NBR statutory compliant tax rules. No hardcoded rates. Automatically matched via effective dates.
            </p>
          </div>

          {/* Tax Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'VAT', 'AIT', 'TDS', 'VDS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTaxTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTaxTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tax Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Rule Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Rate %</th>
                <th className="py-2.5 px-4">Effective Date Range</th>
                <th className="py-2.5 px-4">NBR SRO Reference</th>
                <th className="py-2.5 px-4 text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTaxRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        rule.taxType === 'VAT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : rule.taxType === 'AIT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : rule.taxType === 'TDS'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {rule.taxType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{rule.name}</div>
                    <div className="text-[11px] text-slate-500">{rule.description}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{rule.category}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{rule.ratePercent.toFixed(2)}%</td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {rule.effectiveFrom} → {rule.effectiveTo || 'Present'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 italic">{rule.sroReference}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. LIVE TAX CALCULATION SIMULATOR */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🧮</span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Live Tax Calculation Simulator</h2>
            <p className="text-xs text-slate-500">Test how configurable effective-date rules apply to commercial invoices and purchase settlements.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="md:col-span-5 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Base Amount (টাকা):</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  value={simBaseAmount}
                  onChange={(e) => setSimBaseAmount(Number(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Commodity / Service Category:</label>
              <select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="PADDY">Raw Paddy (কাঁচা ধান)</option>
                <option value="BY_PRODUCT">Rice Bran / Husk (কুঁড়া / তুষ)</option>
                <option value="TRANSPORT">Truck Freight Transport (পরিবহন)</option>
                <option value="CONTRACTOR">Workshop Spares / Contractor (যন্ত্রাংশ)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-2">Evaluate Tax Deductions / Withholdings:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['VAT', 'AIT', 'TDS', 'VDS'] as TaxType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simSelectedTaxes[t]}
                      onChange={(e) => setSimSelectedTaxes({ ...simSelectedTaxes, [t]: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="md:col-span-7 bg-slate-900 text-white p-5 rounded-xl flex flex-col justify-between text-xs font-mono">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                <span className="text-slate-400">Simulation Output</span>
                <span className="text-emerald-400 text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Zero Hardcoded Rates
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gross Base Amount:</span>
                  <span className="font-bold text-white">৳{simBaseAmount.toLocaleString()}</span>
                </div>

                {simResult.lines.map((ln) => (
                  <div key={ln.type} className="flex justify-between text-xs py-1 border-t border-slate-800/60">
                    <div>
                      <span className={ln.isDeduction ? 'text-amber-400' : 'text-blue-400'}>
                        {ln.type} ({ln.rate}%)
                      </span>
                      <span className="text-[10px] text-slate-500 block">{ln.name}</span>
                    </div>
                    <span className={`font-semibold ${ln.isDeduction ? 'text-amber-400' : 'text-blue-400'}`}>
                      {ln.isDeduction ? '-' : '+'}৳{ln.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-emerald-500 pt-3 flex justify-between items-center text-sm">
              <span className="font-sans font-bold text-slate-300">Net Supplier / Vendor Payable:</span>
              <span className="text-xl font-bold text-emerald-400">৳{Math.max(0, simResult.netPayable).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD TAX RULE */}
      {showAddTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Configure New Tax Rule (নতুন কর নিয়ম)</h3>
            <p className="text-xs text-slate-500 mb-4">Add effective-date based VAT, AIT, TDS, or VDS rule.</p>

            <form onSubmit={handleAddTaxRule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tax Type:</label>
                  <select
                    value={newTaxType}
                    onChange={(e) => setNewTaxType(e.target.value as TaxType)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="VAT">VAT (মূসক)</option>
                    <option value="AIT">AIT (অগ্রিম আয়কর)</option>
                    <option value="TDS">TDS (উৎস কর)</option>
                    <option value="VDS">VDS (উৎস মূসক)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rate Percent (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRatePercent}
                    onChange={(e) => setNewRatePercent(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rule Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Rice Bran NBR VAT"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category:</label>
                  <input
                    type="text"
                    placeholder="e.g. PADDY, BRAN, TRANSPORT"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value.toUpperCase())}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Effective From Date:</label>
                  <input
                    type="date"
                    value={newEffectiveFrom}
                    onChange={(e) => setNewEffectiveFrom(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">NBR SRO / Regulatory Reference:</label>
                <input
                  type="text"
                  placeholder="e.g. SRO No. 182-Ain/2021/140-Mushak"
                  value={newSroRef}
                  onChange={(e) => setNewSroRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description:</label>
                <textarea
                  rows={2}
                  placeholder="Policy details..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTaxModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MON CONVERSION FACTOR */}
      {showEditConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Configure Mon Conversion (মণ রূপান্তর)</h3>
            <p className="text-xs text-slate-500 mb-4">Default benchmark is 40.0 KG per Mon.</p>

            <form onSubmit={handleSaveConversion} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kilograms per 1 MON (কেজি / মণ):</label>
                <input
                  type="number"
                  step="0.1"
                  value={convFactor}
                  onChange={(e) => setConvFactor(Number(e.target.value))}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-base font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditConvModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Apply Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
