import React, { useState, useEffect, useMemo } from 'react';
import { fetchProducts } from '../api/axiosInstance';
import { SlidersHorizontal, Search, Loader2, Heart, CheckCircle2, ShoppingBag, X, MessageCircle, Send, ShieldCheck, User, Phone, MapPin, Calculator, Smartphone, FileText } from 'lucide-react';

export default function ProductCatalog() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStorage, setSelectedStorage] = useState('All');
    const [maxPrice, setMaxPrice] = useState(600000); // Default upper bound PKR

    // PTA Tax Calculator State
    const [calcModel, setCalcModel] = useState('iPhone 15 Pro Max');
    const [calcBasePrice, setCalcBasePrice] = useState(320000);
    const [calcIdType, setCalcIdType] = useState('Passport'); // Passport vs CNIC

    // Wishlist & Toast States
    const [wishlist, setWishlist] = useState(() => {
        try {
            const saved = localStorage.getItem('salesnpurchase_wishlist');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // WhatsApp Order Modal State
    const [selectedOrderProduct, setSelectedOrderProduct] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [city, setCity] = useState('');
    const [ptaStatus, setPtaStatus] = useState('PTA Approved');
    const [notes, setNotes] = useState('');

    const shopWhatsAppNumber = '923001234567'; // Replace with your shop WhatsApp number

    useEffect(() => {
        loadCatalog();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('salesnpurchase_wishlist', JSON.stringify(wishlist));
        } catch (err) {
            console.error("Failed to save wishlist to local storage:", err);
        }
    }, [wishlist]);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const res = await fetchProducts();
            setProducts(Array.isArray(res) ? res : (res?.data || res?.result || []));
        } catch (err) {
            console.error("Failed to load shop products:", err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    const toggleWishlist = (product, e) => {
        e.stopPropagation();
        const productId = getProp(product, 'id', 'Id', null);
        const exists = wishlist.some(item => getProp(item, 'id', 'Id') === productId);

        if (exists) {
            setWishlist(prev => prev.filter(item => getProp(item, 'id', 'Id') !== productId));
            triggerToast("Removed from wishlist");
        } else {
            setWishlist(prev => [...prev, product]);
            triggerToast("❤️ Added to your wishlist!");
        }
    };

    // PTA Tax Calculation Logic (FBR estimation standard for Pakistan)
    const calculatePtaTax = () => {
        let baseTax = 85000;
        if (calcModel.includes('16')) baseTax = 135000;
        else if (calcModel.includes('15')) baseTax = 115000;
        else if (calcModel.includes('14')) baseTax = 95000;
        else if (calcModel.includes('13')) baseTax = 75000;
        else if (calcModel.includes('12')) baseTax = 55000;
        else if (calcModel.includes('11')) baseTax = 42000;

        // CNIC has higher duty than Passport (~20% higher)
        const finalTax = calcIdType === 'CNIC' ? Math.round(baseTax * 1.25) : baseTax;
        const totalEstimated = Number(calcBasePrice) + finalTax;
        return { finalTax, totalEstimated };
    };

    const { finalTax, totalEstimated } = calculatePtaTax();

    const handleSendWhatsAppOrder = (e) => {
        e.preventDefault();
        if (!selectedOrderProduct) return;

        if (!customerName || !customerPhone || !city) {
            alert('Please fill in your Name, Phone Number, and City.');
            return;
        }

        const title = getProp(selectedOrderProduct, 'title', 'Title', 'Apple Device');
        const storage = getProp(selectedOrderProduct, 'storage', 'Storage', '128GB');
        const pricePKR = getProp(selectedOrderProduct, 'pricePKR', 'PricePKR', 0);
        const category = getProp(selectedOrderProduct, 'category', 'Category', 'iPhone');

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
        setSelectedOrderProduct(null);
        triggerToast("🚀 Opening WhatsApp order chat!");
    };

    // Helper property extractor matching backend schema casing
    const getProp = (obj, camelKey, pascalKey, defaultValue) => {
        if (!obj) return defaultValue;
        if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
        if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
        return defaultValue;
    };

    // Advanced Filtering Logic
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const title = String(getProp(product, 'title', 'Title', '')).toLowerCase();
            const category = String(getProp(product, 'category', 'Category', ''));
            const storage = String(getProp(product, 'storage', 'Storage', ''));
            const price = Number(getProp(product, 'pricePKR', 'PricePKR', 0));

            const matchesSearch = title.includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
            const matchesStorage = selectedStorage === 'All' || storage === selectedStorage;
            const matchesPrice = price <= maxPrice;

            return matchesSearch && matchesCategory && matchesStorage && matchesPrice;
        });
    }, [products, searchQuery, selectedCategory, selectedStorage, maxPrice]);

    const storageOptions = ['All', '64GB', '128GB', '256GB', '512GB', '1TB'];
    const categoryOptions = [
        { label: 'All Devices', value: 'All' },
        { label: 'iPhones', value: 'iPhone' },
        { label: 'Pre-Booking', value: 'PreBooking' },
        { label: 'Smartwatches', value: 'AppleSmartwatch' },
        { label: 'AirPods & Audio', value: 'AirPodsCopy' },
        { label: 'Accessories', value: 'AppleCableAdapter' }
    ];

    const ptaModelsList = [
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13', 'iPhone 12', 'iPhone 11'
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 relative">
            {/* Floating Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{toastMessage}</span>
                </div>
            )}

            {/* Header & Live Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121824] border border-slate-800/80 p-6 rounded-3xl shadow-xl">
                <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">SalesnPurchase Live Catalog</span>
                    <h1 className="text-2xl font-black text-white tracking-tight">Explore Apple Devices & Accessories</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search models, e.g. iPhone 16 Pro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>

                    <button
                        onClick={() => setShowWishlistDrawer(true)}
                        className="relative bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-inner"
                    >
                        <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="hidden sm:inline">Wishlist</span>
                        {wishlist.length > 0 && (
                            <span className="bg-amber-400 text-slate-950 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                                {wishlist.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Advanced Filtering & Pricing Control Panel */}
            <div className="bg-[#121824] border border-slate-800/80 p-6 rounded-3xl shadow-xl space-y-6">
                <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
                    <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                    <span>Advanced Filters & Pricing</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    {/* Category Tabs */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Category / Tab</label>
                        <div className="flex flex-wrap gap-1.5">
                            {categoryOptions.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setSelectedCategory(cat.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedCategory === cat.value
                                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10'
                                            : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Storage & RAM Filter Pills */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Storage Capacity</label>
                        <div className="flex flex-wrap gap-1.5">
                            {storageOptions.map(sto => (
                                <button
                                    key={sto}
                                    onClick={() => setSelectedStorage(sto)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${selectedStorage === sto
                                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10'
                                            : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {sto}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Price Range Slider */}
                    <div className="space-y-2 bg-[#0B0F17] border border-slate-800 p-4 rounded-2xl shadow-inner">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Max Price Filter</span>
                            <span className="text-amber-400 font-mono font-black">PKR {Number(maxPrice).toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="600000"
                            step="10000"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                            className="w-full accent-amber-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                            <span>PKR 0</span>
                            <span>PKR 600,000+</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live PTA Tax Calculator Widget */}
            <div className="bg-[#121824] border border-slate-800/80 p-6 rounded-3xl shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2 text-white font-bold text-sm">
                        <Calculator className="w-4 h-4 text-amber-400" />
                        <span>Live PTA Tax & Duty Calculator (Pakistan FBR)</span>
                    </div>
                    <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold px-2.5 py-0.5 rounded-full uppercase">
                        Official Rates
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Select Model */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-amber-400" /> Select iPhone Model
                        </label>
                        <select
                            value={calcModel}
                            onChange={(e) => setCalcModel(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                        >
                            {ptaModelsList.map(mod => (
                                <option key={mod} value={mod} className="bg-[#121824] text-white">{mod}</option>
                            ))}
                        </select>
                    </div>

                    {/* Base Device Price (PKR) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-400" /> Estimated Base Price (PKR)
                        </label>
                        <input
                            type="number"
                            value={calcBasePrice}
                            onChange={(e) => setCalcBasePrice(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-400 shadow-inner"
                        />
                    </div>

                    {/* ID Type (Passport vs CNIC) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-amber-400" /> Registration ID Type
                        </label>
                        <select
                            value={calcIdType}
                            onChange={(e) => setCalcIdType(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                        >
                            <option value="Passport" className="bg-[#121824]">Passport (Lower Duty)</option>
                            <option value="CNIC" className="bg-[#121824]">CNIC (Standard Duty)</option>
                        </select>
                    </div>
                </div>

                {/* Calculation Breakdown Banner */}
                <div className="bg-[#0B0F17] border border-amber-400/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                    <div className="space-y-0.5 text-center sm:text-left">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Estimated PTA Duty for {calcModel} via {calcIdType}</span>
                        <span className="text-amber-400 font-mono font-black text-base">PKR {Number(finalTax).toLocaleString()}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                    <div className="space-y-0.5 text-center sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Total Estimated Cost (Device + PTA)</span>
                        <span className="text-emerald-400 font-mono font-black text-lg">PKR {Number(totalEstimated).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Product Catalog Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        Available Listings ({filteredProducts.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center space-x-2 py-20 text-slate-400 text-xs">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                        <span>Loading catalog...</span>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-[#121824] border border-slate-800/80 rounded-3xl p-12 text-center space-y-2">
                        <p className="text-white font-bold text-sm">No devices match your selected filters.</p>
                        <p className="text-slate-400 text-xs">Try adjusting your price slider or resetting storage/category filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map((product, index) => {
                            const productId = getProp(product, 'id', 'Id', index);
                            const title = getProp(product, 'title', 'Title', 'Unnamed Device');
                            const category = getProp(product, 'category', 'Category', 'iPhone');
                            const storage = getProp(product, 'storage', 'Storage', '128GB');
                            const color = getProp(product, 'color', 'Color', '');
                            const pricePKR = getProp(product, 'pricePKR', 'PricePKR', 0);
                            const isPreBooking = Boolean(getProp(product, 'isPreBooking', 'IsPreBooking', false));
                            const inStock = Boolean(getProp(product, 'inStock', 'InStock', true));
                            const isWishlisted = wishlist.some(item => getProp(item, 'id', 'Id') === productId);

                            return (
                                <div key={productId} className="bg-[#121824] border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition relative group">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                                {category}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {inStock ? (
                                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                        In Stock
                                                    </span>
                                                ) : (
                                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                        Out of Stock
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => toggleWishlist(product, e)}
                                                    className={`p-2 rounded-xl transition cursor-pointer border ${isWishlisted
                                                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                                                            : 'bg-[#0B0F17] text-slate-400 border-slate-800 hover:text-amber-400 hover:border-slate-700'
                                                        }`}
                                                    title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-slate-950' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-white font-extrabold text-sm">{title}</h3>
                                            <p className="text-slate-400 text-xs mt-1">
                                                {storage} {color ? `• ${color}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Price</span>
                                            <span className="text-white font-mono font-extrabold text-sm">
                                                {isPreBooking || pricePKR === 0 ? 'Pre-Booking' : `PKR ${Number(pricePKR).toLocaleString()}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedOrderProduct(product)}
                                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
                                                title="Order via WhatsApp"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                <span>WhatsApp</span>
                                            </button>
                                            <button
                                                onClick={() => triggerToast(`Viewing details for ${title}`)}
                                                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-md shadow-amber-400/10"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* WhatsApp One-Click Order Modal */}
            {selectedOrderProduct && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-[#121824] border border-slate-800/80 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-6 text-slate-100 my-8">
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
                                onClick={() => setSelectedOrderProduct(null)}
                                className="text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-xl transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Product Summary Box */}
                        <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                            <div className="space-y-1">
                                <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold px-2 py-0.5 rounded-full uppercase">
                                    {getProp(selectedOrderProduct, 'category', 'Category', 'iPhone')}
                                </span>
                                <h3 className="text-white font-extrabold text-sm mt-1">{getProp(selectedOrderProduct, 'title', 'Title', '')}</h3>
                                <p className="text-slate-400 text-xs">{getProp(selectedOrderProduct, 'storage', 'Storage', '')}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Price</span>
                                <span className="text-amber-400 font-mono font-black text-sm">
                                    {getProp(selectedOrderProduct, 'pricePKR', 'PricePKR', 0) > 0 ? `PKR ${Number(getProp(selectedOrderProduct, 'pricePKR', 'PricePKR', 0)).toLocaleString()}` : 'Pre-Booking'}
                                </span>
                            </div>
                        </div>

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
            )}

            {/* Wishlist Drawer Modal */}
            {showWishlistDrawer && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
                    <div className="bg-[#121824] border-l border-slate-800 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between text-slate-100">
                        <div className="space-y-6 flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center text-amber-400">
                                        <Heart className="w-4 h-4 fill-amber-400" />
                                    </div>
                                    <h2 className="text-base font-black text-white">Your Wishlist ({wishlist.length})</h2>
                                </div>
                                <button
                                    onClick={() => setShowWishlistDrawer(false)}
                                    className="text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-xl transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {wishlist.length === 0 ? (
                                <div className="text-center py-20 space-y-3">
                                    <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                                    <p className="text-slate-400 text-xs">Your wishlist is currently empty.</p>
                                    <p className="text-slate-600 text-[11px]">Tap the heart icon on any device to save it for later.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {wishlist.map((item, idx) => {
                                        const id = getProp(item, 'id', 'Id', idx);
                                        const title = getProp(item, 'title', 'Title', '');
                                        const storage = getProp(item, 'storage', 'Storage', '');
                                        const price = getProp(item, 'pricePKR', 'PricePKR', 0);

                                        return (
                                            <div key={id} className="bg-[#0B0F17] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                                                <div>
                                                    <h4 className="text-white font-bold text-xs">{title}</h4>
                                                    <p className="text-slate-400 text-[11px] mt-0.5">{storage} • PKR {Number(price).toLocaleString()}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => toggleWishlist(item, e)}
                                                    className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setShowWishlistDrawer(false)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700/80"
                            >
                                Close Drawer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}