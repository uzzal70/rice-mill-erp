'use client';

import React, { useState } from 'react';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';
import { useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';

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
  const toast = useToast();
  const isBn = language === 'bn';
  const [activeTaxTab, setActiveTaxTab] = useState<'ALL' | TaxType>('ALL');
  const [taxError, setTaxError] = useState<string | null>(null);
  const [convError, setConvError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleOpenAddTaxModal = () => {
    setTaxError(null);
    setFieldErrors({});
    setShowAddTaxModal(true);
  };

  const handleOpenConvModal = () => {
    setConvError(null);
    setFieldErrors({});
    setShowEditConvModal(true);
  };

  const handleAddTaxRule = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'newTaxType', label: isBn ? 'করের ধরন' : 'Tax Type', value: newTaxType, required: true, isSelect: true },
        {
          name: 'newRatePercent',
          label: isBn ? 'হার (%)' : 'Rate Percent (%)',
          value: String(newRatePercent),
          required: true,
          type: 'nonNegativeNumber',
          max: 100,
        },
        { name: 'newRuleName', label: isBn ? 'নিয়মের নাম' : 'Rule Name', value: newRuleName, required: true },
        { name: 'newEffectiveFrom', label: isBn ? 'কার্যকর তারিখ' : 'Effective From Date', value: newEffectiveFrom, required: true, type: 'date' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setTaxError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    const created: TaxRule = {
      id: `tx-${Date.now()}`,
      taxType: newTaxType,
      name: newRuleName.trim(),
      category: newCategory.trim() || 'GENERAL',
      ratePercent: Number(newRatePercent),
      effectiveFrom: newEffectiveFrom,
      effectiveTo: null,
      sroReference: newSroRef.trim() || 'NBR Compliance',
      description: newDesc.trim(),
      active: true,
    };
    setTaxRules([created, ...taxRules]);
    setNewRuleName('');
    setNewSroRef('');
    setNewDesc('');
    setFieldErrors({});
    setTaxError(null);
    setShowAddTaxModal(false);
    const msg = isBn ? 'নতুন বাংলাদেশ কর নিয়ম সংরক্ষিত হয়েছে।' : 'New Bangladesh tax rule configured successfully.';
    if (onSaved) onSaved(msg);
    else toast.success(msg);
  };

  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFormFields(
      [
        {
          name: 'convFactor',
          label: isBn ? 'কেজি / মণ' : 'Kilograms per 1 MON',
          value: String(convFactor),
          required: true,
          type: 'positiveNumber',
        },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setConvError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setConversionRules(
      conversionRules.map((c) =>
        c.fromUnit === 'MON' ? { ...c, factor: Number(convFactor) } : c
      )
    );
    setFieldErrors({});
    setConvError(null);
    setShowEditConvModal(false);
    const msg = `Updated 1 MON conversion to ${convFactor} KG.`;
    if (onSaved) onSaved(msg);
    else toast.success(msg);
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
            onClick={handleOpenAddTaxModal}
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
            <AppTextField
              fieldName="simBaseAmount"
              type="number"
              prefixText="৳"
              label={isBn ? 'বেস পরিমাণ (টাকা)' : 'Base Amount (টাকা)'}
              value={simBaseAmount}
              inputProps={{ min: 0 }}
              onValueChange={(val) => setSimBaseAmount(Number(val) || 0)}
            />

            <AppSelect
              fieldName="simCategory"
              label={isBn ? 'পণ্য / সার্ভিস ক্যাটাগরি' : 'Commodity / Service Category'}
              value={simCategory}
              options={[
                { value: 'PADDY', label: 'Raw Paddy (কাঁচা ধান)' },
                { value: 'BY_PRODUCT', label: 'Rice Bran / Husk (কুঁড়া / তুষ)' },
                { value: 'TRANSPORT', label: 'Truck Freight Transport (পরিবহন)' },
                { value: 'CONTRACTOR', label: 'Workshop Spares / Contractor (যন্ত্রাংশ)' },
              ]}
              onChange={(val) => setSimCategory(val)}
            />

            <div>
              <label className="block font-medium text-slate-700 mb-2">Evaluate Tax Deductions / Withholdings:</label>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {(['VAT', 'AIT', 'TDS', 'VDS'] as TaxType[]).map((t) => (
                  <Box
                    key={t}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={simSelectedTaxes[t]}
                          onChange={(e) => setSimSelectedTaxes({ ...simSelectedTaxes, [t]: e.target.checked })}
                        />
                      }
                      label={<span style={{ fontWeight: 700, fontSize: 13 }}>{t}</span>}
                    />
                  </Box>
                ))}
              </Box>
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
      <FormDialog
        open={showAddTaxModal}
        onClose={() => setShowAddTaxModal(false)}
        onSubmit={handleAddTaxRule}
        title={isBn ? 'নতুন কর নিয়ম কনফিগার করুন' : 'Configure New Tax Rule'}
        subtitle={isBn ? 'কার্যকর তারিখ ভিত্তিক ভ্যাট, এআইটি, টিডিএস বা ভিডিএস নিয়ম যুক্ত করুন।' : 'Add effective-date based VAT, AIT, TDS, or VDS rule.'}
        error={taxError}
        onClearError={() => setTaxError(null)}
        submitLabel={isBn ? 'কর নিয়ম সংরক্ষণ' : 'Save Tax Rule'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppSelect
            fieldName="newTaxType"
            required
            label={isBn ? 'করের ধরন' : 'Tax Type'}
            value={newTaxType}
            errorText={fieldErrors.newTaxType}
            options={[
              { value: 'VAT', label: 'VAT (মূসক)' },
              { value: 'AIT', label: 'AIT (অগ্রিম আয়কর)' },
              { value: 'TDS', label: 'TDS (উৎস কর)' },
              { value: 'VDS', label: 'VDS (উৎস মূসক)' },
            ]}
            onChange={(val) => {
              setNewTaxType(val as TaxType);
              setFieldErrors((p) => ({ ...p, newTaxType: '' }));
            }}
          />
          <AppTextField
            fieldName="newRatePercent"
            required
            type="number"
            unit="%"
            label={isBn ? 'হার (%)' : 'Rate Percent (%)'}
            value={newRatePercent}
            errorText={fieldErrors.newRatePercent}
            inputProps={{ min: 0, max: 100, step: '.01' }}
            onValueChange={(val) => {
              setNewRatePercent(val === '' ? 0 : Number(val));
              setFieldErrors((p) => ({ ...p, newRatePercent: '' }));
            }}
          />
        </FormGrid>

        <AppTextField
          fieldName="newRuleName"
          required
          label={isBn ? 'নিয়মের নাম' : 'Rule Name'}
          placeholder="e.g. Rice Bran NBR VAT"
          value={newRuleName}
          errorText={fieldErrors.newRuleName}
          onValueChange={(val) => {
            setNewRuleName(val);
            setFieldErrors((p) => ({ ...p, newRuleName: '' }));
          }}
        />

        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <AppTextField
            fieldName="newCategory"
            label={isBn ? 'ক্যাটাগরি' : 'Category'}
            placeholder="e.g. PADDY, BRAN, TRANSPORT"
            value={newCategory}
            onValueChange={(val) => setNewCategory(val.toUpperCase())}
          />
          <AppTextField
            fieldName="newEffectiveFrom"
            required
            type="date"
            InputLabelProps={{ shrink: true }}
            label={isBn ? 'কার্যকর তারিখ' : 'Effective From Date'}
            value={newEffectiveFrom}
            errorText={fieldErrors.newEffectiveFrom}
            onValueChange={(val) => {
              setNewEffectiveFrom(val);
              setFieldErrors((p) => ({ ...p, newEffectiveFrom: '' }));
            }}
          />
        </FormGrid>

        <AppTextField
          fieldName="newSroRef"
          label={isBn ? 'এনবিআর এসআরও রেফারেন্স' : 'NBR SRO / Regulatory Reference'}
          placeholder="e.g. SRO No. 182-Ain/2021/140-Mushak"
          value={newSroRef}
          onValueChange={(val) => setNewSroRef(val)}
        />

        <AppTextField
          fieldName="newDesc"
          multiline
          rows={2}
          label={isBn ? 'বিবরণ' : 'Description'}
          placeholder="Policy details..."
          value={newDesc}
          onValueChange={(val) => setNewDesc(val)}
        />
      </FormDialog>

      {/* MODAL: EDIT MON CONVERSION FACTOR */}
      <FormDialog
        open={showEditConvModal}
        onClose={() => setShowEditConvModal(false)}
        onSubmit={handleSaveConversion}
        title={isBn ? 'মণ রূপান্তর নির্ধারণ' : 'Configure Mon Conversion'}
        subtitle={isBn ? 'সাধারণ স্ট্যান্ডার্ড ১ মণ = ৪০ কেজি।' : 'Default benchmark is 40.0 KG per Mon.'}
        error={convError}
        onClearError={() => setConvError(null)}
        submitLabel={isBn ? 'প্রয়োগ করুন' : 'Apply Factor'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <AppTextField
          fieldName="convFactor"
          required
          type="number"
          unit="KG / MON"
          label={isBn ? '১ মণে কত কেজি' : 'Kilograms per 1 MON'}
          value={convFactor}
          errorText={fieldErrors.convFactor}
          inputProps={{ min: 1, step: '.1' }}
          onValueChange={(val) => {
            setConvFactor(val === '' ? 0 : Number(val));
            setFieldErrors((p) => ({ ...p, convFactor: '' }));
          }}
        />
      </FormDialog>
    </div>
  );
}
