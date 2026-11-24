import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
    Database,
    ArrowLeft,
    Search,
    Smartphone,
    MapPin,
    Phone,
    CheckCircle2,
    Clock,
    Loader2,
    PackageSearch
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || 'PENDING').trim().toUpperCase();
    if (s === 'CONFIRMED' || s === 'APPROVED' || s === 'QUOTED' || s === 'ARRANGED') {
        return { label: s === 'QUOTED' ? 'QUOTED' : s === 'ARRANGED' ? 'ARRANGED' : 'CONFIRMED', tone: 'forest' };
    }
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'REJECTED') {
        return { label: s, tone: 'clay' };
    }
    return { label: 'PENDING', tone: 'clay' };
};

export default function OrderTrackingPortal({ onBackToStore }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            setError('Please enter a phone number or order ID.');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const res = await axiosInstance.get('/PreOrders/track', {
                params: { query: cleanQuery }
            });
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || (res.data ? [res.data] : []));
            setResults(list);
        } catch (err) {
            // Fallback client-side filtering if dedicated /PreOrders/track endpoint isn't exposed
            try {
                const preRes = await axiosInstance.get('/PreOrders');
                const preList = Array.isArray(preRes.data) ? preRes.data : (preRes.data?.data || []);
                const qLower = cleanQuery.toLowerCase();
                const digits = cleanQuery.replace(/[^0-9]/g, '');

                const matched = preList.filter((item) => {
                    const id = String(getProp(item, 'id', 'Id', '')).toLowerCase();
                    const orderNo = String(getProp(item, 'orderId', 'OrderId', '') || getProp(item, 'trackingCode', 'TrackingCode', '')).toLowerCase();
                    const phone = String(getProp(item, 'phone', 'Phone', '') || getProp(item, 'customerPhone', 'CustomerPhone', ''));
                    const phoneDigits = phone.replace(/[^0-9]/g, '');
                    const name = String(getProp(item, 'customerName', 'CustomerName', '')).toLowerCase();

                    return (
                        id === qLower ||
                        orderNo.includes(qLower) ||
                        name.includes(qLower) ||
                        (digits.length >= 6 && phoneDigits.includes(digits))
                    );
                });

                setResults(matched);
            } catch (fallbackErr) {
                console.error('Order tracking lookup failed:', fallbackErr);
                setResults([]);
                setError('Could not look up your order right now. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#141210]/10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-2.5">
                            <Database className="w-3.5 h-3.5" />
                            <span>Live Database Sync</span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.06] tracking-[-0.032em] font-semibold text-[#141210]">
                            Customer Order &amp; <span className="font-display italic text-[#B4562F]">Pre-Order Status.</span>
                        </h1>
                        <p className="text-[#7C746B] text-xs sm:text-sm mt-1">
                            Search using your Phone Number or Order ID to check live progress.
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

                {/* Search Card */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white border border-[#141210]/8 rounded-[26px] p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8"
                >
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#7C746B] absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Enter Phone Number (e.g. 03344336632) or Order ID..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition num-tabular"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                    >
                        <span className="sheen"></span>
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Track Order</span>
                    </button>
                </form>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-[#B4562F]/10 border border-[#B4562F]/25 text-[#B4562F] rounded-[20px] p-4 text-xs font-medium">
                        {error}
                    </div>
                )}

                {/* Results */}
                {loading ? (
                    <div className="bg-white border border-[#141210]/8 rounded-[26px] py-16 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                        <span>Checking live status...</span>
                    </div>
                ) : searched && results.length === 0 ? (
                    <div className="bg-white border border-[#141210]/8 rounded-[26px] py-16 px-6 text-center space-y-2">
                        <div className="w-11 h-11 rounded-full bg-[#F7F5F2] text-[#7C746B] flex items-center justify-center mx-auto">
                            <PackageSearch className="w-5 h-5" />
                        </div>
                        <h2 className="text-base font-semibold text-[#141210]">No matching records found</h2>
                        <p className="text-xs text-[#7C746B]">
                            Double-check your phone number or order ID and try again.
                        </p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {results.map((item, idx) => {
                            const id = getProp(item, 'id', 'Id', idx + 1);
                            const customerName = getProp(item, 'customerName', 'CustomerName', 'Customer');
                            const phone = getProp(item, 'phone', 'Phone', '') || getProp(item, 'customerPhone', 'CustomerPhone', '—');
                            const city = getProp(item, 'city', 'City', 'Islamabad');
                            const model = getProp(item, 'modelTitle', 'ModelTitle', '') || getProp(item, 'deviceModel', 'DeviceModel', '') || getProp(item, 'productTitle', 'ProductTitle', 'Device');
                            const notes = getProp(item, 'notes', 'Notes', '') || getProp(item, 'color', 'Color', '');
                            const statusInfo = normalizeStatus(getProp(item, 'status', 'Status', 'PENDING'));

                            return (
                                <div
                                    key={id}
                                    className="bg-white border border-[#141210]/8 rounded-[24px] p-6 space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#141210]/8">
                                        <div>
                                            <span className="text-[10.5px] uppercase tracking-[0.15em] text-[#7C746B] font-semibold block num-tabular">
                                                Order #{id}
                                            </span>
                                            <h3 className="text-base font-semibold text-[#141210] mt-0.5">
                                                {customerName}
                                            </h3>
                                        </div>

                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${statusInfo.tone === 'forest'
                                                    ? 'bg-[#22423A]/12 text-[#22423A]'
                                                    : 'bg-[#B4562F]/12 text-[#B4562F]'
                                                }`}
                                        >
                                            {statusInfo.tone === 'forest' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <Clock className="w-3.5 h-3.5" />
                                            )}
                                            <span>{statusInfo.label}</span>
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-xs text-[#2A2622]">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="w-3.5 h-3.5 text-[#B4562F]" />
                                            <span className="font-semibold text-[#141210]">{model}</span>
                                        </div>
                                        <div className="flex items-center gap-2 num-tabular">
                                            <Phone className="w-3.5 h-3.5 text-[#7C746B]" />
                                            <span>{phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-[#7C746B]" />
                                            <span>{city}</span>
                                        </div>
                                        {notes && (
                                            <p className="text-[11.5px] text-[#7C746B] pt-1">
                                                {notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
}