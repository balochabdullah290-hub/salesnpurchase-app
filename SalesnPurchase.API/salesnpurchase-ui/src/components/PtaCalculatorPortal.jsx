import React, { useState, useMemo } from 'react';
import {
    Calculator,
    ArrowLeft,
    Smartphone,
    Banknote,
    FileCheck2,
    CheckCircle2
} from 'lucide-react';

const IPHONE_DUTY_PRESETS = {
    'iPhone 11': { basePrice: 85000, passportDuty: 58000, cnicDuty: 74000 },
    'iPhone 12': { basePrice: 115000, passportDuty: 72000, cnicDuty: 92000 },
    'iPhone 13': { basePrice: 155000, passportDuty: 88000, cnicDuty: 114000 },
    'iPhone 13 Pro': { basePrice: 205000, passportDuty: 102000, cnicDuty: 132000 },
    'iPhone 13 Pro Max': { basePrice: 235000, passportDuty: 112000, cnicDuty: 145000 },
    'iPhone 14': { basePrice: 185000, passportDuty: 96000, cnicDuty: 124000 },
    'iPhone 14 Pro': { basePrice: 255000, passportDuty: 108000, cnicDuty: 140000 },
    'iPhone 14 Pro Max': { basePrice: 295000, passportDuty: 115000, cnicDuty: 148000 },
    'iPhone 15': { basePrice: 230000, passportDuty: 102000, cnicDuty: 132000 },
    'iPhone 15 Pro': { basePrice: 290000, passportDuty: 110000, cnicDuty: 142000 },
    'iPhone 15 Pro Max': { basePrice: 320000, passportDuty: 115000, cnicDuty: 148000 },
    'iPhone 16': { basePrice: 265000, passportDuty: 108000, cnicDuty: 138000 },
    'iPhone 16 Pro': { basePrice: 345000, passportDuty: 118000, cnicDuty: 152000 },
    'iPhone 16 Pro Max': { basePrice: 395000, passportDuty: 125000, cnicDuty: 162000 }
};

export default function PtaCalculatorPortal({ onBackToStore }) {
    const [selectedModel, setSelectedModel] = useState('iPhone 15 Pro Max');
    const [basePrice, setBasePrice] = useState(320000);
    const [idType, setIdType] = useState('passport'); // 'passport' | 'cnic'

    const handleModelChange = (e) => {
        const model = e.target.value;
        setSelectedModel(model);
        const preset = IPHONE_DUTY_PRESETS[model];
        if (preset) {
            setBasePrice(preset.basePrice);
        }
    };

    const calculation = useMemo(() => {
        const numericBase = Math.max(0, Number(basePrice) || 0);
        const preset = IPHONE_DUTY_PRESETS[selectedModel];

        let duty = 0;
        if (preset && numericBase === preset.basePrice) {
            duty = idType === 'passport' ? preset.passportDuty : preset.cnicDuty;
        } else {
            const rate = idType === 'passport' ? 0.36 : 0.46;
            duty = Math.round((numericBase * rate) / 500) * 500;
        }

        const totalCost = numericBase + duty;
        return { duty, totalCost };
    }, [selectedModel, basePrice, idType]);

    const idLabel = idType === 'passport' ? 'PASSPORT' : 'CNIC';

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#141210]/10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <Calculator className="w-3.5 h-3.5" />
                            <span>FBR Verification Tool</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Live PTA Tax &amp; <span className="font-display italic text-[#B4562F]">Duty Portal.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            Calculate accurate government registration duties and estimated total costs for any iPhone model.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onBackToStore}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-[#E9E3DB] text-[#141210] border border-[#141210]/12 transition cursor-pointer self-start sm:self-auto"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#B4562F]" />
                        <span>Back to Store</span>
                    </button>
                </div>

                {/* Main Calculator Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] p-6 sm:p-8 space-y-6">
                    {/* Input Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B] flex items-center gap-1.5 mb-2">
                                <Smartphone className="w-3.5 h-3.5 text-[#B4562F]" />
                                <span>Select iPhone Model</span>
                            </label>
                            <select
                                value={selectedModel}
                                onChange={handleModelChange}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] cursor-pointer transition"
                            >
                                {Object.keys(IPHONE_DUTY_PRESETS).map((modelName) => (
                                    <option key={modelName} value={modelName}>
                                        {modelName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B] flex items-center gap-1.5 mb-2">
                                <Banknote className="w-3.5 h-3.5 text-[#22423A]" />
                                <span>Estimated Base Price (PKR)</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] num-tabular transition"
                            />
                        </div>

                        <div>
                            <label className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B] flex items-center gap-1.5 mb-2">
                                <FileCheck2 className="w-3.5 h-3.5 text-[#B4562F]" />
                                <span>Registration ID Type</span>
                            </label>
                            <select
                                value={idType}
                                onChange={(e) => setIdType(e.target.value)}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] cursor-pointer transition"
                            >
                                <option value="passport">Passport (Lower Duty)</option>
                                <option value="cnic">CNIC (Standard Duty)</option>
                            </select>
                        </div>
                    </div>

                    {/* Result Summary Banner */}
                    <div className="bg-[#F7F5F2] border border-[#141210]/10 rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B] block">
                                Estimated PTA Duty for {selectedModel.toUpperCase()} via {idLabel}
                            </span>
                            <div className="text-2xl sm:text-3xl font-semibold text-[#B4562F] num-tabular">
                                PKR {calculation.duty.toLocaleString()}
                            </div>
                        </div>

                        <div className="hidden sm:block h-12 w-[1px] bg-[#141210]/12" />

                        <div className="space-y-1 sm:text-right">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B] block">
                                Total Estimated Cost (Device + PTA)
                            </span>
                            <div className="text-2xl sm:text-3xl font-semibold text-[#22423A] num-tabular">
                                PKR {calculation.totalCost.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Passport vs CNIC Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="bg-[#F7F5F2] border border-[#141210]/8 rounded-[20px] p-4 sm:p-5 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-[#22423A] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#2A2622] leading-relaxed">
                                <strong className="text-[#141210]">Passport Registration:</strong> Offers discounted government tax rates for overseas travelers returning to Pakistan within 30 days of arrival.
                            </p>
                        </div>

                        <div className="bg-[#F7F5F2] border border-[#141210]/8 rounded-[20px] p-4 sm:p-5 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-[#B4562F] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#2A2622] leading-relaxed">
                                <strong className="text-[#141210]">CNIC Registration:</strong> Standard local registration pathway through FBR DIRBS tax portal using your national identity card.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}