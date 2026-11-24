import React from 'react';
import {
    Sparkles,
    Smartphone,
    Zap,
    ShieldCheck,
    MapPin,
    Award,
    ArrowDown
} from 'lucide-react';

const HIGHLIGHTS = [
    {
        icon: ShieldCheck,
        accentClass: 'bg-[#22423A]/12 text-[#22423A]',
        title: '100% Verified Hardware',
        description:
            'Every device undergoes multi-point inspection including battery health, original display verification, and PTA DIRBS clearance.'
    },
    {
        icon: MapPin,
        accentClass: 'bg-[#B4562F]/12 text-[#B4562F]',
        title: 'Safe Face-to-Face Deals',
        description:
            'Meet us directly at top hubs in Islamabad (F-7, I-8) & Rawalpindi for on-the-spot verification before paying.'
    },
    {
        icon: Award,
        accentClass: 'bg-[#141210]/10 text-[#141210]',
        title: 'Transparent Price & PTA Tax',
        description:
            'No hidden surprises. Calculate official FBR duties instantly with our live PTA calculator portal before buying.'
    }
];

export default function CinematicHero({ onExploreClick, onOpenTradeIn }) {
    return (
        <section className="relative overflow-hidden bg-[#F7F5F2] text-[#141210] pt-12 sm:pt-16 pb-6">
            {/* Subtle Ambient Warm Glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[780px] h-[360px] rounded-full bg-[#B4562F]/8 blur-3xl"
            />

            <div className="relative max-w-[1240px] mx-auto px-5 sm:px-8">
                {/* Centered Editorial Hero */}
                <div className="max-w-3xl mx-auto text-center space-y-5">
                    <div className="inline-flex items-center gap-2 bg-white border border-[#141210]/12 text-[#B4562F] px-4 py-1.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.16em]">
                        <Sparkles className="w-3.5 h-3.5 text-[#B4562F]" />
                        <span>Pakistan&apos;s #1 Verified Apple Flagship Hub</span>
                    </div>

                    <h1 className="text-[clamp(2.4rem,5.5vw,4.35rem)] leading-[1.03] tracking-[-0.035em] font-semibold text-[#141210]">
                        Experience Tech{' '}
                        <span className="font-display italic font-normal text-[#B4562F]">
                            Without Compromise.
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#7C746B] leading-relaxed">
                        Verified PTA status inventory, instant face-to-face meetups in Islamabad &amp; Rawalpindi, and live order tracking built for flagship enthusiasts.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onExploreClick}
                            className="btn btn-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold cursor-pointer"
                        >
                            <span className="sheen"></span>
                            <Smartphone className="w-4 h-4" />
                            <span>Explore Verified Listings</span>
                            <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenTradeIn}
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold bg-white hover:bg-[#E9E3DB] text-[#141210] border border-[#141210]/15 transition cursor-pointer"
                        >
                            <Zap className="w-4 h-4 text-[#B4562F]" />
                            <span>Sell or Trade-In Device</span>
                        </button>
                    </div>
                </div>

                {/* 3 Trust Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-12 sm:mt-14">
                    {HIGHLIGHTS.map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                            <div
                                key={idx}
                                className="bg-white border border-[#141210]/8 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[#141210]/20 transition"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.accentClass}`}>
                                    <IconComponent className="w-4 h-4" />
                                </div>

                                <div className="space-y-1.5">
                                    <h2 className="text-base font-semibold tracking-[-0.02em] text-[#141210]">
                                        {item.title}
                                    </h2>
                                    <p className="text-xs sm:text-[13px] text-[#7C746B] leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}