import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance, {
    createProduct,
    updateProduct,
    fetchProducts,
    deleteProduct,
    toggleStockStatus,
    getStoredToken,
    clearStoredTokens
} from '../api/axiosInstance';
import {
    PlusCircle,
    Trash2,
    Package,
    Edit,
    X,
    CheckCircle2,
    XCircle,
    Loader2,
    LogOut,
    Sparkles,
    Download,
    DollarSign,
    Layers,
    Mic,
    MicOff,
    Wand2
} from 'lucide-react';

const initialFormState = {
    title: '',
    category: 'iPhone',
    storage: '128GB',
    color: '',
    condition: 1,
    batteryHealth: '',
    inStock: true,
    isPreBooking: false,
    pricePKR: '',
    description: '',
    imageUrl: '',
    model3DUrl: ''
};

const conditionLabels = {
    1: 'New / Sealed',
    2: 'Open Box / Like New',
    3: 'Refurbished / Used'
};

const validCategories = ['iPhone', 'PreBooking', 'AppleSmartwatch', 'AirPodsCopy', 'AppleCableAdapter'];
const validStorages = ['Standard', '64GB', '128GB', '256GB', '512GB', '1TB'];

const getProp = (obj, camelKey, pascalKey, defaultValue) => {
    if (!obj) return defaultValue;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
    if (obj[pascalKey] !== undefined && obj[pascalKey] !== null) return obj[pascalKey];
    return defaultValue;
};

const safeNumber = (val, fallback = 0) => {
    if (val === '' || val === null || val === undefined) return fallback;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const extractPriceFromText = (text) => {
    const cleaned = String(text || '').replace(/,/g, '');
    const kMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
        return Math.round(Number(kMatch[1]) * 1000);
    }
    const numMatches = cleaned.match(/\b\d{5,7}\b/g);
    if (numMatches && numMatches.length > 0) {
        return Number(numMatches[numMatches.length - 1]);
    }
    return null;
};

const extractBatteryFromText = (text) => {
    const match = String(text || '').match(/(\d{2,3})\s*%\s*(?:battery|bh)?|(?:battery|bh)\s*(\d{2,3})/i);
    const val = match ? Number(match[1] || match[2]) : null;
    if (val !== null && !Number.isNaN(val) && val >= 50 && val <= 100) {
        return val;
    }
    return null;
};

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [quickVoiceNote, setQuickVoiceNote] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(initialFormState);

    const recognitionRef = useRef(null);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchProducts();
            setProducts(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore cleanup error
                }
            }
        };
    }, []);

    const handleEditClick = (product) => {
        const id = getProp(product, 'id', 'Id', null);
        setEditingId(id);

        const condVal = safeNumber(getProp(product, 'condition', 'Condition', 1), 1);
        const bhVal = getProp(product, 'batteryHealth', 'BatteryHealth', '');
        const priceVal = getProp(product, 'pricePKR', 'PricePKR', '');

        setFormData({
            title: getProp(product, 'title', 'Title', ''),
            category: getProp(product, 'category', 'Category', 'iPhone'),
            storage: getProp(product, 'storage', 'Storage', '128GB'),
            color: getProp(product, 'color', 'Color', ''),
            condition: condVal,
            batteryHealth: bhVal !== null && bhVal !== undefined ? bhVal : '',
            inStock: Boolean(getProp(product, 'inStock', 'InStock', true)),
            isPreBooking: Boolean(getProp(product, 'isPreBooking', 'IsPreBooking', false)),
            pricePKR: priceVal !== null && priceVal !== undefined ? priceVal : '',
            description: getProp(product, 'description', 'Description', ''),
            imageUrl: getProp(product, 'imageUrl', 'ImageUrl', ''),
            model3DUrl: getProp(product, 'model3DUrl', 'Model3DUrl', '')
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setQuickVoiceNote('');
    };

    const handleCategoryChange = (e) => {
        const selectedCategory = e.target.value;
        const isPreBook = selectedCategory === 'PreBooking';

        setFormData(prev => ({
            ...prev,
            category: selectedCategory,
            isPreBooking: isPreBook ? true : prev.isPreBooking,
            pricePKR: isPreBook ? '' : prev.pricePKR
        }));
    };

    const handlePreBookingToggle = (e) => {
        const isChecked = e.target.checked;
        setFormData(prev => ({
            ...prev,
            isPreBooking: isChecked,
            pricePKR: isChecked ? '' : prev.pricePKR
        }));
    };

    const runAiListingGeneration = async (overridePrompt = null) => {
        const combinedPrompt = String(overridePrompt ?? quickVoiceNote ?? formData.title ?? '').trim();
        if (!combinedPrompt && !String(formData.title || '').trim() && !String(formData.color || '').trim()) {
            alert("Please speak or type product details first so AI can fill the listing.");
            return;
        }

        if (!getStoredToken()) {
            alert("Your login session has expired. Please log in again.");
            clearStoredTokens();
            window.location.href = '/login';
            return;
        }

        setIsGeneratingAi(true);
        try {
            const condNum = safeNumber(formData.condition, 1);
            const parsedBhFromNote = extractBatteryFromText(combinedPrompt);
            const bhParsed = parsedBhFromNote !== null
                ? parsedBhFromNote
                : (formData.batteryHealth !== '' && formData.batteryHealth !== null && formData.batteryHealth !== undefined
                    ? safeNumber(formData.batteryHealth, null)
                    : null);

            const parsedPriceFromNote = extractPriceFromText(combinedPrompt);
            const priceParsed = parsedPriceFromNote !== null
                ? parsedPriceFromNote
                : (!formData.isPreBooking && formData.pricePKR !== ''
                    ? safeNumber(formData.pricePKR, null)
                    : null);

            const res = await axiosInstance.post('/Products/generate-listing', {
                modelOrPrompt: combinedPrompt || String(formData.title || '').trim(),
                category: formData.category,
                storage: formData.storage,
                color: String(formData.color || '').trim(),
                conditionLabel: conditionLabels[condNum] || 'New / Sealed',
                batteryHealth: bhParsed,
                pricePKR: priceParsed
            });

            const data = res.data || {};
            const aiTitle = getProp(data, 'title', 'Title', '');
            const aiDescription = getProp(data, 'description', 'Description', '');
            const aiStorage = getProp(data, 'storage', 'Storage', '');
            const aiColor = getProp(data, 'color', 'Color', '');
            const aiCategory = getProp(data, 'category', 'Category', '');

            setFormData(prev => {
                const matchedCategory = validCategories.find(c => c.toLowerCase() === String(aiCategory || '').trim().toLowerCase());
                const matchedStorage = validStorages.find(s => s.toLowerCase() === String(aiStorage || '').trim().toLowerCase());
                const nextCategory = matchedCategory || prev.category;
                const isPreBook = nextCategory === 'PreBooking';

                return {
                    ...prev,
                    title: aiTitle ? String(aiTitle).trim() : (combinedPrompt || prev.title),
                    description: aiDescription ? String(aiDescription).trim() : prev.description,
                    storage: matchedStorage || prev.storage,
                    color: aiColor ? String(aiColor).trim() : prev.color,
                    category: nextCategory,
                    batteryHealth: bhParsed !== null ? bhParsed : prev.batteryHealth,
                    isPreBooking: isPreBook ? true : prev.isPreBooking,
                    pricePKR: isPreBook ? '' : (parsedPriceFromNote !== null ? parsedPriceFromNote : prev.pricePKR)
                };
            });
        } catch (error) {
            console.error("Failed to generate listing with AI:", error);
            if (error.response?.status === 401) {
                alert("Your session has expired. Redirecting to login...");
                clearStoredTokens();
                window.location.href = '/login';
            } else {
                alert(error.response?.data?.message || "AI could not generate product listing.");
            }
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleToggleVoiceInput = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser. Please type your quick product note instead.");
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch {
                // ignore stop error
            }
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        setIsListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript || '';
            if (transcript.trim()) {
                const cleanText = transcript.trim();
                setQuickVoiceNote(cleanText);
                runAiListingGeneration(cleanText);
            }
        };

        recognition.onerror = (err) => {
            console.error("Speech recognition error:", err);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!getStoredToken()) {
            alert("Your login session has expired. Please log in again.");
            clearStoredTokens();
            window.location.href = '/login';
            return;
        }

        setIsSubmitting(true);

        try {
            const bhParsed = formData.batteryHealth !== '' && formData.batteryHealth !== null && formData.batteryHealth !== undefined
                ? safeNumber(formData.batteryHealth, null)
                : null;

            const payload = {
                title: String(formData.title || '').trim(),
                category: formData.category,
                storage: formData.storage,
                color: String(formData.color || '').trim(),
                condition: safeNumber(formData.condition, 1),
                batteryHealth: bhParsed,
                inStock: Boolean(formData.inStock),
                isPreBooking: Boolean(formData.isPreBooking),
                pricePKR: formData.isPreBooking ? 0 : safeNumber(formData.pricePKR, 0),
                description: String(formData.description || '').trim(),
                imageUrl: String(formData.imageUrl || '').trim(),
                model3DUrl: String(formData.model3DUrl || '').trim()
            };

            if (editingId) {
                await updateProduct(editingId, payload);
                alert("Product updated successfully!");
            } else {
                await createProduct(payload);
                alert("Product created successfully!");
            }

            handleCancelEdit();
            await loadProducts();
        } catch (error) {
            console.error("Error saving product:", error);
            if (error.response?.status === 401) {
                alert("Your session has expired. Redirecting to login...");
                clearStoredTokens();
                window.location.href = '/login';
            } else {
                alert(error.response?.data?.message || error.response?.data || "Failed to save product. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStock = async (id) => {
        if (!id) return;
        try {
            await toggleStockStatus(id);
            await loadProducts();
        } catch (error) {
            console.error("Failed to toggle stock status:", error);
            if (error.response?.status === 401) {
                alert("Session expired. Please log in again.");
                clearStoredTokens();
                window.location.href = '/login';
            } else {
                alert("Failed to update stock status.");
            }
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteProduct(id);
                if (editingId === id) handleCancelEdit();
                await loadProducts();
            } catch (error) {
                console.error("Failed to delete product:", error);
                if (error.response?.status === 401) {
                    alert("Session expired. Please log in again.");
                    clearStoredTokens();
                    window.location.href = '/login';
                } else {
                    alert("Failed to delete product.");
                }
            }
        }
    };

    const handleLogout = () => {
        clearStoredTokens();
        window.location.href = '/login';
    };

    const exportToCSV = () => {
        if (products.length === 0) {
            alert("No inventory records available to export.");
            return;
        }

        const headers = ["ID", "Title", "Category", "Storage", "Color", "Price (PKR)", "In Stock", "Pre-Booking"];
        const rows = products.map(p => [
            getProp(p, 'id', 'Id', ''),
            `"${getProp(p, 'title', 'Title', '').replace(/"/g, '""')}"`,
            `"${getProp(p, 'category', 'Category', '')}"`,
            `"${getProp(p, 'storage', 'Storage', '')}"`,
            `"${getProp(p, 'color', 'Color', '')}"`,
            getProp(p, 'pricePKR', 'PricePKR', 0),
            Boolean(getProp(p, 'inStock', 'InStock', true)) ? "Yes" : "No",
            Boolean(getProp(p, 'isPreBooking', 'IsPreBooking', false)) ? "Yes" : "No"
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SalesnPurchase_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalProducts = products.length;
    const inStockCount = products.filter(p => Boolean(getProp(p, 'inStock', 'InStock', true))).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + Number(getProp(p, 'pricePKR', 'PricePKR', 0)), 0);

    return (
        <div className="min-h-screen bg-[#F7F5F2] text-[#141210]">
            <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="h-px w-8 bg-[#B4562F]"></span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.19em] text-[#B4562F]">
                                Admin Console · Inventory
                            </span>
                        </div>
                        <h1 className="text-[clamp(2rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.032em] font-semibold">
                            Catalog &amp; <span className="font-display italic text-[#B4562F]">listings.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isSubmitting}
                                className="btn inline-flex items-center gap-1.5 text-[#2A2622] hover:text-[#141210] bg-white hover:bg-[#E9E3DB] px-4 py-2.5 rounded-full text-[13px] font-medium border border-[#141210]/12 cursor-pointer disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                                <span>Cancel Edit</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="btn inline-flex items-center gap-1.5 text-[#B4562F] hover:text-white bg-white hover:bg-[#B4562F] px-4 py-2.5 rounded-full text-[13px] font-semibold border border-[#B4562F]/25 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Re-login</span>
                        </button>
                    </div>
                </div>

                {/* Analytics Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#7C746B] font-semibold block">Total Products</span>
                            <span className="text-3xl font-semibold text-[#141210] mt-1.5 block num-tabular">{totalProducts}</span>
                        </div>
                        <div className="w-11 h-11 bg-[#E9E3DB] rounded-full flex items-center justify-center text-[#141210]">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#22423A] font-semibold block">Items In Stock</span>
                            <span className="text-3xl font-semibold text-[#22423A] mt-1.5 block num-tabular">{inStockCount}</span>
                        </div>
                        <div className="w-11 h-11 bg-[#22423A]/10 rounded-full flex items-center justify-center text-[#22423A]">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#141210]/8 p-6 rounded-[22px] flex items-center justify-between">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#B4562F] font-semibold block">Total Catalog Value</span>
                            <span className="text-xl font-semibold text-[#141210] mt-1.5 block num-tabular">PKR {totalInventoryValue.toLocaleString()}</span>
                        </div>
                        <div className="w-11 h-11 bg-[#B4562F]/10 rounded-full flex items-center justify-center text-[#B4562F]">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] p-6 sm:p-8 md:p-10 mb-8">
                    <div className="flex items-center justify-between mb-6 pb-5 border-b border-[#141210]/8">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-[#E9E3DB] rounded-full flex items-center justify-center text-[#141210]">
                                {editingId ? <Edit className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <span className="text-[11px] text-[#7C746B] font-semibold uppercase tracking-[0.16em] block">Inventory Management</span>
                                <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#141210]">
                                    {editingId ? "Edit Product Listing" : "Add New Product"}
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* Voice / Quick AI Note Bar */}
                    <div className="bg-[#F7F5F2] border border-[#141210]/10 rounded-[20px] p-4 sm:p-5 mb-6 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-[#B4562F] flex items-center gap-1.5">
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>Voice / Quick AI Fill</span>
                            </span>
                            <span className="text-[11.5px] text-[#7C746B]">Speak or type specs in one line</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                                type="text"
                                placeholder="e.g. iPhone 15 Pro 256GB Natural Titanium 96% battery PTA approved 345000"
                                value={quickVoiceNote}
                                onChange={(e) => setQuickVoiceNote(e.target.value)}
                                className="flex-1 bg-white border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:outline-none focus:border-[#141210] transition"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleToggleVoiceInput}
                                    disabled={isGeneratingAi || isSubmitting}
                                    className={`btn inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold border transition cursor-pointer disabled:opacity-50 ${isListening
                                            ? 'bg-[#B4562F] text-white border-[#B4562F]'
                                            : 'bg-white hover:bg-[#E9E3DB] text-[#141210] border-[#141210]/15'
                                        }`}
                                >
                                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#B4562F]" />}
                                    <span>{isListening ? 'Listening...' : 'Voice'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runAiListingGeneration()}
                                    disabled={isGeneratingAi || isSubmitting}
                                    className="btn btn-primary inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-50"
                                >
                                    <span className="sheen"></span>
                                    {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Parse &amp; Fill</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Product Title *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. iPhone 16 Pro Max"
                                    value={formData.title ?? ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Category *</label>
                                <select
                                    value={formData.category ?? 'iPhone'}
                                    onChange={handleCategoryChange}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] font-medium text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] transition cursor-pointer"
                                >
                                    <option value="iPhone">iPhones</option>
                                    <option value="PreBooking">Pre-Booking</option>
                                    <option value="AppleSmartwatch">Smartwatches</option>
                                    <option value="AirPodsCopy">AirPods &amp; Audio</option>
                                    <option value="AppleCableAdapter">Accessories</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Storage Option</label>
                                <select
                                    value={formData.storage ?? '128GB'}
                                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] font-medium text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] transition cursor-pointer"
                                >
                                    <option value="Standard">Standard (No Storage)</option>
                                    <option value="64GB">64GB</option>
                                    <option value="128GB">128GB</option>
                                    <option value="256GB">256GB</option>
                                    <option value="512GB">512GB</option>
                                    <option value="1TB">1TB</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Color</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Natural Titanium"
                                    value={formData.color ?? ''}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Condition</label>
                                <select
                                    value={Number.isNaN(Number(formData.condition)) ? 1 : formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: Number(e.target.value) })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] font-medium text-[#141210] focus:bg-white focus:outline-none focus:border-[#141210] transition cursor-pointer"
                                >
                                    <option value={1}>New / Sealed</option>
                                    <option value={2}>Open Box / Like New</option>
                                    <option value={3}>Refurbished / Used</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Battery Health (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="e.g. 95 (Leave blank if N/A)"
                                    value={Number.isNaN(formData.batteryHealth) ? '' : (formData.batteryHealth ?? '')}
                                    onChange={(e) => setFormData({ ...formData, batteryHealth: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Price in PKR</label>
                                <input
                                    required={!formData.isPreBooking}
                                    disabled={formData.isPreBooking}
                                    type="number"
                                    min="0"
                                    placeholder={formData.isPreBooking ? "0 (Pre-Booking)" : "e.g. 350000"}
                                    value={formData.isPreBooking ? "" : (Number.isNaN(formData.pricePKR) ? '' : (formData.pricePKR ?? ''))}
                                    onChange={(e) => setFormData({ ...formData, pricePKR: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">Image URL / Path</label>
                                <input
                                    type="text"
                                    placeholder="/images/iphone-16promax.jpg"
                                    value={formData.imageUrl ?? ''}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                            </div>

                            <div>
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B] block mb-2">3D Model File Name (GLB)</label>
                                <input
                                    type="text"
                                    placeholder="iphone16pro.glb"
                                    value={formData.model3DUrl ?? ''}
                                    onChange={(e) => setFormData({ ...formData, model3DUrl: e.target.value })}
                                    className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 bg-[#F7F5F2] border border-[#141210]/10 p-4 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="preorder-check"
                                    checked={Boolean(formData.isPreBooking)}
                                    onChange={handlePreBookingToggle}
                                    className="w-4 h-4 accent-[#B4562F] rounded cursor-pointer"
                                />
                                <label htmlFor="preorder-check" className="text-[13px] font-medium text-[#2A2622] cursor-pointer select-none">
                                    Mark as Pre-Booking Only <span className="text-[#7C746B]">(Sets Price to PKR 0)</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3 bg-[#F7F5F2] border border-[#141210]/10 p-4 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="instock-check"
                                    checked={Boolean(formData.inStock)}
                                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                                    className="w-4 h-4 accent-[#22423A] rounded cursor-pointer"
                                />
                                <label htmlFor="instock-check" className="text-[13px] font-medium text-[#2A2622] cursor-pointer select-none">
                                    Currently In Stock
                                </label>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#7C746B]">Description *</label>
                                <button
                                    type="button"
                                    onClick={() => runAiListingGeneration()}
                                    disabled={isGeneratingAi || isSubmitting}
                                    className="btn inline-flex items-center gap-1.5 bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#B4562F] border border-[#141210]/12 px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingAi ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Generate with AI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <textarea
                                required
                                rows="3"
                                placeholder="Enter product details, condition, PTA status, etc. (or click Generate with AI)"
                                value={formData.description ?? ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 rounded-xl px-4 py-3 text-[13.5px] text-[#141210] placeholder:text-[#7C746B]/70 focus:bg-white focus:outline-none focus:border-[#141210] transition resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || isGeneratingAi}
                            className="btn btn-primary w-full py-4 rounded-full font-semibold text-[14px] tracking-tight cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="sheen"></span>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving Product...</span>
                                </>
                            ) : (
                                <span>{editingId ? "Update Product Listing" : "Create Product Listing"}</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Current Inventory List */}
                <div className="bg-white border border-[#141210]/8 rounded-[26px] p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#141210]/8">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-[#E9E3DB] rounded-full flex items-center justify-center text-[#141210]">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] text-[#7C746B] font-semibold uppercase tracking-[0.16em] block">Database Records</span>
                                <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#141210]">Current Inventory ({products.length})</h2>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={exportToCSV}
                            className="btn btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold cursor-pointer"
                        >
                            <span className="sheen"></span>
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-[#7C746B] text-[13.5px]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading inventory...</span>
                        </div>
                    ) : products.length === 0 ? (
                        <p className="text-[#7C746B] text-[13.5px] text-center py-8">No products found. Add your first listing above.</p>
                    ) : (
                        <div className="space-y-3">
                            {products.map((product, index) => {
                                const productId = getProp(product, 'id', 'Id', null);
                                const productTitle = getProp(product, 'title', 'Title', 'Unnamed Product');
                                const category = getProp(product, 'category', 'Category', 'General');
                                const storage = getProp(product, 'storage', 'Storage', 'Standard');
                                const pricePKR = getProp(product, 'pricePKR', 'PricePKR', 0);
                                const isInStock = Boolean(getProp(product, 'inStock', 'InStock', true));
                                const isPreBooking = Boolean(getProp(product, 'isPreBooking', 'IsPreBooking', false));

                                return (
                                    <div key={productId ?? index} className="flex items-center justify-between bg-[#F7F5F2] border border-[#141210]/8 p-4 sm:px-5 rounded-[18px] hover:border-[#141210]/20 transition">
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h4 className="text-[#141210] font-semibold text-[14px] tracking-[-0.015em]">{productTitle}</h4>
                                                {isInStock ? (
                                                    <span className="bg-[#22423A]/10 text-[#22423A] text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold">In Stock</span>
                                                ) : (
                                                    <span className="bg-[#B4562F]/12 text-[#B4562F] text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold">Out of Stock</span>
                                                )}
                                            </div>
                                            <p className="text-[#7C746B] text-[12.5px] mt-1 num-tabular">
                                                {category} • {storage} • {(isPreBooking || pricePKR === 0) ? 'Pre-Booking' : `PKR ${Number(pricePKR).toLocaleString()}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStock(productId)}
                                                className={`p-2 rounded-full transition cursor-pointer ${isInStock ? 'text-[#22423A] hover:bg-[#22423A]/10' : 'text-[#7C746B] hover:bg-[#E9E3DB]'}`}
                                                title={isInStock ? "Mark as Out of Stock" : "Mark as In Stock"}
                                            >
                                                {isInStock ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleEditClick(product)}
                                                className="text-[#B4562F] hover:bg-[#B4562F]/10 p-2 rounded-full transition cursor-pointer"
                                                title="Edit Product"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(productId)}
                                                className="text-[#141210]/70 hover:text-[#B4562F] hover:bg-[#B4562F]/10 p-2 rounded-full transition cursor-pointer"
                                                title="Delete Product"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}