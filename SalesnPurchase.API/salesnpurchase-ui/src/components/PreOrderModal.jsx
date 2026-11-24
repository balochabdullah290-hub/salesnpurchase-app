import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
    Sparkles,
    X,
    User,
    Phone,
    MapPin,
    FileText,
    CheckCircle2,
    Loader2
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

export default function PreOrderModal({
    product,
    selectedColor = '',
    onClose,
    onSuccess
}) {
    const title = getProp(product, 'title', 'Title', 'Flagship Device');
    const productId = getProp(product, 'id', 'Id', null);
    const finish =
        selectedColor ||
        getProp(product, 'color', 'Color', '') ||
        getProp(product, 'selectedColor', 'SelectedColor', 'Space Black');

    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const validatePhone = (rawPhone) => {
        const cleaned = String(rawPhone || '').replace(/[\s-]/g, '');
        return /^03\d{9}$/.test(cleaned) || /^\+923\d{9}$/.test(cleaned);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerName.trim() || !phone.trim() || !city.trim()) {
            setError('Please fill in your full name, WhatsApp phone number, and city.');
            return;
        }

        if (!validatePhone(phone)) {
            setError('Please enter a valid Pakistani WhatsApp phone number (e.g., 03001234567).');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const payload = {
                productId,
                modelTitle: title,
                color: finish,
                customerName: customerName.trim(),
                phone: phone.trim(),
                city: city.trim(),
                notes: notes.trim()
            };

            const res = await axiosInstance.post('/PreOrders', payload);
            const created = res.data?.data || res.data || payload;
            setSubmittedOrder(created);
            onSuccess?.(created);
        } catch (err) {
            console.error('Failed to submit pre-order:', err);
            setError(
                err.response?.data?.message ||
                'Could not confirm your pre-booking right now. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
            className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
            <div className="bg-white border border-[#141210]/10 rounded-[26px] max-w-md w-full p-6 sm:p-8 relative shadow-2xl text-[#141210] space-y-5 my-auto">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Pre-Order Modal"
                    className="absolute top-4 right-4 p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] transition cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {submittedOrder ? (
                    <div className="py-5 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-[#22423A]/12 text-[#22423A] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#22423A] block">
                                Pre-Booking Confirmed
                            </span>
                            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#141210]">
                                {title} <span className="font-display italic text-[#B4562F]">Reserved.</span>
                            </h2>
                            <p className="text-xs text-[#7C746B] leading-relaxed">
                                We have logged your reservation for <strong className="text-[#141210]">{finish}</strong> in <strong className="text-[#141210]">{city}</strong>. Our team will reach out on WhatsApp shortly.
                            </p>
                        </div>

                        {(getProp(submittedOrder, 'id', 'Id', null) || getProp(submittedOrder, 'orderId', 'OrderId', null)) && (
                            <div className="bg-[#F7F5F2] border border-[#141210]/10 rounded-[18px] px-4 py-2.5 text-xs text-[#2A2622] num-tabular">
                                Tracking ID: <strong className="text-[#141210]">#{getProp(submittedOrder, 'orderId', 'OrderId', null) || getProp(submittedOrder, 'id', 'Id', '')}</strong>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-primary w-full py-3 px-6 rounded-2xl text-xs font-semibold cursor-pointer"
                            >
                                <span className="sheen"></span>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="space-y-2 pr-8">
                            <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.16em]">
                                <Sparkles className="w-3 h-3" />
                                <span>Reserve Device</span>
                            </div>

                            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#141210] leading-tight">
                                {title}
                            </h2>

                            <p className="text-xs text-[#7C746B]">
                                Selected Finish:{' '}
                                <span className="font-semibold text-[#B4562F]">{finish}</span>
                            </p>
                        </div>

                        {/* Error Notice */}
                        {error && (
                            <div className="p-3 rounded-2xl bg-[#B4562F]/10 border border-[#B4562F]/25 text-[#B4562F] text-xs font-medium">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="text-[11px] font-semibold text-[#2A2622] flex items-center gap-1.5 mb-1.5">
                                    <User className="w-3.5 h-3.5 text-[#B4562F]" />
                                    <span>Your Full Name *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Ali Ahmed"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl px-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-[#2A2622] flex items-center gap-1.5 mb-1.5">
                                    <Phone className="w-3.5 h-3.5 text-[#22423A]" />
                                    <span>WhatsApp Phone Number *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 03001234567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl px-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition num-tabular"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-[#2A2622] flex items-center gap-1.5 mb-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-[#B4562F]" />
                                    <span>City *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Islamabad / Rawalpindi"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl px-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-[#2A2622] flex items-center gap-1.5 mb-1.5">
                                    <FileText className="w-3.5 h-3.5 text-[#7C746B]" />
                                    <span>Special Notes / Storage Pref. (Optional)</span>
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="e.g. 256GB preference, preferred pickup date"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl px-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary w-full py-3.5 px-6 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <span className="sheen"></span>
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{submitting ? 'Confirming...' : 'Confirm Pre-Booking'}</span>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}