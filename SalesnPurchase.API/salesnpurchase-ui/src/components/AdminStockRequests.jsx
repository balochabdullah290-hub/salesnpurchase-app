import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance, { getStoredToken, clearStoredTokens } from '../api/axiosInstance';
import {
    PackageSearch,
    Phone,
    Smartphone,
    Clock,
    PackageCheck,
    Sparkles,
    MessageSquare,
    Trash2,
    Download,
    RefreshCw,
    Loader2,
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
    if (s === 'ARRANGED' || s === 'FULFILLED' || s === 'CONFIRMED' || s === 'COMPLETED') {
        return 'ARRANGED';
    }
    return 'PENDING';
};

const formatCapturedDate = (rawDate) => {
    if (!rawDate) return '—';
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function AdminStockRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [alertingId, setAlertingId] = useState(null);
    const [aiAlertModal, setAiAlertModal] = useState(null);

    const handleAuthError = useCallback(() => {
        alert("Session expired. Please log in again.");
        clearStoredTokens();
        window.location.href = '/login';
    }, []);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/StockRequests');
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setRequests(list);
        } catch (err) {
            console.error("Failed to load stock requests:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                setRequests([]);
            }
        } finally {
            setLoading(false);
        }
    }, [handleAuthError]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleStatusChange = async (id, nextStatus) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        setUpdatingId(id);
        try {
            await axiosInstance.put(`/StockRequests/${id}/status`, { status: nextStatus });
            setRequests(prev =>
                prev.map(item => {
                    const itemId = getProp(item, 'id', 'Id', null);
                    if (itemId !== id) return item;
                    return { ...item, status: nextStatus, Status: nextStatus };
                })
            );
        } catch (err) {
            console.error("Failed to update stock request status:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to update request status.");
                await loadRequests();
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAiAlert = async (reqItem, id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        const customerName = getProp(reqItem, 'customerName', 'CustomerName', 'Guest');
        const requestedItem =
            getProp(reqItem, 'requestedItem', 'RequestedItem', '') ||
            getProp(reqItem, 'deviceModel', 'DeviceModel', '') ||
            getProp(reqItem, 'model', 'Model', 'Requested Device');

        setAlertingId(id);
        try {
            const res = await axiosInstance.post(`/StockRequests/${id}/ai-alert`);
            const alertText =
                res.data?.alert ||
                res.data?.message ||
                res.data?.summary ||
                `Sourcing alert triggered for ${customerName} (${requestedItem}) within a 1–2 day fulfillment window.`;

            setAiAlertModal({
                customerName,
                requestedItem,
                alertText
            });
        } catch (err) {
            console.error("Failed to trigger AI sourcing alert:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                setAiAlertModal({
                    customerName,
                    requestedItem,
                    alertText: `Priority 1–2 Day Sourcing Alert: Source "${requestedItem}" for ${customerName} and follow up on WhatsApp.`
                });
            }
        } finally {
            setAlertingId(null);
        }
    };

    const handleWhatsAppContact = async (reqItem) => {
        const id = getProp(reqItem, 'id', 'Id', null);
        const customerName = getProp(reqItem, 'customerName', 'CustomerName', 'Customer');
        const rawPhone = String(getProp(reqItem, 'phone', 'Phone', '') || '').trim();
        const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
        const requestedItem =
            getProp(reqItem, 'requestedItem', 'RequestedItem', '') ||
            getProp(reqItem, 'deviceModel', 'DeviceModel', '') ||
            getProp(reqItem, 'model', 'Model', 'your requested item');

        if (digitsOnly) {
            const normalizedPhone = digitsOnly.startsWith('0') ? `92${digitsOnly.slice(1)}` : digitsOnly;
            const message = encodeURIComponent(
                `Hello ${customerName}, this is SalesnPurchase regarding your out-of-stock request for ${requestedItem} (1–2 day sourcing update).`
            );
            window.open(`https://wa.me/${normalizedPhone}?text=${message}`, '_blank');
        } else {
            alert("No phone number available for this guest lead.");
        }

        if (id && getStoredToken()) {
            try {
                await axiosInstance.post(`/StockRequests/${id}/whatsapp-log`);
                setRequests(prev =>
                    prev.map(item => {
                        const itemId = getProp(item, 'id', 'Id', null);
                        if (itemId !== id) return item;
                        const nowIso = new Date().toISOString();
                        return {
                            ...item,
                            whatsappContactedAt: nowIso,
                            WhatsappContactedAt: nowIso,
                            whatsappContacted: true
                        };
                    })
                );
            } catch (err) {
                console.warn("WhatsApp log update skipped:", err);
            }
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        if (!window.confirm("Are you sure you want to delete this stock request?")) return;

        setDeletingId(id);
        try {
            await axiosInstance.delete(`/StockRequests/${id}`);
            setRequests(prev => prev.filter(item => getProp(item, 'id', 'Id', null) !== id));
        } catch (err) {
            console.error("Failed to delete stock request:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to delete stock request.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const exportToCSV = () => {
        if (requests.length === 0) {
            alert("No stock requests available to export.");
            return;
        }

        const headers = ["ID", "Customer", "Phone", "Requested Item", "Captured On", "Status"];
        const rows = requests.map((r, idx) => [
            getProp(r, 'id', 'Id', idx),
            `"${String(getProp(r, 'customerName', 'CustomerName', 'Guest')).replace(/"/g, '""')}"`,
            `"${String(getProp(r, 'phone', 'Phone', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(r, 'requestedItem', 'RequestedItem', '') || getProp(r, 'deviceModel', 'DeviceModel', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(r, 'createdAt', 'CreatedAt', '') || getProp(r, 'capturedOn', 'CapturedOn', '')).replace(/"/g, '""')}"`,
            normalizeStatus(getProp(r, 'status', 'Status', 'PENDING'))
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `SalesnPurchase_StockRequests_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalCount = requests.length;
    const pendingCount = requests.filter(r => normalizeStatus(getProp(r, 'status', 'Status', 'PENDING')) === 'PENDING').length;
    const arrangedCount = requests.filter(r => normalizeStatus(getProp(r, 'status', 'Status', 'PENDING')) === 'ARRANGED').length;

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <PackageSearch className="w-3.5 h-3.5" />
                            <span>1–2 Day Sourcing Leads</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Out-of-Stock <span className="font-display italic text-[#B4562F]">Requests.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            AI-captured customer requirements to source and fulfill within 1–2 days
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
                            onClick={loadRequests}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-[#E9E3DB] text-[#141210] border border-[#141210]/12 transition cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-[#B4562F] ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">Total Sourcing Leads</span>
                            <span className="text-3xl font-semibold text-[#141210] mt-1.5 block num-tabular">{totalCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#E9E3DB] text-[#141210] flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold block">Pending (1–2 Days)</span>
                            <span className="text-3xl font-semibold text-[#B4562F] mt-1.5 block num-tabular">{pendingCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#22423A] font-semibold block">Arranged / Fulfilled</span>
                            <span className="text-3xl font-semibold text-[#22423A] mt-1.5 block num-tabular">{arrangedCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#22423A]/12 text-[#22423A] flex items-center justify-center">
                            <PackageCheck className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Stock Requests Table Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] overflow-hidden">
                    {loading ? (
                        <div className="py-16 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                            <span>Loading stock requests...</span>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[#7C746B]">
                            No out-of-stock requests found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F7F5F2] border-b border-[#141210]/10 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B]">
                                        <th className="py-4 px-5">Customer</th>
                                        <th className="py-4 px-4">Phone / WhatsApp</th>
                                        <th className="py-4 px-4">Requested Item</th>
                                        <th className="py-4 px-4">Captured On</th>
                                        <th className="py-4 px-4">WhatsApp Log</th>
                                        <th className="py-4 px-4">Status</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#141210]/8 text-xs">
                                    {requests.map((reqItem, idx) => {
                                        const id = getProp(reqItem, 'id', 'Id', idx);
                                        const customerName = getProp(reqItem, 'customerName', 'CustomerName', 'Guest');
                                        const phone = getProp(reqItem, 'phone', 'Phone', '') || 'Guest';
                                        const requestedItem =
                                            getProp(reqItem, 'requestedItem', 'RequestedItem', '') ||
                                            getProp(reqItem, 'deviceModel', 'DeviceModel', '') ||
                                            getProp(reqItem, 'model', 'Model', '—');
                                        const capturedOn = formatCapturedDate(
                                            getProp(reqItem, 'createdAt', 'CreatedAt', null) ||
                                            getProp(reqItem, 'capturedOn', 'CapturedOn', null)
                                        );
                                        const waLog =
                                            getProp(reqItem, 'whatsappContactedAt', 'WhatsappContactedAt', null) ||
                                            getProp(reqItem, 'whatsappLog', 'WhatsappLog', null);
                                        const status = normalizeStatus(getProp(reqItem, 'status', 'Status', 'PENDING'));

                                        return (
                                            <tr key={id} className="hover:bg-[#F7F5F2]/70 transition align-middle">
                                                <td className="py-4 px-5 font-semibold text-[#141210] max-w-[150px]">
                                                    {customerName}
                                                </td>
                                                <td className="py-4 px-4 text-[#2A2622] whitespace-nowrap num-tabular">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-[#B4562F]" />
                                                        <span className={phone === 'Guest' ? 'text-[#7C746B]' : 'text-[#141210]'}>{phone}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-[#141210] max-w-[230px]">
                                                    <span className="inline-flex items-start gap-1.5">
                                                        <Smartphone className="w-3.5 h-3.5 text-[#B4562F] shrink-0 mt-0.5" />
                                                        <span>{requestedItem}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-[#7C746B] whitespace-nowrap num-tabular">
                                                    {capturedOn}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    {waLog ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#22423A]/12 text-[#22423A]">
                                                            Contacted
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] italic text-[#7C746B]">
                                                            Not contacted
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <select
                                                        value={status}
                                                        disabled={updatingId === id}
                                                        onChange={(e) => handleStatusChange(id, e.target.value)}
                                                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border cursor-pointer focus:outline-none transition ${status === 'ARRANGED'
                                                                ? 'bg-[#22423A]/12 text-[#22423A] border-[#22423A]/25'
                                                                : 'bg-[#E9E3DB] text-[#141210] border-[#141210]/15'
                                                            }`}
                                                    >
                                                        <option value="PENDING">Pending (1-2 Days)</option>
                                                        <option value="ARRANGED">Arranged</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAiAlert(reqItem, id)}
                                                            disabled={alertingId === id}
                                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[11.5px] font-semibold bg-[#B4562F]/12 hover:bg-[#B4562F] text-[#B4562F] hover:text-white border border-[#B4562F]/25 transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            {alertingId === id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>AI Alert</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleWhatsAppContact(reqItem)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11.5px] font-semibold bg-[#22423A] hover:bg-[#141210] text-white transition cursor-pointer"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span>WhatsApp</span>
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

            {/* AI Sourcing Alert Modal */}
            {aiAlertModal && (
                <div
                    onClick={() => setAiAlertModal(null)}
                    className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white border border-[#141210]/10 rounded-[26px] max-w-md w-full p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[#141210]/10">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">1–2 Day Sourcing</span>
                                    <h3 className="text-sm font-semibold text-[#141210]">AI Sourcing Alert</h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiAlertModal(null)}
                                className="p-1.5 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#141210] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-xs space-y-2">
                            <p className="text-[#7C746B]">
                                Customer: <strong className="text-[#141210]">{aiAlertModal.customerName}</strong> • Item: <strong className="text-[#B4562F]">{aiAlertModal.requestedItem}</strong>
                            </p>
                            <p className="bg-[#F7F5F2] border border-[#141210]/8 p-4 rounded-2xl text-[#2A2622] leading-relaxed">
                                {aiAlertModal.alertText}
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setAiAlertModal(null)}
                                className="btn btn-primary px-5 py-2 rounded-full text-xs font-semibold cursor-pointer"
                            >
                                <span className="sheen"></span>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}