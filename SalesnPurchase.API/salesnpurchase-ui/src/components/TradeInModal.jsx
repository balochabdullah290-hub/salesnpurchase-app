import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
    X,
    Smartphone,
    CheckCircle,
    Upload,
    Loader2,
    Sparkles,
    Tag,
    MessageCircle,
    Mail,
    Trash2,
    HelpCircle,
    Info,
    ChevronRight,
    ChevronLeft,
    Check,
    Shield,
    Battery
} from 'lucide-react';

const STORE_WHATSAPP_NUMBER = '923000000000';

const DEFAULT_CONFIG = {
    'iPhone 11': { basePrice: 95000, storages: ['64GB', '128GB', '256GB'] },
    'iPhone 11 Pro Max': { basePrice: 125000, storages: ['64GB', '256GB', '512GB'] },
    'iPhone 12': { basePrice: 120000, storages: ['64GB', '128GB', '256GB'] },
    'iPhone 12 Pro Max': { basePrice: 165000, storages: ['128GB', '256GB', '512GB'] },
    'iPhone 13': { basePrice: 155000, storages: ['128GB', '256GB', '512GB'] },
    'iPhone 13 Pro': { basePrice: 205000, storages: ['128GB', '256GB', '512GB', '1TB'] },
    'iPhone 13 Pro Max': { basePrice: 235000, storages: ['128GB', '256GB', '512GB', '1TB'] },
    'iPhone 14': { basePrice: 185000, storages: ['128GB', '256GB', '512GB'] },
    'iPhone 14 Pro': { basePrice: 255000, storages: ['128GB', '256GB', '512GB', '1TB'] },
    'iPhone 14 Pro Max': { basePrice: 295000, storages: ['128GB', '256GB', '512GB', '1TB'] },
    'iPhone 15': { basePrice: 230000, storages: ['128GB', '256GB', '512GB'] },
    'iPhone 15 Pro': { basePrice: 320000, storages: ['128GB', '256GB', '512GB', '1TB'] },
    'iPhone 15 Pro Max': { basePrice: 380000, storages: ['256GB', '512GB', '1TB'] },
    'iPhone 16 Pro Max': { basePrice: 450000, storages: ['256GB', '512GB', '1TB'] },
};

const STEPS = [
    { id: 1, name: 'Device Details' },
    { id: 2, name: 'Condition & Specs' },
    { id: 3, name: 'Contact & Upload' },
];

export default function TradeInWizard({ onClose }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [pricingConfig, setPricingConfig] = useState(DEFAULT_CONFIG);
    const [formData, setFormData] = useState({
        model: 'iPhone 11',
        storage: '64GB',
        ptaStatus: 'Non-PTA',
        batteryHealth: '85',
        condition: 'Like New (10/10)',
        hasBox: false,
        customerName: '',
        customerPhone: '',
        customerEmail: ''
    });

    const [estimate, setEstimate] = useState({ min: 35000, max: 40000 });
    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [showPtaTooltip, setShowPtaTooltip] = useState(false);

    // Fetch dynamic pricing configuration on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await axiosInstance.get('/TradeIns/config');
                if (response.data && Object.keys(response.data).length > 0) {
                    setPricingConfig(response.data);
                }
            } catch (err) {
                console.warn('Using local fallback pricing configuration.');
            }
        };
        fetchConfig();
    }, []);

    // Get current available storage capacities for the selected model
    const currentModelConfig = pricingConfig[formData.model] || { basePrice: 150000, storages: ['128GB', '256GB', '512GB'] };
    const availableStorages = currentModelConfig.storages || ['128GB', '256GB', '512GB'];

    // Auto-adjust storage selection if current selection isn't supported by selected model
    useEffect(() => {
        if (!availableStorages.includes(formData.storage)) {
            setFormData((prev) => ({ ...prev, storage: availableStorages[0] }));
        }
    }, [formData.model, availableStorages, formData.storage]);

    // Auto-calculate trade-in valuation
    const calculateEstimate = useCallback(() => {
        let base = currentModelConfig.basePrice || 150000;
        const isBigModel = formData.model.includes('Pro') || formData.model.includes('Max');

        // Storage adjustments
        if (formData.storage === '256GB') base += 15000;
        else if (formData.storage === '512GB') base += 30000;
        else if (formData.storage === '1TB') base += 50000;

        // PTA Status Multipliers
        if (formData.ptaStatus === 'Non-PTA' || formData.ptaStatus === 'JV') {
            base *= 0.65;
        } else if (formData.ptaStatus === 'E-SIM Approved') {
            base *= 0.85;
        }

        // Condition Multipliers
        if (formData.condition === 'Like New (10/10)') base *= 1.00;
        else if (formData.condition === 'Minor Scratches') base *= 0.92;
        else if (formData.condition === 'Dented / Scratched') base *= 0.82;
        else if (formData.condition === 'Cracked Screen / Back') base *= 0.60;

        // Battery Health Adjustments
        const battery = Number(formData.batteryHealth) || 80;
        if (battery < 80) base -= 12000;
        else if (battery >= 90) base += 4000;

        // Original Box Bonus
        if (formData.hasBox) base += 4000;

        // 20% Business Profit Margin Reserve (80% buyback rate)
        const BUSINESS_BUYBACK_RATE = 0.80;
        let buybackBase = Math.max(base * BUSINESS_BUYBACK_RATE, 10000);

        // JV Specific Deductions
        if (formData.ptaStatus === 'JV') {
            const jvDeduction = isBigModel ? 15000 : 5500;
            buybackBase = Math.max(buybackBase - jvDeduction, 10000);
        }

        const calculatedMin = Math.round((buybackBase * 0.92) / 1000) * 1000;
        const calculatedMax = Math.round((buybackBase * 0.98) / 1000) * 1000;

        setEstimate({ min: calculatedMin, max: calculatedMax });
    }, [formData.model, formData.storage, formData.ptaStatus, formData.batteryHealth, formData.condition, formData.hasBox, currentModelConfig]);

    useEffect(() => {
        calculateEstimate();
    }, [calculateEstimate]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setPhotos((prev) => [...prev, ...filesArray]);

            const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
            setPhotoPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index) => {
        URL.revokeObjectURL(photoPreviews[index]);
        setPhotos((prev) => prev.filter((_, i) => i !== index));
        setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const validatePhone = (phone) => {
        const cleanPhone = phone.replace(/[\s-]/g, '');
        return /^03\d{9}$/.test(cleanPhone) || /^\+923\d{9}$/.test(cleanPhone);
    };

    const handleNextStep = () => {
        setError('');
        if (currentStep === 2) {
            const battery = Number(formData.batteryHealth);
            if (isNaN(battery) || battery < 50 || battery > 100) {
                setError('Please enter a valid battery health percentage between 50% and 100%.');
                return;
            }
        }
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const handlePrevStep = () => {
        setError('');
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customerName.trim()) {
            setError('Please enter your full name.');
            return;
        }

        if (!validatePhone(formData.customerPhone)) {
            setError('Please enter a valid Pakistani WhatsApp phone number (e.g., 03001234567).');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const data = new FormData();
            data.append('Model', formData.model);
            data.append('Storage', formData.storage);
            data.append('PtaStatus', formData.ptaStatus);
            data.append('BatteryHealth', formData.batteryHealth);
            data.append('Condition', formData.condition);
            data.append('HasBox', formData.hasBox);
            data.append('EstimatedMinPKR', estimate.min);
            data.append('EstimatedMaxPKR', estimate.max);
            data.append('CustomerName', formData.customerName);
            data.append('CustomerPhone', formData.customerPhone);
            data.append('CustomerEmail', formData.customerEmail || '');

            if (photos.length > 0) {
                photos.forEach((file) => {
                    data.append('Photos', file);
                });
            }

            await axiosInstance.post('/TradeIns', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSubmitted(true);
        } catch (err) {
            console.error('Submission failed:', err);
            setError(err.response?.data?.message || 'Failed to submit trade-in request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getWhatsAppLink = () => {
        const emailInfo = formData.customerEmail ? `\n✉️ *Email:* ${formData.customerEmail}` : '';
        const message =
            `Hello SalesnPurchase! I just submitted a device trade-in request on your website.

📱 *Device Model:* ${formData.model} (${formData.storage})
⚡ *PTA Status:* ${formData.ptaStatus}
🔋 *Battery Health:* ${formData.batteryHealth}%
✨ *Condition:* ${formData.condition}
📦 *Box Available:* ${formData.hasBox ? 'Yes' : 'No'}
💰 *Estimated Valuation:* PKR ${estimate.min.toLocaleString()} - PKR ${estimate.max.toLocaleString()}

👤 *Name:* ${formData.customerName}
📞 *Phone:* ${formData.customerPhone}${emailInfo}

Note: I understand this is an estimated valuation and the final offer rate will be provided after physical inspection.`;

        return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white border border-[#141210]/10 w-full max-w-lg rounded-[26px] p-6 sm:p-7 relative shadow-2xl text-[#141210] max-h-[90vh] overflow-y-auto flex flex-col justify-between">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    type="button"
                    className="absolute top-4 right-4 text-[#2A2622] hover:text-[#141210] p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] transition z-10 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {submitted ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-[#22423A]/12 text-[#22423A] flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-semibold tracking-[-0.025em] text-[#141210]">
                            Request <span className="font-display italic text-[#B4562F]">Submitted!</span>
                        </h3>

                        <p className="text-[#2A2622] text-xs max-w-sm mx-auto leading-relaxed">
                            Your trade-in details have been saved. Instant estimated buyback range:{' '}
                            <span className="text-[#B4562F] font-semibold num-tabular">
                                PKR {estimate.min.toLocaleString()} - PKR {estimate.max.toLocaleString()}
                            </span>.
                        </p>

                        <div className="p-3.5 bg-[#F7F5F2] border border-[#141210]/10 rounded-[18px] text-left text-[11px] text-[#7C746B] space-y-1 max-w-sm mx-auto">
                            <div className="flex items-center gap-1.5 text-[#B4562F] font-semibold">
                                <Info className="w-4 h-4 flex-shrink-0" />
                                <span>Important Valuation Notice:</span>
                            </div>
                            <p className="text-[#2A2622] pl-5 leading-relaxed">
                                This quote is an <strong>estimated valuation</strong> based on the details provided. The <strong>final buying price</strong> will be confirmed upon physical verification and hardware inspection of your device.
                            </p>
                        </div>

                        <div className="pt-2 space-y-2.5">
                            <a
                                href={getWhatsAppLink()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#22423A] hover:bg-[#141210] text-white font-semibold px-6 py-3 rounded-full text-xs sm:text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                            >
                                <MessageCircle className="w-4 h-4 fill-current" />
                                <span>Chat Now on WhatsApp</span>
                            </a>

                            <button
                                onClick={onClose}
                                type="button"
                                className="w-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] border border-[#141210]/12 font-semibold px-6 py-2.5 rounded-full text-xs transition cursor-pointer"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Header Title */}
                        <div className="flex items-center space-x-3 border-b border-[#141210]/10 pb-3.5 mb-4 pr-8">
                            <div className="w-10 h-10 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center shrink-0">
                                <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#141210] leading-tight">
                                    Trade-In <span className="font-display italic text-[#B4562F]">Wizard.</span>
                                </h2>
                                <p className="text-[11px] text-[#7C746B]">
                                    Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
                                </p>
                            </div>
                        </div>

                        {/* Step Stepper Progress Bar */}
                        <div className="flex items-center justify-between mb-6 relative">
                            <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#141210]/12 -translate-y-1/2 -z-0" />
                            {STEPS.map((step) => {
                                const isCompleted = currentStep > step.id;
                                const isCurrent = currentStep === step.id;
                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isCompleted
                                                    ? 'bg-[#22423A] text-white'
                                                    : isCurrent
                                                        ? 'bg-[#B4562F] text-white'
                                                        : 'bg-[#F7F5F2] text-[#7C746B] border border-[#141210]/15'
                                                }`}
                                        >
                                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Error Notice */}
                        {error && (
                            <div className="mb-4 p-3 rounded-2xl bg-[#B4562F]/10 border border-[#B4562F]/25 text-[#B4562F] text-xs font-medium">
                                {error}
                            </div>
                        )}

                        {/* Wizard Step Content */}
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* STEP 1: MODEL & STORAGE */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] uppercase tracking-[0.14em] text-[#7C746B] font-semibold block">
                                            Select Device Model
                                        </label>
                                        <select
                                            name="model"
                                            value={formData.model}
                                            onChange={handleChange}
                                            className="w-full mt-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#141210] focus:bg-white focus:border-[#141210] focus:outline-none cursor-pointer transition"
                                        >
                                            {Object.keys(pricingConfig).map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] uppercase tracking-[0.14em] text-[#7C746B] font-semibold block">
                                            Select Storage Capacity
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                                            {availableStorages.map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, storage: s }))}
                                                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer num-tabular ${formData.storage === s
                                                            ? 'bg-[#141210] border-[#141210] text-white'
                                                            : 'bg-[#F7F5F2] border-[#141210]/12 text-[#2A2622] hover:border-[#141210]'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CONDITION & SPECS */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] text-[#7C746B] font-semibold flex items-center gap-1">
                                                    <Shield className="w-3.5 h-3.5 text-[#B4562F]" />
                                                    PTA Status
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPtaTooltip(!showPtaTooltip)}
                                                    className="text-[#B4562F] hover:text-[#141210] p-0.5 cursor-pointer"
                                                    title="PTA Status Info"
                                                >
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <select
                                                name="ptaStatus"
                                                value={formData.ptaStatus}
                                                onChange={handleChange}
                                                className="w-full mt-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#141210] focus:bg-white focus:border-[#141210] focus:outline-none cursor-pointer transition"
                                            >
                                                <option value="PTA Approved">PTA Approved</option>
                                                <option value="Non-PTA">Non-PTA</option>
                                                <option value="JV">JV (Carrier Locked)</option>
                                                <option value="E-SIM Approved">E-SIM Approved</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-[#7C746B] font-semibold flex items-center gap-1">
                                                <Battery className="w-3.5 h-3.5 text-[#22423A]" />
                                                Battery Health (%)
                                            </label>
                                            <input
                                                type="number"
                                                name="batteryHealth"
                                                value={formData.batteryHealth}
                                                onChange={handleChange}
                                                className="w-full mt-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2 text-xs text-[#141210] focus:bg-white focus:border-[#141210] focus:outline-none num-tabular transition"
                                                min="50"
                                                max="100"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {showPtaTooltip && (
                                        <div className="p-3 bg-[#F7F5F2] border border-[#B4562F]/25 rounded-2xl text-[11px] text-[#2A2622] space-y-1">
                                            <p><span className="font-semibold text-[#22423A]">PTA Approved:</span> Fully official tax paid on SIM &amp; E-SIM.</p>
                                            <p><span className="font-semibold text-[#B4562F]">Non-PTA:</span> Factory unlocked device without local PTA tax clearance.</p>
                                            <p><span className="font-semibold text-[#141210]">JV:</span> Carrier locked device requiring SIM chip / bypass.</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[11px] text-[#7C746B] font-semibold block">Physical Condition</label>
                                        <select
                                            name="condition"
                                            value={formData.condition}
                                            onChange={handleChange}
                                            className="w-full mt-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#141210] focus:bg-white focus:border-[#141210] focus:outline-none cursor-pointer transition"
                                        >
                                            <option value="Like New (10/10)">Like New (10/10)</option>
                                            <option value="Minor Scratches">Minor Scratches</option>
                                            <option value="Dented / Scratched">Dented / Scratched</option>
                                            <option value="Cracked Screen / Back">Cracked Screen / Back</option>
                                        </select>
                                    </div>

                                    <div className="pt-1">
                                        <label className="flex items-center space-x-2.5 text-xs text-[#141210] font-medium cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                name="hasBox"
                                                checked={formData.hasBox}
                                                onChange={handleChange}
                                                className="rounded bg-[#F7F5F2] border-[#141210]/20 accent-[#B4562F] focus:ring-0 w-4 h-4 cursor-pointer"
                                            />
                                            <span>Includes Original Box &amp; Cable <span className="text-[#22423A] font-semibold">(+PKR 4,000)</span></span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: CONTACT & PHOTOS */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-[#7C746B] font-semibold block">Full Name *</label>
                                            <input
                                                type="text"
                                                name="customerName"
                                                placeholder="e.g. Abdullah Baloch"
                                                value={formData.customerName}
                                                onChange={handleChange}
                                                className="w-full mt-1 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2 text-xs text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:border-[#141210] focus:outline-none transition"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-[#7C746B] font-semibold block">WhatsApp Phone *</label>
                                            <input
                                                type="text"
                                                name="customerPhone"
                                                placeholder="e.g. 03001234567"
                                                value={formData.customerPhone}
                                                onChange={handleChange}
                                                className="w-full mt-1 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2 text-xs text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:border-[#141210] focus:outline-none num-tabular transition"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-[#7C746B] font-semibold flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-[#7C746B]" />
                                            Email Address (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            name="customerEmail"
                                            placeholder="e.g. name@example.com"
                                            value={formData.customerEmail}
                                            onChange={handleChange}
                                            className="w-full mt-1 bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3 py-2 text-xs text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:border-[#141210] focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-[#7C746B] font-semibold block">Attach Device Photos (Optional)</label>
                                        <div className="mt-1 flex items-center justify-center w-full bg-[#F7F5F2] border border-dashed border-[#141210]/20 rounded-xl p-3 cursor-pointer hover:bg-[#E9E3DB] transition">
                                            <label className="flex flex-col items-center cursor-pointer w-full">
                                                <Upload className="w-5 h-5 text-[#B4562F] mb-1" />
                                                <span className="text-xs text-[#2A2622] font-medium">
                                                    {photos.length > 0 ? `${photos.length} photo(s) attached` : 'Click to attach photos'}
                                                </span>
                                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                            </label>
                                        </div>

                                        {photoPreviews.length > 0 && (
                                            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
                                                {photoPreviews.map((src, index) => (
                                                    <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#141210]/15 flex-shrink-0 group">
                                                        <img src={src} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute inset-0 bg-[#141210]/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Live Valuation Summary Card Banner */}
                            <div className="mt-4 space-y-1.5 pt-3 border-t border-[#141210]/10">
                                <div className="p-3.5 rounded-[18px] bg-[#F7F5F2] border border-[#141210]/10 flex items-center justify-between gap-2">
                                    <div className="flex items-center space-x-2.5">
                                        <div className="p-2 rounded-full bg-[#B4562F]/12 text-[#B4562F]">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                <span>Estimated Valuation</span>
                                            </div>
                                            <div className="text-sm font-semibold text-[#141210] num-tabular">
                                                PKR {estimate.min.toLocaleString()} - {estimate.max.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10.5px] font-semibold text-[#2A2622] bg-white border border-[#141210]/10 px-2.5 py-1 rounded-full shrink-0">
                                        {formData.model}
                                    </span>
                                </div>
                            </div>

                            {/* Wizard Navigation Controls */}
                            <div className="flex items-center justify-between pt-3 gap-2">
                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={handlePrevStep}
                                        className="bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] border border-[#141210]/12 font-semibold px-4 py-2.5 rounded-full text-xs flex items-center gap-1 transition cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Back</span>
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {currentStep < STEPS.length ? (
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="btn btn-primary font-semibold px-5 py-2.5 rounded-full text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="sheen"></span>
                                        <span>Continue</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary font-semibold px-5 py-2.5 rounded-full text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <span className="sheen"></span>
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <span>Submit Trade-In Request</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}