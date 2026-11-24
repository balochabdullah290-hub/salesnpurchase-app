import React, { useEffect, useState, useRef } from 'react';
import axiosInstance, { fetchProducts, getWhatsAppLink, getStoredToken, clearStoredTokens } from './api/axiosInstance';
import ProductCard from './components/ProductCard';
import AdminAuthModal from './components/AdminAuthModal';
import PreOrderModal from './components/PreOrderModal';
import TradeInModal from './components/TradeInModal';
import AdminPreOrders from './components/AdminPreOrders';
import AdminProducts from './components/AdminProducts';
import AdminTradeIns from './components/AdminTradeIns';
import AdminStockRequests from './components/AdminStockRequests';
import AdminInvoices from './components/AdminInvoices';
import PtaCalculatorPortal from './components/PtaCalculatorPortal';
import OrderTrackingPortal from './components/OrderTrackingPortal';
import CompareModal from './components/CompareModal';
import CinematicHero from './components/CinematicHero';
import ChatbotWidget from './components/ChatbotWidget';

import {
    LayoutDashboard,
    LogOut,
    RefreshCw,
    Search,
    SlidersHorizontal,
    X,
    ArrowUpDown,
    Star,
    CheckCircle2,
    Calculator,
    Truck,
    Layers,
    Sparkles,
    Loader2
} from 'lucide-react';

const CATEGORIES = [
    { id: '', label: 'All Products' },
    { id: 'iPhones', label: 'iPhones' },
    { id: 'PreBooking', label: 'Pre-Booking' },
    { id: 'AppleSmartwatch', label: 'Smartwatches' },
    { id: 'AirPodsCopy', label: 'AirPods & Audio' },
    { id: 'AppleCableAdapter', label: 'Accessories' }
];

const TESTIMONIALS = [
    {
        name: 'Usman Tariq',
        city: 'Islamabad',
        device: 'iPhone 14 Pro Max',
        comment: 'Super smooth face-to-face deal in F-7. Verified PTA approved on the spot. Highly professional service!',
        rating: 5
    },
    {
        name: 'Hamza Chaudhry',
        city: 'Rawalpindi',
        device: 'iPhone 13 Pro',
        comment: 'Traded in my old phone through their wizard and got an amazing valuation. Picked up the new one the same day.',
        rating: 5
    },
    {
        name: 'Bilal Ahmed',
        city: 'Islamabad',
        device: 'iPhone 15 Pro',
        comment: 'Cleanest inventory in town. The 3D viewer gave me exact confidence before finalizing on WhatsApp.',
        rating: 5
    }
];

export default function App() {
    const [view, setView] = useState('store'); // 'store' | 'admin' | 'calculator' | 'tracker'
    const [adminTab, setAdminTab] = useState('preorders');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showTradeInModal, setShowTradeInModal] = useState(false);

    // Daily AI Summary States
    const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [dailySummaryData, setDailySummaryData] = useState(null);
    const [summaryError, setSummaryError] = useState('');

    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [activePreOrder, setActivePreOrder] = useState(null);

    // Compare States
    const [compareList, setCompareList] = useState([]);
    const [showCompareModal, setShowCompareModal] = useState(false);

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [ptaFilter, setPtaFilter] = useState('');
    const [sortByPrice, setSortByPrice] = useState('');

    // Catalog Scroll Ref
    const catalogRef = useRef(null);

    useEffect(() => {
        const token = getStoredToken();
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchProducts()
            .then((res) => {
                setProducts(res || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to connect to .NET API:", err);
                setLoading(false);
            });
    }, [view]);

    const handleScrollToCatalog = () => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOpenDailySummary = async () => {
        setShowDailySummaryModal(true);
        setLoadingSummary(true);
        setSummaryError('');
        try {
            const res = await axiosInstance.get('/DailySummary/today');
            setDailySummaryData(res.data);
        } catch (err) {
            console.error("Failed to load daily summary:", err);
            if (err.response?.status === 401) {
                setSummaryError("Session expired. Please re-login to view daily summary.");
            } else {
                setSummaryError(err.response?.data?.message || "Could not load today's summary.");
            }
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleToggleCompare = (product) => {
        const pId = product.id || product.Id;
        if (compareList.some(p => (p.id || p.Id) === pId)) {
            setCompareList(compareList.filter(p => (p.id || p.Id) !== pId));
        } else {
            if (compareList.length >= 3) {
                alert("You can compare up to 3 models at a time.");
                return;
            }
            setCompareList([...compareList, product]);
        }
    };

    const filteredProducts = products
        .filter((product) => {
            const titleStr = String(product?.title || product?.Title || '').toLowerCase();
            const categoryStr = String(product?.category || product?.Category || '').toLowerCase();
            const descriptionStr = String(product?.description || product?.Description || '').toLowerCase();
            const rawCategory = categoryStr.replace(/[- ]/g, '');
            const normSelected = selectedCategory.replace(/[- ]/g, '').toLowerCase();

            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase().trim();
                const matchesSearch =
                    titleStr.includes(query) ||
                    categoryStr.includes(query) ||
                    descriptionStr.includes(query);
                if (!matchesSearch) return false;
            }

            if (ptaFilter !== '') {
                const rawPta = String(
                    product?.ptaStatus ??
                    product?.PtaStatus ??
                    product?.PTAStatus ??
                    product?.pta ??
                    product?.PTA ??
                    ''
                ).toLowerCase();

                const combinedText = `${rawPta} ${titleStr} ${descriptionStr}`.toLowerCase();
                const cleanCombined = combinedText.replace(/[^a-z0-9]/g, '');

                if (ptaFilter === 'JV') {
                    const isJv =
                        combinedText.includes('jv') ||
                        combinedText.includes('joint venture') ||
                        cleanCombined.includes('jointventure');

                    if (!isJv) return false;
                } else if (ptaFilter === 'Non-PTA') {
                    const isNonPta =
                        rawPta.includes('non') ||
                        combinedText.includes('non-pta') ||
                        combinedText.includes('non pta') ||
                        cleanCombined.includes('nonpta');

                    if (!isNonPta) return false;
                } else if (ptaFilter === 'PTA Approved') {
                    const isNonPta =
                        rawPta.includes('non') ||
                        combinedText.includes('non-pta') ||
                        combinedText.includes('non pta') ||
                        cleanCombined.includes('nonpta');

                    const isJv =
                        combinedText.includes('jv') ||
                        combinedText.includes('joint venture');

                    if (isNonPta || isJv) return false;

                    const isApproved =
                        rawPta.includes('approved') ||
                        rawPta.includes('official') ||
                        rawPta.includes('pta') ||
                        combinedText.includes('pta approved') ||
                        combinedText.includes('esim') ||
                        cleanCombined.includes('ptaapproved') ||
                        (rawPta.length > 0 && !rawPta.includes('non'));

                    if (!isApproved) return false;
                }
            }

            if (!selectedCategory) return true;

            if (normSelected === 'prebooking' || normSelected === 'preorder') {
                return (
                    product?.isPreBooking === true ||
                    product?.IsPreBooking === true ||
                    product?.pricePKR === 0 ||
                    product?.PricePKR === 0 ||
                    rawCategory.includes('prebooking') ||
                    rawCategory.includes('preorder')
                );
            }

            if (normSelected === 'iphones' || normSelected === 'iphone') {
                return rawCategory.includes('iphone') || titleStr.includes('iphone');
            }

            return rawCategory.includes(normSelected) || normSelected.includes(rawCategory);
        })
        .sort((a, b) => {
            const priceA = Number(a?.pricePKR ?? a?.PricePKR ?? 0);
            const priceB = Number(b?.pricePKR ?? b?.PricePKR ?? 0);

            if (sortByPrice === 'lowToHigh') return priceA - priceB;
            if (sortByPrice === 'highToLow') return priceB - priceA;
            return 0;
        });

    const handleAdminToggle = () => {
        if (view === 'admin') {
            setView('store');
        } else {
            const token = getStoredToken();
            if (token || isAuthenticated) {
                setIsAuthenticated(true);
                setView('admin');
            } else {
                setShowAuthModal(true);
            }
        }
    };

    const handleLogout = () => {
        clearStoredTokens();
        setIsAuthenticated(false);
        setView('store');
    };

    const handleBuyWhatsApp = (title, price) => {
        try {
            const whatsappUrl = getWhatsAppLink(title, price);
            window.open(whatsappUrl, '_blank');
        } catch (err) {
            alert("Unable to generate WhatsApp deal link.");
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setPtaFilter('');
        setSortByPrice('');
        setSelectedCategory('');
    };

    const m = dailySummaryData?.metrics;

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210] flex flex-col pb-24 relative selection:bg-[#B4562F] selection:text-white antialiased">

            {/* Design-Arena Sticky Top Header */}
            <header className="sticky top-0 inset-x-0 z-50 bg-[#F7F5F2]/90 backdrop-blur-md border-b border-[#141210]/8 py-4">
                <div className="max-w-[1240px] mx-auto px-5 sm:px-8 flex items-center justify-between gap-4">
                    <div
                        className="flex items-center gap-2.5 cursor-pointer group shrink-0"
                        onClick={() => setView('store')}
                    >
                        <span className="relative w-9 h-9 rounded-full bg-[#141210] flex items-center justify-center overflow-hidden">
                            <span className="w-[9px] h-[9px] rounded-full bg-[#F7F5F2] group-hover:scale-[2.5] transition-transform duration-500 ease-out"></span>
                        </span>
                        <span className="text-[19px] font-semibold tracking-[-0.035em] leading-none text-[#141210]">
                            sales<span className="text-[#B4562F]">n</span>purchase
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setView('tracker')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${view === 'tracker'
                                    ? 'bg-[#141210] text-white'
                                    : 'text-[#2A2622] hover:bg-[#E9E3DB]'
                                }`}
                        >
                            <Truck className="w-3.5 h-3.5 text-[#B4562F]" />
                            <span>Track Order</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setView('calculator')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${view === 'calculator'
                                    ? 'bg-[#141210] text-white'
                                    : 'text-[#2A2622] hover:bg-[#E9E3DB]'
                                }`}
                        >
                            <Calculator className="w-3.5 h-3.5 text-[#B4562F]" />
                            <span>PTA Calculator</span>
                        </button>

                        {view === 'store' && (
                            <button
                                type="button"
                                onClick={() => setShowTradeInModal(true)}
                                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-[#2A2622] hover:bg-[#E9E3DB] transition cursor-pointer whitespace-nowrap"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-[#B4562F]" />
                                <span>Trade-In</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAdminToggle}
                            className="btn btn-primary inline-flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-2.5 text-xs font-semibold tracking-tight cursor-pointer whitespace-nowrap"
                        >
                            <span className="sheen"></span>
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>{view === 'store' ? 'Admin' : 'Store'}</span>
                        </button>

                        {isAuthenticated && view === 'admin' && (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-semibold text-[#B4562F] bg-white border border-[#B4562F]/25 hover:bg-[#B4562F] hover:text-white transition cursor-pointer whitespace-nowrap"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Dynamic View Switcher */}
            {view === 'tracker' ? (
                <div className="flex-1">
                    <OrderTrackingPortal onBackToStore={() => setView('store')} />
                </div>
            ) : view === 'calculator' ? (
                <div className="flex-1">
                    <PtaCalculatorPortal onBackToStore={() => setView('store')} />
                </div>
            ) : view === 'admin' ? (
                <div className="flex-1">
                    <div className="bg-white/85 backdrop-blur-md border-b border-[#141210]/8 px-5 sm:px-8 py-3">
                        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-3 overflow-x-auto">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAdminTab('preorders')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${adminTab === 'preorders'
                                            ? 'bg-[#141210] text-white'
                                            : 'bg-[#F7F5F2] text-[#2A2622] hover:bg-[#E9E3DB] border border-[#141210]/10'
                                        }`}
                                >
                                    Customer Pre-Orders
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdminTab('products')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${adminTab === 'products'
                                            ? 'bg-[#141210] text-white'
                                            : 'bg-[#F7F5F2] text-[#2A2622] hover:bg-[#E9E3DB] border border-[#141210]/10'
                                        }`}
                                >
                                    Manage Products &amp; Prices
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdminTab('tradeins')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${adminTab === 'tradeins'
                                            ? 'bg-[#141210] text-white'
                                            : 'bg-[#F7F5F2] text-[#2A2622] hover:bg-[#E9E3DB] border border-[#141210]/10'
                                        }`}
                                >
                                    Trade-In Requests
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdminTab('stockrequests')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${adminTab === 'stockrequests'
                                            ? 'bg-[#141210] text-white'
                                            : 'bg-[#F7F5F2] text-[#2A2622] hover:bg-[#E9E3DB] border border-[#141210]/10'
                                        }`}
                                >
                                    Stock Requests (1-2 Days)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdminTab('invoices')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${adminTab === 'invoices'
                                            ? 'bg-[#141210] text-white'
                                            : 'bg-[#F7F5F2] text-[#2A2622] hover:bg-[#E9E3DB] border border-[#141210]/10'
                                        }`}
                                >
                                    Digital Invoices
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenDailySummary}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#B4562F]/12 hover:bg-[#B4562F]/20 text-[#B4562F] border border-[#B4562F]/25 transition cursor-pointer whitespace-nowrap shrink-0"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Daily Summary</span>
                            </button>
                        </div>
                    </div>

                    {adminTab === 'preorders' && <AdminPreOrders />}
                    {adminTab === 'products' && <AdminProducts />}
                    {adminTab === 'tradeins' && <AdminTradeIns />}
                    {adminTab === 'stockrequests' && <AdminStockRequests />}
                    {adminTab === 'invoices' && <AdminInvoices />}
                </div>
            ) : (
                <div className="flex-1">
                    {/* Cinematic Hero Component */}
                    <CinematicHero
                        onExploreClick={handleScrollToCatalog}
                        onOpenTradeIn={() => setShowTradeInModal(true)}
                    />

                    {/* Catalog Anchor */}
                    <div ref={catalogRef} />

                    {/* Toolbar & Search Filter Section */}
                    <section className="max-w-[1240px] mx-auto px-5 sm:px-8 mb-8 w-full space-y-5 pt-10">
                        <div className="bg-white border border-[#141210]/8 p-4 sm:p-5 rounded-[22px] flex flex-col md:flex-row gap-3.5 items-center justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="w-4 h-4 text-[#7C746B] absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search model (e.g. iPhone 15 Pro)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 text-[#141210] rounded-full pl-10 pr-9 py-2.5 text-xs placeholder:text-[#7C746B] focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C746B] hover:text-[#141210] p-0.5 rounded-full cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                                <div className="flex items-center gap-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-full px-3.5 py-2 text-xs">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#B4562F]" />
                                    <select
                                        value={ptaFilter}
                                        onChange={(e) => setPtaFilter(e.target.value)}
                                        className="bg-transparent text-[#141210] font-medium focus:outline-none text-xs cursor-pointer pr-5"
                                    >
                                        <option value="">All Device Status</option>
                                        <option value="PTA Approved">PTA Approved</option>
                                        <option value="Non-PTA">Non-PTA</option>
                                        <option value="JV">JV (Joint Venture)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1.5 bg-[#F7F5F2] border border-[#141210]/12 rounded-full px-3.5 py-2 text-xs">
                                    <ArrowUpDown className="w-3.5 h-3.5 text-[#B4562F]" />
                                    <select
                                        value={sortByPrice}
                                        onChange={(e) => setSortByPrice(e.target.value)}
                                        className="bg-transparent text-[#141210] font-medium focus:outline-none text-xs cursor-pointer pr-5"
                                    >
                                        <option value="">Sort by Price</option>
                                        <option value="lowToHigh">Price: Low to High</option>
                                        <option value="highToLow">Price: High to Low</option>
                                    </select>
                                </div>

                                {(searchQuery || ptaFilter || sortByPrice || selectedCategory) && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="text-xs text-[#B4562F] hover:bg-[#B4562F] hover:text-white px-4 py-2 bg-[#B4562F]/10 border border-[#B4562F]/20 rounded-full font-semibold transition cursor-pointer"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    type="button"
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap cursor-pointer border ${selectedCategory === cat.id
                                            ? 'bg-[#141210] text-white border-[#141210]'
                                            : 'bg-white text-[#2A2622] border-[#141210]/12 hover:border-[#141210]'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Product Catalog Grid */}
                    <main className="max-w-[1240px] mx-auto px-5 sm:px-8 pb-16 w-full">
                        {loading ? (
                            <div className="text-center py-24 text-[#7C746B] text-sm font-medium flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                                <span>Loading catalog inventory...</span>
                            </div>
                        ) : filteredProducts?.length === 0 ? (
                            <div className="bg-white border border-[#141210]/8 text-center py-20 px-6 space-y-3 rounded-[26px]">
                                <p className="text-[#141210] text-lg font-semibold">No matching products found.</p>
                                <p className="text-[#7C746B] text-xs">Try adjusting your search query or filter options.</p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="btn btn-primary mt-2 inline-flex items-center text-xs font-semibold px-6 py-3 rounded-full cursor-pointer"
                                >
                                    <span className="sheen"></span>
                                    Reset All Filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                                {filteredProducts?.map((p) => {
                                    const pId = p.id || p.Id;
                                    const isCompared = compareList.some(item => (item.id || item.Id) === pId);
                                    return (
                                        <ProductCard
                                            key={pId}
                                            product={p}
                                            isCompared={isCompared}
                                            onToggleCompare={handleToggleCompare}
                                            onBuyWhatsApp={handleBuyWhatsApp}
                                            onOpenPreOrder={(product, colorName) => setActivePreOrder({ product, colorName })}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </main>

                    {/* Customer Testimonials Section */}
                    <section className="max-w-[1240px] mx-auto px-5 sm:px-8 pb-20 w-full">
                        <div className="border-t border-[#141210]/10 pt-14">
                            <div className="text-center space-y-2.5 mb-10">
                                <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.14em] uppercase">
                                    <Star className="w-3.5 h-3.5 fill-[#B4562F]" />
                                    <span>Client Feedback</span>
                                </div>
                                <h2 className="text-2xl md:text-4xl font-semibold text-[#141210] tracking-[-0.03em]">
                                    Trusted by buyers across <span className="font-display italic text-[#B4562F]">Pakistan.</span>
                                </h2>
                                <p className="text-[#7C746B] text-xs sm:text-sm">Here is what our customers have to say about our devices and face-to-face deals.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {TESTIMONIALS.map((t, idx) => (
                                    <div key={idx} className="bg-white border border-[#141210]/8 p-7 rounded-[22px] flex flex-col justify-between space-y-5">
                                        <div className="space-y-3.5">
                                            <div className="flex items-center space-x-1 text-[#B4562F]">
                                                {[...Array(t.rating)].map((_, i) => (
                                                    <Star key={i} className="w-3.5 h-3.5 fill-[#B4562F]" />
                                                ))}
                                            </div>
                                            <p className="text-[#141210] leading-relaxed font-display italic text-[20px]">"{t.comment}"</p>
                                        </div>

                                        <div className="pt-4 border-t border-[#141210]/8 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-semibold text-[#141210]">{t.name}</h4>
                                                <span className="text-[11px] text-[#7C746B]">{t.city} • <span className="text-[#B4562F] font-medium">{t.device}</span></span>
                                            </div>
                                            <CheckCircle2 className="w-4 h-4 text-[#22423A]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Floating Compare Action Bar */}
                    {compareList.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#141210] text-white border border-white/15 px-5 py-3 rounded-full shadow-2xl flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-[#D97B4F]" />
                                <span className="text-xs font-medium num-tabular">{compareList.length} / 3 Models Selected</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCompareModal(true)}
                                className="btn bg-white text-[#141210] hover:bg-[#B4562F] hover:text-white font-semibold px-4 py-2 rounded-full text-xs transition cursor-pointer"
                            >
                                Compare Side-by-Side
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompareList([])}
                                className="text-white/70 hover:text-white text-xs underline cursor-pointer bg-transparent border-0"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Assistant Chatbot Widget */}
            <ChatbotWidget
                products={products}
                onOpenTracker={() => setView('tracker')}
                onOpenCalculator={() => setView('calculator')}
                onOpenTradeIn={() => setShowTradeInModal(true)}
            />

            {/* Compare Modal */}
            {showCompareModal && (
                <CompareModal
                    comparedProducts={compareList}
                    onClose={() => setShowCompareModal(false)}
                    onRemoveProduct={(id) => setCompareList(compareList.filter(p => (p.id || p.Id) !== id))}
                />
            )}

            {activePreOrder && (
                <PreOrderModal
                    product={activePreOrder.product}
                    color={activePreOrder.colorName}
                    onClose={() => setActivePreOrder(null)}
                />
            )}

            {showTradeInModal && (
                <TradeInModal onClose={() => setShowTradeInModal(false)} />
            )}

            {/* AI Daily Summary Modal */}
            {showDailySummaryModal && (
                <div className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white text-[#141210] border border-[#141210]/10 rounded-[26px] max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-[#141210]/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-full bg-[#B4562F]/12 text-[#B4562F] flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold text-[#141210]">AI Daily Sales &amp; Deal Summary</h3>
                                    <p className="text-[11px] text-[#7C746B]">
                                        {m?.dateUtc ? `Snapshot for ${m.dateUtc} (UTC)` : "Today's operational snapshot"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDailySummaryModal(false)}
                                className="p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] cursor-pointer transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {loadingSummary ? (
                            <div className="py-12 flex items-center justify-center gap-2 text-xs text-[#7C746B]">
                                <Loader2 className="w-4 h-4 animate-spin text-[#B4562F]" />
                                <span>Generating today&apos;s AI summary...</span>
                            </div>
                        ) : summaryError ? (
                            <div className="bg-[#B4562F]/10 border border-[#B4562F]/25 text-[#B4562F] text-xs p-4 rounded-2xl">
                                {summaryError}
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                {m && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="bg-[#F7F5F2] border border-[#141210]/8 p-3.5 rounded-[18px]">
                                            <span className="text-[10.5px] text-[#7C746B] block">Today Invoices</span>
                                            <span className="text-base font-semibold text-[#141210] mt-0.5 block num-tabular">{m.totalInvoicesToday}</span>
                                        </div>
                                        <div className="bg-[#F7F5F2] border border-[#141210]/8 p-3.5 rounded-[18px]">
                                            <span className="text-[10.5px] text-[#22423A] font-medium block">SELL Volume</span>
                                            <span className="text-xs font-semibold text-[#22423A] mt-1 block num-tabular">
                                                PKR {Number(m.sellTotalPkr || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="bg-[#F7F5F2] border border-[#141210]/8 p-3.5 rounded-[18px]">
                                            <span className="text-[10.5px] text-[#B4562F] font-medium block">Pending Stock</span>
                                            <span className="text-base font-semibold text-[#B4562F] mt-0.5 block num-tabular">{m.pendingStockCount}</span>
                                        </div>
                                        <div className="bg-[#F7F5F2] border border-[#141210]/8 p-3.5 rounded-[18px]">
                                            <span className="text-[10.5px] text-[#7C746B] block">Pre-Orders / Trade</span>
                                            <span className="text-sm font-semibold text-[#141210] mt-0.5 block num-tabular">
                                                {m.todayPreOrdersCount} / {m.todayTradeInRequestsCount}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-[#F7F5F2] border border-[#141210]/8 p-4 rounded-[18px] space-y-1.5">
                                    <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#B4562F]">Executive Summary</div>
                                    <p className="text-[#2A2622] leading-relaxed">{dailySummaryData?.summary}</p>
                                </div>

                                {Array.isArray(dailySummaryData?.nextActions) && dailySummaryData.nextActions.length > 0 && (
                                    <div className="bg-[#F7F5F2] border border-[#141210]/8 p-4 rounded-[18px] space-y-2">
                                        <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#22423A]">Recommended Next Actions</div>
                                        <ul className="space-y-1.5 text-[#2A2622] list-disc pl-4">
                                            {dailySummaryData.nextActions.map((act, idx) => (
                                                <li key={idx}>{act}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141210]/10">
                                    <button
                                        type="button"
                                        onClick={handleOpenDailySummary}
                                        disabled={loadingSummary}
                                        className="px-4 py-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] text-xs font-semibold cursor-pointer border border-[#141210]/12 transition disabled:opacity-50"
                                    >
                                        Refresh Summary
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDailySummaryModal(false)}
                                        className="btn btn-primary px-5 py-2 rounded-full text-xs font-semibold cursor-pointer"
                                    >
                                        <span className="sheen"></span>
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAuthModal && (
                <AdminAuthModal
                    onAuthenticate={() => {
                        setIsAuthenticated(true);
                        setShowAuthModal(false);
                        setView('admin');
                    }}
                    onClose={() => setShowAuthModal(false)}
                />
            )}
        </div>
    );
}