import React, { useState, useEffect } from 'react';
import AdminTradeIns from './AdminTradeIns'; // Ensure relative path matches your directory

const API_BASE_URL = 'http://localhost:5184/api'; // Adjust port if needed

export default function Admin() {
    const [activeTab, setActiveTab] = useState('preorders');

    // --- PRE-ORDERS STATE ---
    const [preOrders, setPreOrders] = useState([]);
    const [loadingPreOrders, setLoadingPreOrders] = useState(false);

    // --- PRODUCTS STATE ---
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productForm, setProductForm] = useState({
        title: '',
        category: 'iPhone',
        storage: '128GB',
        pricePKR: '',
        condition: 'New',
        description: '',
        imageUrl: ''
    });

    useEffect(() => {
        if (activeTab === 'preorders') fetchPreOrders();
        if (activeTab === 'products') fetchProducts();
    }, [activeTab]);

    // ==========================================
    // PRE-ORDERS API HANDLERS
    // ==========================================
    const fetchPreOrders = async () => {
        setLoadingPreOrders(true);
        try {
            const res = await fetch(`${API_BASE_URL}/PreOrders`);
            if (res.ok) {
                const data = await res.json();
                setPreOrders(data);
            }
        } catch (err) {
            console.error('Failed to fetch pre-orders:', err);
        } finally {
            setLoadingPreOrders(false);
        }
    };

    const handleUpdatePreOrderStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`${API_BASE_URL}/PreOrders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchPreOrders();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleDeletePreOrder = async (id) => {
        if (!window.confirm('Are you sure you want to delete this pre-order?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/PreOrders/${id}`, { method: 'DELETE' });
            if (res.ok) setPreOrders(preOrders.filter(p => p.id !== id));
        } catch (err) {
            console.error('Failed to delete pre-order:', err);
        }
    };

    // ==========================================
    // PRODUCTS API HANDLERS
    // ==========================================
    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const res = await fetch(`${API_BASE_URL}/Products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/Products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...productForm,
                    pricePKR: parseFloat(productForm.pricePKR) || 0
                })
            });

            if (res.ok) {
                alert('Product added successfully!');
                setProductForm({
                    title: '',
                    category: 'iPhone',
                    storage: '128GB',
                    pricePKR: '',
                    condition: 'New',
                    description: '',
                    imageUrl: ''
                });
                fetchProducts();
            }
        } catch (err) {
            console.error('Failed to create product:', err);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Delete this product listing?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/Products/${id}`, { method: 'DELETE' });
            if (res.ok) setProducts(products.filter(p => p.id !== id));
        } catch (err) {
            console.error('Failed to delete product:', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans">
            {/* HEADER NAVBAR */}
            <header className="border-b border-slate-800/80 bg-[#0d1322] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500 text-black p-1.5 rounded-lg font-black text-xl tracking-wider">
                        📱 SalesnPurchase
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                    >
                        🏠 Back to Store
                    </button>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 text-sm font-medium hover:bg-red-900/30 transition"
                    >
                        🚪 Logout
                    </button>
                    <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-full font-medium">
                        🛡️ Face-to-Face Deals
                    </span>
                </div>
            </header>

            {/* NAVIGATION TABS */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center gap-2 mb-8 bg-[#111827] p-1.5 rounded-xl border border-slate-800/80 w-fit">
                    <button
                        onClick={() => setActiveTab('preorders')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'preorders'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        📋 Customer Pre-Orders
                    </button>

                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'products'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        📦 Manage Products & Prices
                    </button>

                    <button
                        onClick={() => setActiveTab('tradeins')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'tradeins'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        🔄 Trade-In Requests
                    </button>
                </div>

                {/* TAB 1: CUSTOMER PRE-ORDERS */}
                {activeTab === 'preorders' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white">Customer Pre-Orders</h1>
                                <p className="text-slate-400 text-sm">Real-time device reservations and booking leads</p>
                            </div>
                            <button
                                onClick={fetchPreOrders}
                                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                                title="Refresh List"
                            >
                                🔄
                            </button>
                        </div>

                        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0e1422] text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-4">Customer</th>
                                        <th className="px-5 py-4">Phone / WhatsApp</th>
                                        <th className="px-5 py-4">City</th>
                                        <th className="px-5 py-4">Model</th>
                                        <th className="px-5 py-4">Notes</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                                    {loadingPreOrders ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-400">Loading pre-orders...</td>
                                        </tr>
                                    ) : preOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-400">No pre-orders found.</td>
                                        </tr>
                                    ) : (
                                        preOrders.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-800/30 transition">
                                                <td className="px-5 py-4 font-semibold text-white">{item.customerName}</td>
                                                <td className="px-5 py-4 font-mono text-amber-400">📞 {item.customerPhone}</td>
                                                <td className="px-5 py-4 text-slate-400">📍 {item.city || 'N/A'}</td>
                                                <td className="px-5 py-4 font-medium text-white">📱 {item.model || item.productTitle}</td>
                                                <td className="px-5 py-4 text-slate-400 text-xs max-w-xs truncate">{item.notes || '-'}</td>
                                                <td className="px-5 py-4">
                                                    <select
                                                        value={item.status || 'CONFIRMED'}
                                                        onChange={(e) => handleUpdatePreOrderStatus(item.id, e.target.value)}
                                                        className="bg-amber-950/40 text-amber-400 border border-amber-800/60 rounded px-2.5 py-1 text-xs font-bold focus:outline-none"
                                                    >
                                                        <option value="CONFIRMED" className="bg-slate-900 text-amber-400">CONFIRMED</option>
                                                        <option value="CONTACTED" className="bg-slate-900 text-blue-400">CONTACTED</option>
                                                        <option value="COMPLETED" className="bg-slate-900 text-emerald-400">COMPLETED</option>
                                                        <option value="CANCELLED" className="bg-slate-900 text-red-400">CANCELLED</option>
                                                    </select>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a
                                                            href={`https://wa.me/${item.customerPhone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 text-xs font-semibold flex items-center gap-1 transition"
                                                        >
                                                            💬 WhatsApp
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeletePreOrder(item.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-400 transition"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: MANAGE PRODUCTS & PRICES */}
                {activeTab === 'products' && (
                    <div className="space-y-8">
                        {/* ADD PRODUCT FORM */}
                        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Create Product Listing</h2>
                            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Product Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. iPhone 15 Pro Max"
                                        value={productForm.title}
                                        onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                                    <select
                                        value={productForm.category}
                                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="iPhone">iPhone</option>
                                        <option value="Samsung">Samsung</option>
                                        <option value="GooglePixel">Google Pixel</option>
                                        <option value="AirPodsPakistani">AirPods / Accessories</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Storage</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 256GB"
                                        value={productForm.storage}
                                        onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Price (PKR)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="e.g. 180000"
                                        value={productForm.pricePKR}
                                        onChange={(e) => setProductForm({ ...productForm, pricePKR: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Condition</label>
                                    <select
                                        value={productForm.condition}
                                        onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="New">New / Sealed</option>
                                        <option value="Used">Used / Excellent</option>
                                        <option value="Refurbished">Refurbished</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Image URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={productForm.imageUrl}
                                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <button
                                        type="submit"
                                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-lg transition"
                                    >
                                        Create Product Listing
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* CURRENT INVENTORY */}
                        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Current Inventory</h2>
                            <div className="space-y-3">
                                {loadingProducts ? (
                                    <p className="text-slate-400 text-sm">Loading inventory...</p>
                                ) : products.length === 0 ? (
                                    <p className="text-slate-400 text-sm">No products listed yet.</p>
                                ) : (
                                    products.map((prod) => (
                                        <div
                                            key={prod.id}
                                            className="flex items-center justify-between p-4 bg-[#090d16] border border-slate-800/80 rounded-lg hover:border-slate-700 transition"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-base">{prod.title}</span>
                                                    <span className="bg-emerald-950/60 text-emerald-400 text-xs px-2 py-0.5 rounded font-semibold border border-emerald-800/50">
                                                        In Stock
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {prod.category} • {prod.storage} • <span className="text-amber-400 font-semibold">PKR {prod.pricePKR?.toLocaleString()}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleDeleteProduct(prod.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 transition"
                                                    title="Delete Product"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: TRADE-IN REQUESTS */}
                {activeTab === 'tradeins' && <AdminTradeIns />}
            </main>
        </div>
    );
}