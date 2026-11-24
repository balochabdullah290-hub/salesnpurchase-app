import React, { useState } from 'react';
import { MessageCircle, X, Send, ShieldCheck, Smartphone, User, Phone, MapPin } from 'lucide-react';

export default function WhatsAppOrderModal({ product, isOpen, onClose }) {
    if (!isOpen || !product) return null;

    // Extract product details safely
    const title = product.title || product.Title || 'Apple Device';
    const storage = product.storage || product.Storage || '128GB';
    const pricePKR = product.pricePKR || product.PricePKR || 0;
    const category = product.category || product.Category || 'iPhone';

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [city, setCity] = useState('');
    const [ptaStatus, setPtaStatus] = useState('PTA Approved');
    const [notes, setNotes] = useState('');

    const shopWhatsAppNumber = '923001234567'; // Replace with your actual shop WhatsApp number (e.g. 923... without +)

    const handleSendWhatsAppOrder = (e) => {
        e.preventDefault();

        if (!customerName || !customerPhone || !city) {
            alert('Please fill in your Name, Phone Number, and City.');
            return;
        }

        // Format clean WhatsApp order message
        const message = encodeURIComponent(
            `🛒 *NEW WHATSAPP ORDER / INQUIRY* \n\n` +
            `📱 *Device:* ${title}\n` +
            `💾 *Storage:* ${storage}\n` +
            `🏷️ *Category:* ${category}\n` +
            `💰 *Price:* ${pricePKR > 0 ? `PKR ${Number(pricePKR).toLocaleString()}` : 'Pre-Booking / Call for Price'}\n` +
            `🛡️ *PTA Status:* ${ptaStatus}\n\n` +
            `👤 *Customer Name:* ${customerName}\n` +
            `📞 *Phone:* ${customerPhone}\n` +
            `📍 *City:* ${city}\n` +
            `${notes ? `📝 *Notes:* ${notes}\n\n` : '\n'}` +
            `_Sent via SalesnPurchase Web Portal_`
        );

        window.open(`https://wa.me/${shopWhatsAppNumber}?text=${message}`, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-[#121824] border border-slate-800/80 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-6 text-slate-100 my-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Instant WhatsApp Checkout</h2>
                            <p className="text-[11px] text-slate-400">Complete details to send your order directly via WhatsApp.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-xl transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Product Summary Box */}
                <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                    <div className="space-y-1">
                        <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold px-2 py-0.5 rounded-full uppercase">
                            {category}
                        </span>
                        <h3 className="text-white font-extrabold text-sm mt-1">{title}</h3>
                        <p className="text-slate-400 text-xs">{storage}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Price</span>
                        <span className="text-amber-400 font-mono font-black text-sm">
                            {pricePKR > 0 ? `PKR ${Number(pricePKR).toLocaleString()}` : 'Pre-Booking'}
                        </span>
                    </div>
                </div>

                {/* Order Form */}
                <form onSubmit={handleSendWhatsAppOrder} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                                <User className="w-3 h-3 text-amber-400" /> Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Abdullah Arif"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-amber-400" /> WhatsApp Number *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="e.g. 03001234567"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 shadow-inner font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-400" /> Delivery City *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Islamabad / Rawalpindi"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-amber-400" /> PTA Status Preference
                            </label>
                            <select
                                value={ptaStatus}
                                onChange={(e) => setPtaStatus(e.target.value)}
                                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                            >
                                <option value="PTA Approved">PTA Approved</option>
                                <option value="Non-PTA">Non-PTA</option>
                                <option value="CPID / Box Packed">CPID / Box Packed</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Additional Notes / Color Choice (Optional)</label>
                        <textarea
                            rows="2"
                            placeholder="Mention color preference or specific questions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 shadow-inner resize-none"
                        ></textarea>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <Send className="w-4 h-4" />
                            <span>Send Order via WhatsApp</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}