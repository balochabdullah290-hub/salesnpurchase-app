import React from 'react';
import { X, Smartphone, ShieldCheck, Battery, Cpu, HardDrive, Tag } from 'lucide-react';

// Helper function to extract correct PTA badge status
function getDeviceBadge(product) {
    const rawPta = String(
        product?.ptaStatus ??
        product?.PtaStatus ??
        product?.PTAStatus ??
        product?.pta ??
        product?.PTA ??
        ''
    ).toLowerCase();

    const title = String(product?.title || product?.Title || '').toLowerCase();
    const description = String(product?.description || product?.Description || '').toLowerCase();
    const category = String(product?.category || product?.Category || '').toLowerCase();

    const combinedText = `${rawPta} ${title} ${description} ${category}`.toLowerCase();

    // 1. Check for JV
    if (combinedText.includes('jv') || combinedText.includes('joint venture')) {
        return { label: 'JV', color: 'text-[#2A2622]' };
    }

    // 2. Check for Non-PTA
    if (
        combinedText.includes('non pta') ||
        combinedText.includes('non-pta') ||
        combinedText.includes('nonpta') ||
        rawPta.includes('non')
    ) {
        return { label: 'Non-PTA', color: 'text-[#B4562F]' };
    }

    // 3. Check for PTA Approved
    if (
        combinedText.includes('pta approved') ||
        combinedText.includes('pta-approved') ||
        combinedText.includes('official pta') ||
        rawPta.includes('approved') ||
        rawPta === 'pta'
    ) {
        return { label: 'PTA Approved', color: 'text-[#22423A]' };
    }

    if (rawPta && !rawPta.includes('non')) {
        return { label: 'PTA Approved', color: 'text-[#22423A]' };
    }

    return { label: 'PTA Approved', color: 'text-[#22423A]' };
}

// Helper function to extract battery health
function getBatteryHealth(product) {
    const rawBattery = product?.batteryHealth ?? product?.BatteryHealth ?? product?.battery ?? product?.Battery;
    if (rawBattery) return String(rawBattery);

    const text = `${product?.description || product?.Description || ''} ${product?.title || product?.Title || ''}`.toLowerCase();
    const healthMatch = text.match(/(\d{2})\s*(?:%|pct)?\s*health/i) || text.match(/battery\D*(\d{2})/i) || text.match(/(\d{2})\s*%/i);

    if (healthMatch && healthMatch[1]) {
        return `${healthMatch[1]}%`;
    }

    return 'Verified';
}

export default function CompareModal({ comparedProducts, onClose, onRemoveProduct }) {
    if (!comparedProducts || comparedProducts.length === 0) return null;

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
            <div className="bg-white border border-[#141210]/10 rounded-[26px] max-w-5xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-[#141210]">
                <div className="flex items-center justify-between border-b border-[#141210]/10 pb-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#141210]">
                                Model <span className="font-display italic text-[#B4562F]">Comparison.</span>
                            </h2>
                            <p className="text-xs text-[#7C746B]">Side-by-side specification and pricing breakdown</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Comparison Grid Columns */}
                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(comparedProducts.length, 3)} gap-4`}>
                    {comparedProducts.map((p) => {
                        const title = p?.title || p?.Title || 'iPhone Model';
                        const price = p?.pricePKR ?? p?.PricePKR ?? 0;
                        const storage = p?.storage || p?.Storage || 'Standard';
                        const ptaBadge = getDeviceBadge(p);
                        const desc = p?.description || p?.Description || '';
                        const batteryHealth = getBatteryHealth(p);

                        return (
                            <div key={p.id || p.Id} className="bg-[#F7F5F2] border border-[#141210]/10 rounded-[22px] p-5 flex flex-col justify-between space-y-4 relative">
                                <button
                                    type="button"
                                    onClick={() => onRemoveProduct(p.id || p.Id)}
                                    className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-[#B4562F]/10 text-[#B4562F] hover:bg-[#B4562F] hover:text-white transition cursor-pointer"
                                    title="Remove from comparison"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-[#141210] pr-7">{title}</h3>

                                    <div className="space-y-2 text-xs divide-y divide-[#141210]/10">
                                        <div className="pt-2 flex justify-between items-center gap-2">
                                            <span className="text-[#7C746B] flex items-center gap-1.5 font-medium"><Tag className="w-3.5 h-3.5 text-[#B4562F]" /> Price</span>
                                            <span className="font-semibold text-[#B4562F] num-tabular">{price > 0 ? `PKR ${price.toLocaleString()}` : 'Pre-Booking Open'}</span>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center gap-2">
                                            <span className="text-[#7C746B] flex items-center gap-1.5 font-medium"><HardDrive className="w-3.5 h-3.5 text-[#22423A]" /> Storage</span>
                                            <span className="font-semibold text-[#141210] num-tabular">{storage}</span>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center gap-2">
                                            <span className="text-[#7C746B] flex items-center gap-1.5 font-medium"><ShieldCheck className="w-3.5 h-3.5 text-[#22423A]" /> PTA Status</span>
                                            <span className={`font-semibold ${ptaBadge.color}`}>{ptaBadge.label}</span>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center gap-2">
                                            <span className="text-[#7C746B] flex items-center gap-1.5 font-medium"><Cpu className="w-3.5 h-3.5 text-[#B4562F]" /> Display &amp; Hz</span>
                                            <span className="font-semibold text-[#2A2622] text-right">Super Retina XDR (120Hz ProMotion)</span>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center gap-2">
                                            <span className="text-[#7C746B] flex items-center gap-1.5 font-medium"><Battery className="w-3.5 h-3.5 text-[#22423A]" /> Battery Health</span>
                                            <span className="font-semibold text-[#22423A] num-tabular">{batteryHealth}</span>
                                        </div>
                                    </div>

                                    {desc && (
                                        <p className="text-[11px] text-[#7C746B] line-clamp-3 pt-2 border-t border-[#141210]/10 leading-relaxed">{desc}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-2 text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-primary font-semibold px-6 py-2.5 rounded-full text-xs cursor-pointer"
                    >
                        <span className="sheen"></span>
                        Close Comparison
                    </button>
                </div>
            </div>
        </div>
    );
}