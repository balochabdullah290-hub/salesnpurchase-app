import React, { useMemo } from 'react';
import {
    Check,
    MessageSquare,
    CalendarPlus,
    CheckCircle2,
    BatteryCharging,
    PackageCheck,
    ShieldCheck
} from 'lucide-react';

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const detectPtaBadge = (product, title, description) => {
    const rawPta = String(
        getProp(product, 'ptaStatus', 'PtaStatus', '') ||
        getProp(product, 'pta', 'Pta', '') ||
        ''
    ).trim();

    const combined = `${rawPta} ${title} ${description}`.toLowerCase();
    const clean = combined.replace(/[^a-z0-9]/g, '');

    if (clean.includes('nonpta') || combined.includes('non pta')) {
        return { label: 'NON-PTA', tone: 'clay' };
    }
    if (combined.includes('jv') || combined.includes('joint venture') || clean.includes('jointventure')) {
        return { label: 'JV', tone: 'ink' };
    }
    if (rawPta) {
        return { label: rawPta.toUpperCase(), tone: 'forest' };
    }
    return null;
};

const extractHighlights = (description, product) => {
    const text = String(description || '');
    const lower = text.toLowerCase();

    const explicitBattery =
        getProp(product, 'batteryHealth', 'BatteryHealth', null) ??
        getProp(product, 'battery', 'Battery', null);

    let batteryLabel = '';
    if (explicitBattery !== null && explicitBattery !== '') {
        const num = String(explicitBattery).replace('%', '').trim();
        batteryLabel = num ? `${num}% Battery` : '';
    } else {
        const match = lower.match(/(\d{2,3})\s*%?\s*(?:health|bh|\b)/);
        if (match && Number(match[1]) >= 50 && Number(match[1]) <= 100) {
            batteryLabel = `${match[1]}% Battery`;
        }
    }

    const pills = [];
    if (batteryLabel) {
        pills.push({ type: 'battery', text: batteryLabel });
    }
    if (lower.includes('with box') || lower.includes('box')) {
        pills.push({ type: 'box', text: 'With Box' });
    } else if (lower.includes('waterpack')) {
        pills.push({ type: 'box', text: 'Waterpack' });
    } else if (lower.includes('non active') || lower.includes('non-active')) {
        pills.push({ type: 'box', text: 'Non-Active' });
    }

    return pills.slice(0, 2);
};

export default function ProductCard({
    product,
    isCompared = false,
    onToggleCompare,
    onBuyWhatsApp,
    onOpenPreOrder
}) {
    const title = getProp(product, 'title', 'Title', 'Flagship Device');
    const description = getProp(product, 'description', 'Description', '');
    const storage = getProp(product, 'storage', 'Storage', '') || getProp(product, 'capacity', 'Capacity', '');
    const category = String(getProp(product, 'category', 'Category', '') || '').toLowerCase();
    const pricePKR = Number(getProp(product, 'pricePKR', 'PricePKR', 0) ?? getProp(product, 'pricePkr', 'PricePkr', 0));
    const isPreBooking =
        Boolean(getProp(product, 'isPreBooking', 'IsPreBooking', false)) ||
        category.includes('prebooking') ||
        category.includes('preorder') ||
        pricePKR <= 0;

    const imageUrl =
        getProp(product, 'imageUrl', 'ImageUrl', '') ||
        getProp(product, 'thumbnailUrl', 'ThumbnailUrl', '') ||
        '';

    const ptaBadge = useMemo(
        () => detectPtaBadge(product, title, description),
        [product, title, description]
    );

    const highlights = useMemo(
        () => extractHighlights(description, product),
        [description, product]
    );

    const badgeClass =
        ptaBadge?.tone === 'clay'
            ? 'bg-[#B4562F] text-white'
            : ptaBadge?.tone === 'forest'
                ? 'bg-[#22423A] text-white'
                : 'bg-[#141210] text-white';

    return (
        <article className="bg-white border border-[#141210]/8 rounded-[26px] p-5 sm:p-6 flex flex-col justify-between space-y-5 hover:border-[#141210]/20 hover:shadow-md transition-all duration-300 group">
            {/* Top Showcase Stage */}
            <div className="space-y-4">
                <div className="relative h-52 rounded-[20px] bg-[#F7F5F2] border border-[#141210]/8 overflow-hidden flex items-center justify-center p-4">
                    {/* Top-Left PTA / JV Badge */}
                    {ptaBadge && (
                        <span
                            className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}
                        >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{ptaBadge.label}</span>
                        </span>
                    )}

                    {/* Top-Right Compare Toggle */}
                    <button
                        type="button"
                        onClick={() => onToggleCompare?.(product)}
                        className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${isCompared
                                ? 'bg-[#141210] text-white border-[#141210]'
                                : 'bg-white/95 text-[#2A2622] border-[#141210]/15 hover:border-[#141210]'
                            }`}
                    >
                        <span
                            className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${isCompared
                                    ? 'bg-[#B4562F] border-[#B4562F] text-white'
                                    : 'border-[#141210]/30 bg-white'
                                }`}
                        >
                            {isCompared && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span>Compare</span>
                    </button>

                    {/* Device Image */}
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                            <span className="w-14 h-14 rounded-full bg-[#E9E3DB] border border-[#141210]/10 flex items-center justify-center text-xs font-semibold text-[#2A2622]">
                                {storage || 'iPhone'}
                            </span>
                            <span className="text-[11px] font-medium text-[#7C746B]">
                                {title}
                            </span>
                        </div>
                    )}
                </div>

                {/* Title & Storage */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#141210] leading-snug">
                        {title}
                    </h3>
                    {storage && (
                        <span className="px-2.5 py-1 rounded-full bg-[#F7F5F2] border border-[#141210]/10 text-[10.5px] font-semibold text-[#2A2622] shrink-0 num-tabular">
                            {storage}
                        </span>
                    )}
                </div>

                {/* Quick Highlight Pills */}
                {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {highlights.map((pill, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F7F5F2] border border-[#141210]/8 text-[11px] font-medium text-[#2A2622] num-tabular"
                            >
                                {pill.type === 'battery' ? (
                                    <BatteryCharging className="w-3 h-3 text-[#22423A]" />
                                ) : (
                                    <PackageCheck className="w-3 h-3 text-[#B4562F]" />
                                )}
                                <span>{pill.text}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                {description && (
                    <p className="text-xs text-[#7C746B] leading-relaxed line-clamp-2">
                        {description}
                    </p>
                )}

                {/* Availability Pill */}
                <div>
                    {isPreBooking ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#B4562F]/12 text-[#B4562F]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pre-Order Available · Islamabad / Rawalpindi</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#22423A]/12 text-[#22423A]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In Stock · Ready for Meetup</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom Price & CTA */}
            <div className="pt-4 border-t border-[#141210]/8 flex items-center justify-between gap-3">
                <div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">
                        Price
                    </span>
                    {isPreBooking ? (
                        <span className="text-sm sm:text-base font-semibold text-[#141210]">
                            Pre-Booking Open
                        </span>
                    ) : (
                        <span className="text-base sm:text-lg font-semibold text-[#141210] num-tabular">
                            PKR {pricePKR.toLocaleString()}
                        </span>
                    )}
                </div>

                {isPreBooking ? (
                    <button
                        type="button"
                        onClick={() => onOpenPreOrder?.(product)}
                        className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                    >
                        <span className="sheen"></span>
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Pre-Book</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            onBuyWhatsApp?.(
                                `${title}${storage ? ` (${storage})` : ''}${ptaBadge ? ` - ${ptaBadge.label}` : ''}`,
                                pricePKR
                            )
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#22423A] hover:bg-[#141210] text-white transition cursor-pointer shrink-0"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Deal</span>
                    </button>
                )}
            </div>
        </article>
    );
}