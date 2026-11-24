import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance, { getStoredToken, clearStoredTokens } from '../api/axiosInstance';
import {
    CalendarCheck,
    Phone,
    MapPin,
    Smartphone,
    MessageSquare,
    Trash2,
    Download,
    RefreshCw,
    Clock,
    CheckCircle2,
    Loader2
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || 'PENDING').trim().toUpperCase();
    if (s === 'CONFIRMED' || s === 'APPROVED') return 'CONFIRMED';
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'REJECTED') return 'CANCELLED';
    return 'PENDING';
};

export default function AdminPreOrders() {
    const [preOrders, setPreOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const handleAuthError = useCallback(() => {
        alert("Session expired. Please log in again.");
        clearStoredTokens();
        window.location.href = '/login';
    }, []);

    const loadPreOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/PreOrders');
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setPreOrders(list);
        } catch (err) {
            console.error("Failed to load pre-orders:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                setPreOrders([]);
            }
        } finally {
            setLoading(false);
        }
    }, [handleAuthError]);

    useEffect(() => {
        loadPreOrders();
    }, [loadPreOrders]);

    const handleStatusChange = async (id, nextStatus) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        setUpdatingId(id);
        try {
            await axiosInstance.put(`/PreOrders/${id}/status`, { status: nextStatus });
            setPreOrders(prev =>
                prev.map(item => {
                    const itemId = getProp(item, 'id', 'Id', null);
                    if (itemId !== id) return item;
                    return { ...item, status: nextStatus, Status: nextStatus };
                })
            );
        } catch (err) {
            console.error("Failed to update pre-order status:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to update status.");
                await loadPreOrders();
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (!getStoredToken()) {
            handleAuthError();
            return;
        }

        if (!window.confirm("Are you sure you want to delete this pre-order?")) return;

        setDeletingId(id);
        try {
            await axiosInstance.delete(`/PreOrders/${id}`);
            setPreOrders(prev => prev.filter(item => getProp(item, 'id', 'Id', null) !== id));
        } catch (err) {
            console.error("Failed to delete pre-order:", err);
            if (err.response?.status === 401) {
                handleAuthError();
            } else {
                alert(err.response?.data?.message || "Failed to delete pre-order.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleWhatsAppContact = async (order) => {
        const id = getProp(order, 'id', 'Id', null);
        const customerName = getProp(order, 'customerName', 'CustomerName', 'Customer');
        const phone = String(getProp(order, 'phone', 'Phone', '') || '').replace(/[^0-9]/g, '');
        const model = getProp(order, 'modelTitle', 'ModelTitle', '') || getProp(order, 'productTitle', 'ProductTitle', 'Device');
        const city = getProp(order, 'city', 'City', '');

        if (phone) {
            const normalizedPhone = phone.startsWith('0') ? `92${phone.slice(1)}` : phone;
            const message = encodeURIComponent(
                `Hello ${customerName}, this is SalesnPurchase regarding your pre-order for ${model}${city ? ` (${city})` : ''}.`
            );
            window.open(`https://wa.me/${normalizedPhone}?text=${message}`, '_blank');
        }

        if (id && getStoredToken()) {
            try {
                await axiosInstance.post(`/PreOrders/${id}/whatsapp-log`);
                setPreOrders(prev =>
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

    const exportToCSV = () => {
        if (preOrders.length === 0) {
            alert("No pre-orders available to export.");
            return;
        }

        const headers = ["ID", "Customer", "Phone", "City", "Model", "Notes", "Status"];
        const rows = preOrders.map(o => [
            getProp(o, 'id', 'Id', ''),
            `"${String(getProp(o, 'customerName', 'CustomerName', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(o, 'phone', 'Phone', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(o, 'city', 'City', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(o, 'modelTitle', 'ModelTitle', '') || getProp(o, 'productTitle', 'ProductTitle', '')).replace(/"/g, '""')}"`,
            `"${String(getProp(o, 'notes', 'Notes', '') || getProp(o, 'color', 'Color', '')).replace(/"/g, '""')}"`,
            normalizeStatus(getProp(o, 'status', 'Status', 'PENDING'))
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `SalesnPurchase_PreOrders_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalCount = preOrders.length;
    const pendingCount = preOrders.filter(o => normalizeStatus(getProp(o, 'status', 'Status', 'PENDING')) === 'PENDING').length;
    const confirmedCount = preOrders.filter(o => normalizeStatus(getProp(o, 'status', 'Status', 'PENDING')) === 'CONFIRMED').length;

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>Reservations Portal</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Customer <span className="font-display italic text-[#B4562F]">Pre-Orders.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            Real-time device reservations and booking leads
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
                            onClick={loadPreOrders}
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
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">Total Pre-Orders</span>
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
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#22423A] font-semibold block">Confirmed Bookings</span>
                            <span className="text-3xl font-semibold text-[#22423A] mt-1.5 block num-tabular">{confirmedCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-[#22423A]/12 text-[#22423A] flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Pre-Orders Table Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] overflow-hidden">
                    {loading ? (
                        <div className="py-16 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                            <span>Loading pre-orders...</span>
                        </div>
                    ) : preOrders.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[#7C746B]">
                            No customer pre-orders found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F7F5F2] border-b border-[#141210]/10 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#7C746B]">
                                        <th className="py-4 px-5">Customer</th>
                                        <th className="py-4 px-4">Phone / WhatsApp</th>
                                        <th className="py-4 px-4">City</th>
                                        <th className="py-4 px-4">Model</th>
                                        <th className="py-4 px-4">Notes</th>
                                        <th className="py-4 px-4">WhatsApp Log</th>
                                        <th className="py-4 px-4">Status</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#141210]/8 text-xs">
                                    {preOrders.map((order, idx) => {
                                        const id = getProp(order, 'id', 'Id', idx);
                                        const customerName = getProp(order, 'customerName', 'CustomerName', 'Customer');
                                        const phone = getProp(order, 'phone', 'Phone', '—');
                                        const city = getProp(order, 'city', 'City', '—');
                                        const model = getProp(order, 'modelTitle', 'ModelTitle', '') || getProp(order, 'productTitle', 'ProductTitle', '—');
                                        const color = getProp(order, 'color', 'Color', '');
                                        const notes = getProp(order, 'notes', 'Notes', '') || (color ? `Color finish: ${color}` : '—');
                                        const waLog = getProp(order, 'whatsappContactedAt', 'WhatsappContactedAt', null) || getProp(order, 'whatsappLog', 'WhatsappLog', null);
                                        const status = normalizeStatus(getProp(order, 'status', 'Status', 'PENDING'));

                                        return (
                                            <tr key={id} className="hover:bg-[#F7F5F2]/70 transition align-middle">
                                                <td className="py-4 px-5 font-semibold text-[#141210] whitespace-nowrap">
                                                    {customerName}
                                                </td>
                                                <td className="py-4 px-4 text-[#2A2622] whitespace-nowrap num-tabular">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-[#B4562F]" />
                                                        {phone}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-[#2A2622] whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[#7C746B]">
                                                        <MapPin className="w-3.5 h-3.5 text-[#7C746B]" />
                                                        <span className="text-[#141210]">{city}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-[#141210] max-w-[150px]">
                                                    <span className="inline-flex items-start gap-1.5">
                                                        <Smartphone className="w-3.5 h-3.5 text-[#B4562F] shrink-0 mt-0.5" />
                                                        <span>{model}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-[#7C746B] max-w-[220px]">
                                                    {notes}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    {waLog ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#22423A]/12 text-[#22423A]">
                                                            Contacted
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] italic text-[#7C746B] block leading-tight">
                                                            Not<br />contacted
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <select
                                                        value={status}
                                                        disabled={updatingId === id}
                                                        onChange={(e) => handleStatusChange(id, e.target.value)}
                                                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border cursor-pointer focus:outline-none transition ${status === 'CONFIRMED'
                                                                ? 'bg-[#22423A]/12 text-[#22423A] border-[#22423A]/25'
                                                                : status === 'CANCELLED'
                                                                    ? 'bg-[#B4562F]/12 text-[#B4562F] border-[#B4562F]/25'
                                                                    : 'bg-[#E9E3DB] text-[#141210] border-[#141210]/15'
                                                            }`}
                                                    >
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="CONFIRMED">CONFIRMED</option>
                                                        <option value="CANCELLED">CANCELLED</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleWhatsAppContact(order)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11.5px] font-semibold bg-[#22423A] hover:bg-[#141210] text-white transition cursor-pointer"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span>WhatsApp</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(id)}
                                                            disabled={deletingId === id}
                                                            title="Delete Pre-Order"
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
        </div>
    );
}