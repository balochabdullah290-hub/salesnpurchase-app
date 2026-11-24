import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance, { getStoredToken, clearStoredTokens } from '../api/axiosInstance';
import {
    RefreshCw,
    Smartphone,
    Clock,
    Calculator,
    Phone,
    Mail,
    Box,
    Send,
    Trash2,
    Download,
    Loader2,
    Image as ImageIcon,
    X
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || 'PENDING').trim().toUpperCase();
    if (s === 'QUOTED' || s === 'APPROVED' || s === 'CONFIRMED') return 'QUOTED';
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'CANCELED') return 'REJECTED';
    return 'PENDING';
};

const parsePhotos = (rawPhotos) => {
    if (!rawPhotos) return [];
    if (Array.isArray(rawPhotos)) return rawPhotos.filter(Boolean);
    if (typeof rawPhotos === 'string') {
        const trimmed = rawPhotos.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch {
                return [];
            }
        }
        return trimmed.split(',').map(u => u.trim()).filter(Boolean);
    }
    return [];
};

export default function AdminTradeIns() {
    const [tradeIns, setTradeIns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quoteInputs, setQuoteInputs] = useState({});
    const [updatingId, setUpdatingId] = useState(null);
    const [quotingId, setQuotingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState('');

    const handleAuthError = useCallback(() => {
        alert("Session expired. Please log in again.");
        clearStoredTokens();
        window.location.href = '/login';
    }, []);

    const loadTradeIns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/TradeIns');
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setTradeIns(list);

            const initialQuotes = {};
            list.forEach((item, idx) => {
                const id = getProp(item, 'id', 'Id', idx);
                const finalQuote = getProp(item, 'finalQuotePKR', 'FinalQuotePKR', '') ?? getProp(item, 'finalQuotePkr', 'FinalQuotePkr', '');
                const estQuote = getProp(item, 'estimatedValuePKR', 'EstimatedValuePKR', '') ?? getProp(item, 'estimatedValuePkr', 'EstimatedValuePkr', '');
                initialQuotes[id] = finalQuote !== '' && finalQuote !== null ? String(finalQuote) : (estQuote !== '' && estQuote !== null ? String(estQuote) : '');
            });
            setQuoteInputs(initialQuotes);
        } catch (err) {
            console.error("Failed to load trade-in requests:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                setTradeIns([]);
            }
        } finally {
            setLoading(false);
        }
    }, [handleAuthError]);

    useEffect(() => {
        loadTradeIns();
    }, [loadTradeIns]);

    const handleStatusChange = async (id, nextStatus) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        setUpdatingId(id);
        try {
            await axiosInstance.put(`/TradeIns/${id}/status`, { status: nextStatus });
            setTradeIns(prev =>
                prev.map(item => {
                    const itemId = getProp(item, 'id', 'Id', null);
                    if (itemId !== id) return item;
                    return { ...item, status: nextStatus, Status: nextStatus };
                })
            );
        } catch (err) {
            console.error("Failed to update trade-in status:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to update trade-in status.");
                await loadTradeIns();
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSendQuote = async (item, id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        const rawQuote = quoteInputs[id];
        const numericQuote = Number(String(rawQuote ?? '').replace(/,/g, ''));
        if (!rawQuote || Number.isNaN(numericQuote) || numericQuote <= 0) {
            alert("Please enter a valid final quote in PKR.");
            return;
        }

        setQuotingId(id);
        try {
            await axiosInstance.put(`/TradeIns/${id}/quote`, {
                finalQuotePKR: numericQuote,
                status: 'QUOTED'
            });

            setTradeIns(prev =>
                prev.map(row => {
                    const rowId = getProp(row, 'id', 'Id', null);
                    if (rowId !== id) return row;
                    return {
                        ...row,
                        finalQuotePKR: numericQuote,
                        FinalQuotePKR: numericQuote,
                        status: 'QUOTED',
                        Status: 'QUOTED'
                    };
                })
            );

            const customerName = getProp(item, 'customerName', 'CustomerName', 'Customer');
            const phone = String(getProp(item, 'phone', 'Phone', '') || '').replace(/[^0-9]/g, '');
            const deviceModel = getProp(item, 'deviceModel', 'DeviceModel', '') || getProp(item, 'model', 'Model', 'device');
            if (phone) {
                const normalizedPhone = phone.startsWith('0') ? `92${phone.slice(1)}` : phone;
                const msg = encodeURIComponent(
                    `Hello ${customerName}, our final trade-in quote for your ${deviceModel} is PKR ${numericQuote.toLocaleString()} (SalesnPurchase).`
                );
                window.open(`https://wa.me/${normalizedPhone}?text=${msg}`, '_blank');
            }
        } catch (err) {
            console.error("Failed to send trade-in quote:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to save final quote.");
            }
        } finally {
            setQuotingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        if (!window.confirm("Are you sure you want to delete this trade-in request?")) return;

        setDeletingId(id);
        try {
            await axiosInstance.delete(`/TradeIns/${id}`);
            setTradeIns(prev => prev.filter(item => getProp(item, 'id', 'Id', null) !== id));
        } catch (err) {
            console.error("Failed to delete trade-in request:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to delete trade-in request.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const exportToCSV = () => {
        if (tradeIns.length === 0) {
            alert("No trade-in requests available to export.");
            return;
        }

        const headers = ["ID", "Customer", "Phone", "Email", "Device", "Storage", "PTA", "Condition", "Box", "Status", "Final Quote (PKR)"];
        const rows = tradeIns.map((t, idx) => {
            const id = getProp(t, 'id', 'Id', idx);
            return [
                id,
                `"${String(getProp(t, 'customerName', 'CustomerName', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'phone', 'Phone', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'email', 'Email', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'deviceModel', 'DeviceModel', '') || getProp(t, 'model', 'Model', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'storage', 'Storage', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'ptaStatus', 'PtaStatus', '')).replace(/"/g, '""')}"`,
                `"${String(getProp(t, 'condition', 'Condition', '')).replace(/"/g, '""')}"`,
                Boolean(getProp(t, 'hasBox', 'HasBox', false)) ? 'Yes' : 'No',
                normalizeStatus(getProp(t, 'status', 'Status', 'PENDING')),
                quoteInputs[id] || getProp(t, 'finalQuotePKR', 'FinalQuotePKR', 0)
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `SalesnPurchase_TradeIns_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalCount = tradeIns.length;
    const pendingCount = tradeIns.filter(t => normalizeStatus(getProp(t, 'status', 'Status', 'PENDING')) === 'PENDING').length;
    const quotedCount = tradeIns.filter(t => normalizeStatus(getProp(t, 'status', 'Status', 'PENDING')) === 'QUOTED').length;

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Buyback Portal</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Trade-In &amp; <span className="font-display italic text-[#B4562F]">Buyback Requests.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            Review customer submitted device specs, inspect photos, and send WhatsApp price quotes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={exportToCSV}
                            className="btn btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer"
                        >
                            <span className="sheen"></span>
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={loadTradeIns}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-[#E9E3DB] text-[#141210] border border-[#141210]/12 transition cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-[#B4562F] ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">Total Trade-Ins</span>
                            <span className="text-3xl font-semibold text-[#141210] mt-1.5 block num-tabular">{totalCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#E9E3DB] text-[#141210] flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold block">Pending Review</span>
                            <span className="text-3xl font-semibold text-[#B4562F] mt-1.5 block num-tabular">{pendingCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#22423A] font-semibold block">Quoted Requests</span>
                            <span className="text-3xl font-semibold text-[#22423A] mt-1.5 block num-tabular">{quotedCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#22423A]/12 text-[#22423A] flex items-center justify-center">
                            <Calculator className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Trade-Ins Table Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] overflow-hidden">
                    {loading ? (
                        <div className="py-16 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                            <span>Loading trade-in requests...</span>
                        </div>
                    ) : tradeIns.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[#7C746B]">
                            No trade-in requests found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F7F5F2] border-b border-[#141210]/10 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B]">
                                        <th className="py-4 px-5">Customer Details</th>
                                        <th className="py-4 px-4">Device Specs</th>
                                        <th className="py-4 px-4">Uploaded Photos</th>
                                        <th className="py-4 px-4">Condition &amp; Battery</th>
                                        <th className="py-4 px-4">Status</th>
                                        <th className="py-4 px-4">Est. vs Final Quote (PKR)</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#141210]/8 text-xs">
                                    {tradeIns.map((item, idx) => {
                                        const id = getProp(item, 'id', 'Id', idx);
                                        const customerName = getProp(item, 'customerName', 'CustomerName', 'Customer');
                                        const phone = getProp(item, 'phone', 'Phone', '—');
                                        const email = getProp(item, 'email', 'Email', '');
                                        const deviceModel = getProp(item, 'deviceModel', 'DeviceModel', '') || getProp(item, 'model', 'Model', 'Device');
                                        const storage = getProp(item, 'storage', 'Storage', '—');
                                        const ptaStatus = getProp(item, 'ptaStatus', 'PtaStatus', '—');
                                        const condition = getProp(item, 'condition', 'Condition', '—');
                                        const battery = getProp(item, 'batteryHealth', 'BatteryHealth', null);
                                        const hasBox = Boolean(getProp(item, 'hasBox', 'HasBox', false));
                                        const status = normalizeStatus(getProp(item, 'status', 'Status', 'PENDING'));
                                        const photos = parsePhotos(
                                            getProp(item, 'photoUrls', 'PhotoUrls', null) ||
                                            getProp(item, 'photos', 'Photos', null) ||
                                            getProp(item, 'imageUrl', 'ImageUrl', null)
                                        );

                                        return (
                                            <tr key={id} className="hover:bg-[#F7F5F2]/70 transition align-middle">
                                                <td className="py-4 px-5 space-y-1 whitespace-nowrap">
                                                    <div className="font-semibold text-[#141210]">{customerName}</div>
                                                    <div className="text-[#2A2622] flex items-center gap-1.5 num-tabular">
                                                        <Phone className="w-3 h-3 text-[#B4562F]" />
                                                        <span>{phone}</span>
                                                    </div>
                                                    {email && (
                                                        <div className="text-[#7C746B] text-[11px] flex items-center gap-1.5">
                                                            <Mail className="w-3 h-3 text-[#7C746B]" />
                                                            <span>{email}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 space-y-1 max-w-[190px]">
                                                    <div className="font-semibold text-[#141210] flex items-center gap-1.5">
                                                        <Smartphone className="w-3.5 h-3.5 text-[#B4562F] shrink-0" />
                                                        <span>{deviceModel}</span>
                                                    </div>
                                                    <div className="text-[11px] text-[#7C746B] num-tabular">
                                                        Storage: <span className="text-[#141210] font-medium">{storage}</span> • PTA: <span className="text-[#B4562F] font-semibold">{ptaStatus}</span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    {photos.length > 0 ? (
                                                        <div className="flex items-center gap-1.5">
                                                            {photos.slice(0, 3).map((url, pIdx) => (
                                                                <button
                                                                    key={pIdx}
                                                                    type="button"
                                                                    onClick={() => setPreviewPhotoUrl(url)}
                                                                    className="w-9 h-9 rounded-lg overflow-hidden border border-[#141210]/15 bg-[#F7F5F2] cursor-pointer"
                                                                >
                                                                    <img src={url} alt={`Device ${pIdx + 1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] italic text-[#7C746B] inline-flex items-center gap-1">
                                                            <ImageIcon className="w-3.5 h-3.5 opacity-60" />
                                                            No photos
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 space-y-1 whitespace-nowrap">
                                                    <div className="text-[#2A2622]">
                                                        Condition: <span className="font-semibold text-[#B4562F]">{condition}</span>
                                                    </div>
                                                    {battery !== null && battery !== '' && (
                                                        <div className="text-[11px] text-[#7C746B] num-tabular">
                                                            Battery: <span className="text-[#141210] font-medium">{battery}%</span>
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-[#7C746B] flex items-center gap-1">
                                                        <Box className="w-3 h-3" />
                                                        <span>Box:</span>
                                                        <span className={hasBox ? 'text-[#22423A] font-semibold' : 'text-[#7C746B] font-medium'}>
                                                            {hasBox ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <select
                                                        value={status}
                                                        disabled={updatingId === id}
                                                        onChange={(e) => handleStatusChange(id, e.target.value)}
                                                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border cursor-pointer focus:outline-none transition ${status === 'QUOTED'
                                                                ? 'bg-[#22423A]/12 text-[#22423A] border-[#22423A]/25'
                                                                : status === 'REJECTED'
                                                                    ? 'bg-[#B4562F]/12 text-[#B4562F] border-[#B4562F]/25'
                                                                    : 'bg-[#E9E3DB] text-[#141210] border-[#141210]/15'
                                                            }`}
                                                    >
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="QUOTED">QUOTED</option>
                                                        <option value="REJECTED">REJECTED</option>
                                                    </select>
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Final quote e.g. 145000"
                                                        value={quoteInputs[id] ?? ''}
                                                        onChange={(e) =>
                                                            setQuoteInputs(prev => ({ ...prev, [id]: e.target.value }))
                                                        }
                                                        className="w-36 bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-xl px-3 py-2 text-xs text-[#141210] placeholder:text-[#7C746B]/70 focus:outline-none num-tabular transition"
                                                    />
                                                </td>

                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendQuote(item, id)}
                                                            disabled={quotingId === id}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11.5px] font-semibold bg-[#22423A] hover:bg-[#141210] text-white transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            {quotingId === id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Send className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Quote</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(id)}
                                                            disabled={deletingId === id}
                                                            title="Delete Request"
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

            {/* Photo Preview Modal */}
            {previewPhotoUrl && (
                <div
                    onClick={() => setPreviewPhotoUrl('')}
                    className="fixed inset-0 z-50 bg-[#141210]/70 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white border border-[#141210]/10 rounded-[26px] max-w-lg w-full p-5 shadow-2xl space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C746B]">Device Photo</span>
                            <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl('')}
                                className="p-1.5 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#141210] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <img src={previewPhotoUrl} alt="Trade-in device" className="w-full max-h-[65vh] object-contain rounded-2xl bg-[#F7F5F2]" />
                    </div>
                </div>
            )}
        </div>
    );
}