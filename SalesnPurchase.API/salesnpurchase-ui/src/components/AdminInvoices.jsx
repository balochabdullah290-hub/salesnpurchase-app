import React, { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance, { getStoredToken, clearStoredTokens } from '../api/axiosInstance';
import {
    FileText,
    RefreshCw,
    Plus,
    Mic,
    MicOff,
    Sparkles,
    Eye,
    MessageSquare,
    Trash2,
    Loader2,
    X,
    Printer
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const normalizeDealType = (rawType) => {
    const t = String(rawType || 'SELL').trim().toUpperCase();
    if (t.includes('TRADE')) return 'TRADE_IN';
    if (t.includes('BUY') || t.includes('PURCHASE')) return 'BUY';
    return 'SELL';
};

const formatInvoiceDate = (rawDate) => {
    if (!rawDate) return '—';
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const initialInvoiceForm = {
    invoiceNumber: '',
    dealType: 'SELL',
    customerName: '',
    customerPhone: '',
    shopName: 'SalesnPurchase Islamabad',
    deviceModel: '',
    storage: '256GB',
    color: '',
    imei: '',
    ptaStatus: 'PTA Approved',
    ratePKR: '',
    tradeInCnic: '',
    notes: ''
};

export default function AdminInvoices() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dealFilter, setDealFilter] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Voice / AI Bar States
    const [aiPrompt, setAiPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const recognitionRef = useRef(null);

    // Create Invoice Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState(initialInvoiceForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // View Bill Modal State
    const [selectedBill, setSelectedBill] = useState(null);

    const handleAuthError = useCallback(() => {
        alert("Session expired. Please log in again.");
        clearStoredTokens();
        window.location.href = '/login';
    }, []);

    const loadInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/Invoices');
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setInvoices(list);
        } catch (err) {
            console.error("Failed to load invoices:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                setInvoices([]);
            }
        } finally {
            setLoading(false);
        }
    }, [handleAuthError]);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore cleanup error
                }
            }
        };
    }, []);

    const applyAiParsedInvoice = (data, fallbackText) => {
        const parsedDeal = normalizeDealType(getProp(data, 'dealType', 'DealType', 'SELL'));
        const parsedRate = getProp(data, 'ratePKR', 'RatePKR', '') ?? getProp(data, 'ratePkr', 'RatePkr', '');
        const generatedNo = `SNP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

        setFormData(prev => ({
            ...prev,
            invoiceNumber: getProp(data, 'invoiceNumber', 'InvoiceNumber', '') || prev.invoiceNumber || generatedNo,
            dealType: parsedDeal,
            customerName: getProp(data, 'customerName', 'CustomerName', '') || prev.customerName,
            customerPhone: getProp(data, 'customerPhone', 'CustomerPhone', '') || prev.customerPhone,
            shopName: getProp(data, 'shopName', 'ShopName', '') || prev.shopName || 'SalesnPurchase Islamabad',
            deviceModel: getProp(data, 'deviceModel', 'DeviceModel', '') || getProp(data, 'model', 'Model', '') || prev.deviceModel,
            storage: getProp(data, 'storage', 'Storage', '') || prev.storage || '256GB',
            color: getProp(data, 'color', 'Color', '') || prev.color,
            imei: getProp(data, 'imei', 'Imei', '') || prev.imei,
            ptaStatus: getProp(data, 'ptaStatus', 'PtaStatus', '') || prev.ptaStatus || 'PTA Approved',
            ratePKR: parsedRate !== '' && parsedRate !== null ? String(parsedRate) : prev.ratePKR,
            tradeInCnic: getProp(data, 'tradeInCnic', 'TradeInCnic', '') || prev.tradeInCnic,
            notes: getProp(data, 'notes', 'Notes', '') || fallbackText || prev.notes
        }));
        setShowCreateModal(true);
    };

    const handleGenerateWithAi = async (overrideText = null) => {
        const promptText = String(overrideText ?? aiPrompt ?? '').trim();
        if (!promptText) {
            alert("Please speak or type invoice details first.");
            return;
        }

        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        setIsGeneratingAi(true);
        try {
            const res = await axiosInstance.post('/Invoices/parse-ai', { prompt: promptText });
            const parsedData = res.data?.invoice || res.data?.data || res.data || {};
            applyAiParsedInvoice(parsedData, promptText);
        } catch (err) {
            console.error("AI invoice parsing failed:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                const lower = promptText.toLowerCase();
                const dealType = lower.includes('trade') ? 'TRADE_IN' : (lower.includes('buy') || lower.includes('purchase') ? 'BUY' : 'SELL');
                const imeiMatch = promptText.match(/\b\d{14,16}\b/);
                const phoneMatch = promptText.match(/\b03\d{9}\b/);
                const rateMatch = promptText.match(/\b\d{5,7}\b/g);
                const inferredRate = rateMatch ? rateMatch.find(n => n !== imeiMatch?.[0] && n !== phoneMatch?.[0]) : '';

                applyAiParsedInvoice(
                    {
                        dealType,
                        customerPhone: phoneMatch ? phoneMatch[0] : '',
                        imei: imeiMatch ? imeiMatch[0] : '',
                        ratePKR: inferredRate || '',
                        notes: promptText
                    },
                    promptText
                );
            }
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleToggleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser. Type your invoice prompt instead.");
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch {
                // ignore stop error
            }
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        setIsListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript || '';
            if (transcript.trim()) {
                const clean = transcript.trim();
                setAiPrompt(clean);
                handleGenerateWithAi(clean);
            }
        };

        recognition.onerror = (err) => {
            console.error("Speech error:", err);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const openNewInvoiceModal = () => {
        const generatedNo = `SNP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        setFormData({
            ...initialInvoiceForm,
            invoiceNumber: generatedNo
        });
        setShowCreateModal(true);
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        if (formData.dealType === 'TRADE_IN' && !String(formData.tradeInCnic || '').trim()) {
            alert("Trade-In CNIC is mandatory for Trade-In bills.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                invoiceNumber: String(formData.invoiceNumber || '').trim(),
                dealType: formData.dealType,
                customerName: String(formData.customerName || '').trim(),
                customerPhone: String(formData.customerPhone || '').trim(),
                shopName: String(formData.shopName || 'SalesnPurchase Islamabad').trim(),
                deviceModel: String(formData.deviceModel || '').trim(),
                storage: String(formData.storage || '').trim(),
                color: String(formData.color || '').trim(),
                imei: String(formData.imei || '').trim(),
                ptaStatus: String(formData.ptaStatus || 'PTA Approved').trim(),
                ratePKR: Number(String(formData.ratePKR || 0).replace(/,/g, '')) || 0,
                tradeInCnic: String(formData.tradeInCnic || '').trim(),
                notes: String(formData.notes || '').trim()
            };

            await axiosInstance.post('/Invoices', payload);
            setShowCreateModal(false);
            setFormData(initialInvoiceForm);
            setAiPrompt('');
            await loadInvoices();
        } catch (err) {
            console.error("Failed to create invoice:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to save digital invoice.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        if (!window.confirm("Are you sure you want to delete this invoice?")) return;

        setDeletingId(id);
        try {
            await axiosInstance.delete(`/Invoices/${id}`);
            setInvoices(prev => prev.filter(item => getProp(item, 'id', 'Id', null) !== id));
        } catch (err) {
            console.error("Failed to delete invoice:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to delete invoice.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleShareWhatsApp = (inv) => {
        const invNo = getProp(inv, 'invoiceNumber', 'InvoiceNumber', 'Invoice');
        const dealType = normalizeDealType(getProp(inv, 'dealType', 'DealType', 'SELL'));
        const customerName = getProp(inv, 'customerName', 'CustomerName', 'Customer');
        const rawPhone = String(getProp(inv, 'customerPhone', 'CustomerPhone', '') || '').replace(/[^0-9]/g, '');
        const deviceModel = getProp(inv, 'deviceModel', 'DeviceModel', '') || getProp(inv, 'model', 'Model', 'Device');
        const ratePKR = Number(getProp(inv, 'ratePKR', 'RatePKR', 0) ?? getProp(inv, 'ratePkr', 'RatePkr', 0));
        const imei = getProp(inv, 'imei', 'Imei', '');

        const text = encodeURIComponent(
            `SalesnPurchase Digital Bill (${invNo})\nType: ${dealType}\nCustomer: ${customerName}\nDevice: ${deviceModel}${imei ? `\nIMEI: ${imei}` : ''}\nRate: PKR ${ratePKR.toLocaleString()}`
        );

        if (rawPhone) {
            const normalizedPhone = rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : rawPhone;
            window.open(`https://wa.me/${normalizedPhone}?text=${text}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        if (!dealFilter) return true;
        return normalizeDealType(getProp(inv, 'dealType', 'DealType', 'SELL')) === dealFilter;
    });

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Structured Buy / Sell / Trade-In Bills</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Digital <span className="font-display italic text-[#B4562F]">Invoices.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            Customer, shop, specs, IMEI, rate, date &amp; mandatory Trade-In CNIC record
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <select
                            value={dealFilter}
                            onChange={(e) => setDealFilter(e.target.value)}
                            className="bg-white border border-[#141210]/12 rounded-full px-4 py-2.5 text-xs font-semibold text-[#141210] focus:outline-none focus:border-[#141210] cursor-pointer"
                        >
                            <option value="">All Deal Types</option>
                            <option value="SELL">SELL</option>
                            <option value="BUY">BUY</option>
                            <option value="TRADE_IN">TRADE-IN</option>
                        </select>

                        <button
                            type="button"
                            onClick={loadInvoices}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-[#E9E3DB] text-[#141210] border border-[#141210]/12 transition cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-[#B4562F] ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>

                        <button
                            type="button"
                            onClick={openNewInvoiceModal}
                            className="btn btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer"
                        >
                            <span className="sheen"></span>
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Digital Invoice</span>
                        </button>
                    </div>
                </div>

                {/* Voice / AI Quick Invoice Bar */}
                <div className="bg-white border border-[#141210]/8 rounded-[22px] p-4 sm:p-5 mb-8 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <button
                        type="button"
                        onClick={handleToggleVoice}
                        disabled={isGeneratingAi}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition cursor-pointer shrink-0 ${isListening
                                ? 'bg-[#B4562F] text-white border-[#B4562F]'
                                : 'bg-[#22423A]/10 hover:bg-[#22423A]/20 text-[#22423A] border-[#22423A]/20'
                            }`}
                    >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isListening ? 'Listening...' : 'Speak Invoice'}</span>
                    </button>

                    <input
                        type="text"
                        placeholder='Speak or type: "Sell iPhone 15 Pro Max 256GB Natural Titanium PTA to Bilal 03001234567 IMEI 356789123456789 rate 285000"'
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleGenerateWithAi();
                            }
                        }}
                        className="flex-1 bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-xl px-4 py-2.5 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition"
                    />

                    <button
                        type="button"
                        onClick={() => handleGenerateWithAi()}
                        disabled={isGeneratingAi}
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#141210] hover:bg-[#B4562F] text-white transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                        {isGeneratingAi ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#D97B4F]" />
                        )}
                        <span>Generate with AI</span>
                    </button>
                </div>

                {/* Invoices Table Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] overflow-hidden">
                    {loading ? (
                        <div className="py-16 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                            <span>Loading digital invoices...</span>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[#7C746B]">
                            No digital invoices found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F7F5F2] border-b border-[#141210]/10 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B]">
                                        <th className="py-4 px-5">Invoice / Type</th>
                                        <th className="py-4 px-4">Customer &amp; Phone</th>
                                        <th className="py-4 px-4">Device &amp; Specs</th>
                                        <th className="py-4 px-4">IMEI &amp; PTA</th>
                                        <th className="py-4 px-4">Rate (PKR)</th>
                                        <th className="py-4 px-4">Date</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#141210]/8 text-xs">
                                    {filteredInvoices.map((inv, idx) => {
                                        const id = getProp(inv, 'id', 'Id', idx);
                                        const invNumber = getProp(inv, 'invoiceNumber', 'InvoiceNumber', `SNP-${idx + 1}`);
                                        const dealType = normalizeDealType(getProp(inv, 'dealType', 'DealType', 'SELL'));
                                        const customerName = getProp(inv, 'customerName', 'CustomerName', 'Customer');
                                        const customerPhone = getProp(inv, 'customerPhone', 'CustomerPhone', '—');
                                        const deviceModel = getProp(inv, 'deviceModel', 'DeviceModel', '') || getProp(inv, 'model', 'Model', 'Device');
                                        const storage = getProp(inv, 'storage', 'Storage', '');
                                        const color = getProp(inv, 'color', 'Color', '');
                                        const specsLine = [storage, color].filter(Boolean).join(' • ') || '—';
                                        const imei = getProp(inv, 'imei', 'Imei', '—');
                                        const ptaStatus = getProp(inv, 'ptaStatus', 'PtaStatus', '');
                                        const ratePKR = Number(getProp(inv, 'ratePKR', 'RatePKR', 0) ?? getProp(inv, 'ratePkr', 'RatePkr', 0));
                                        const dateStr = formatInvoiceDate(
                                            getProp(inv, 'createdAt', 'CreatedAt', null) || getProp(inv, 'date', 'Date', null)
                                        );

                                        return (
                                            <tr key={id} className="hover:bg-[#F7F5F2]/70 transition align-middle">
                                                <td className="py-4 px-5 whitespace-nowrap space-y-1.5">
                                                    <div className="font-semibold text-[#141210] num-tabular">{invNumber}</div>
                                                    <span
                                                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${dealType === 'SELL'
                                                                ? 'bg-[#22423A]/12 text-[#22423A]'
                                                                : dealType === 'TRADE_IN'
                                                                    ? 'bg-[#B4562F]/12 text-[#B4562F]'
                                                                    : 'bg-[#E9E3DB] text-[#141210]'
                                                            }`}
                                                    >
                                                        {dealType === 'TRADE_IN' ? 'TRADE-IN' : dealType}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <div className="font-semibold text-[#141210]">{customerName}</div>
                                                    <div className="text-[11px] text-[#B4562F] font-medium num-tabular mt-0.5">{customerPhone}</div>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <div className="font-semibold text-[#141210]">{deviceModel}</div>
                                                    <div className="text-[11px] text-[#7C746B] mt-0.5">{specsLine}</div>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <div className="text-[#2A2622] num-tabular">IMEI: {imei}</div>
                                                    {ptaStatus && (
                                                        <div className="text-[11px] font-semibold text-[#22423A] mt-0.5">{ptaStatus}</div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap font-semibold text-[#22423A] num-tabular">
                                                    PKR {ratePKR.toLocaleString()}
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap text-[#7C746B] num-tabular">
                                                    {dateStr}
                                                </td>

                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedBill(inv)}
                                                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[11.5px] font-semibold bg-[#141210] hover:bg-[#B4562F] text-white transition cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Bill</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleShareWhatsApp(inv)}
                                                            title="Share on WhatsApp"
                                                            className="p-2 rounded-full bg-[#22423A]/12 hover:bg-[#22423A] text-[#22423A] hover:text-white transition cursor-pointer"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(id)}
                                                            disabled={deletingId === id}
                                                            title="Delete Invoice"
                                                            className="p-2 rounded-full bg-[#B4562F]/10 hover:bg-[#B4562F] text-[#B4562F] hover:text-white transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create New Digital Invoice Modal */}
            {showCreateModal && (
                <div
                    onClick={() => setShowCreateModal(false)}
                    className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white text-[#141210] border border-[#141210]/10 rounded-[26px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-auto"
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-[#141210]/10">
                            <div>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold block">Structured Receipt</span>
                                <h3 className="text-lg font-semibold text-[#141210]">New Digital Invoice</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#141210] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Invoice #</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.invoiceNumber}
                                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Deal Type</label>
                                    <select
                                        value={formData.dealType}
                                        onChange={(e) => setFormData({ ...formData, dealType: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 font-semibold text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] cursor-pointer"
                                    >
                                        <option value="SELL">SELL</option>
                                        <option value="BUY">BUY</option>
                                        <option value="TRADE_IN">TRADE-IN</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Rate (PKR) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="e.g. 285000"
                                        value={formData.ratePKR}
                                        onChange={(e) => setFormData({ ...formData, ratePKR: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] num-tabular"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Customer full name"
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Customer Phone *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="03001234567"
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] num-tabular"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Device Model *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. iPhone 15 Pro Max"
                                        value={formData.deviceModel}
                                        onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Storage</label>
                                    <input
                                        type="text"
                                        placeholder="256GB"
                                        value={formData.storage}
                                        onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Color</label>
                                    <input
                                        type="text"
                                        placeholder="Natural Titanium"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">IMEI Serial</label>
                                    <input
                                        type="text"
                                        placeholder="15-digit IMEI"
                                        value={formData.imei}
                                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] num-tabular"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">PTA Status</label>
                                    <input
                                        type="text"
                                        placeholder="PTA Approved / JV / Non-PTA"
                                        value={formData.ptaStatus}
                                        onChange={(e) => setFormData({ ...formData, ptaStatus: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210]"
                                    />
                                </div>
                            </div>

                            {formData.dealType === 'TRADE_IN' && (
                                <div>
                                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#B4562F] block mb-1.5">
                                        Mandatory Trade-In CNIC *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="37405-1234567-1"
                                        value={formData.tradeInCnic}
                                        onChange={(e) => setFormData({ ...formData, tradeInCnic: e.target.value })}
                                        className="w-full bg-[#F7F5F2] border border-[#B4562F]/35 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#B4562F] num-tabular"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-1.5">Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Additional deal terms, battery health, or accessories..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-3.5 py-2.5 text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#141210]/10">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2.5 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full font-semibold cursor-pointer disabled:opacity-50"
                                >
                                    <span className="sheen"></span>
                                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Save Invoice</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bill Preview Modal */}
            {selectedBill && (
                <div
                    onClick={() => setSelectedBill(null)}
                    className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white text-[#141210] border border-[#141210]/10 rounded-[26px] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[#141210]/10">
                            <div>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold block">Digital Receipt</span>
                                <h3 className="text-base font-semibold text-[#141210] num-tabular">
                                    {getProp(selectedBill, 'invoiceNumber', 'InvoiceNumber', 'Invoice')}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedBill(null)}
                                className="p-1.5 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#141210] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-[#F7F5F2] border border-[#141210]/8 rounded-[20px] p-4 space-y-2.5">
                            <div className="flex justify-between">
                                <span className="text-[#7C746B]">Deal Type</span>
                                <span className="font-semibold text-[#141210]">{normalizeDealType(getProp(selectedBill, 'dealType', 'DealType', 'SELL'))}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#7C746B]">Customer</span>
                                <span className="font-semibold text-[#141210]">{getProp(selectedBill, 'customerName', 'CustomerName', '—')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#7C746B]">Phone</span>
                                <span className="font-medium text-[#141210] num-tabular">{getProp(selectedBill, 'customerPhone', 'CustomerPhone', '—')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#7C746B]">Device</span>
                                <span className="font-semibold text-[#141210]">{getProp(selectedBill, 'deviceModel', 'DeviceModel', '—')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#7C746B]">IMEI</span>
                                <span className="font-medium text-[#141210] num-tabular">{getProp(selectedBill, 'imei', 'Imei', '—')}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-[#141210]/10">
                                <span className="text-[#7C746B]">Rate</span>
                                <span className="font-semibold text-[#22423A] text-sm num-tabular">
                                    PKR {Number(getProp(selectedBill, 'ratePKR', 'RatePKR', 0) ?? getProp(selectedBill, 'ratePkr', 'RatePkr', 0)).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#141210] font-semibold cursor-pointer border border-[#141210]/12"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleShareWhatsApp(selectedBill)}
                                className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold cursor-pointer"
                            >
                                <span className="sheen"></span>
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}