import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Upload, X, AlertCircle, Sparkles, Smartphone, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function TradeInForm() {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        model: 'iPhone 11',
        storage: '128GB',
        ptaStatus: 'JV',
        condition: 'Minor Scratches',
        batteryHealth: 80,
        hasBox: false
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Handle file selections (1 to 6 photos)
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setError('');

        if (selectedFiles.length + files.length > 6) {
            setError('You can upload a maximum of 6 photos.');
            return;
        }

        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);

        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls((prev) => [...prev, ...newPreviews]);
    };

    const handleRemovePhoto = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedFiles.length === 0) {
            setError('Please upload at least 1 photo of your device.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const data = new FormData();
            data.append('customerName', formData.customerName);
            data.append('customerPhone', formData.customerPhone);
            data.append('customerEmail', formData.customerEmail);
            data.append('model', formData.model);
            data.append('storage', formData.storage);
            data.append('ptaStatus', formData.ptaStatus);
            data.append('condition', formData.condition);
            data.append('batteryHealth', formData.batteryHealth);
            data.append('hasBox', formData.hasBox);

            // Append each file under 'images' (or matching your ASP.NET Core IFormFile/IFormFileCollection param)
            selectedFiles.forEach((file) => {
                data.append('images', file);
            });

            await axiosInstance.post('/TradeIns', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Trade-in request submitted successfully!');

            // Reset form
            setSelectedFiles([]);
            setPreviewUrls([]);
        } catch (err) {
            console.error('Submission error:', err);
            setError(err.response?.data?.message || 'Failed to submit trade-in request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <form onSubmit={handleSubmit} className="bg-[#121824] border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div>
                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2">
                        <Sparkles className="w-3 h-3" />
                        <span>Instant Evaluation</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Sell or Trade-In Your Phone</h2>
                    <p className="text-slate-400 text-xs mt-1">Submit your device specifications and high-resolution photos for a competitive valuation.</p>
                </div>

                {/* Customer Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Your Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">WhatsApp / Phone Number *</label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. 03001234567"
                            value={formData.customerPhone}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Email Address</label>
                    <input
                        type="email"
                        placeholder="e.g. john@example.com (Optional)"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition shadow-inner"
                    />
                </div>

                {/* Device Spec Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800/80 pt-5">
                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Device Model</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. iPhone 13 Pro"
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Storage</label>
                        <select
                            value={formData.storage}
                            onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition cursor-pointer shadow-inner"
                        >
                            <option value="64GB">64GB</option>
                            <option value="128GB">128GB</option>
                            <option value="256GB">256GB</option>
                            <option value="512GB">512GB</option>
                            <option value="1TB">1TB</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">PTA Status</label>
                        <select
                            value={formData.ptaStatus}
                            onChange={(e) => setFormData({ ...formData, ptaStatus: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition cursor-pointer shadow-inner"
                        >
                            <option value="Approved">Official PTA Approved</option>
                            <option value="JV">JV (SIM Locked)</option>
                            <option value="Non-PTA">Non-PTA / Passport</option>
                            <option value="E-SIM">E-SIM Only</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Condition</label>
                        <input
                            type="text"
                            placeholder="e.g. Minor Scratches, 10/10 Like New"
                            value={formData.condition}
                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1.5">Battery Health (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="80"
                            value={formData.batteryHealth}
                            onChange={(e) => setFormData({ ...formData, batteryHealth: e.target.value })}
                            className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-3 bg-[#0B0F17] border border-slate-800 p-4 rounded-xl">
                    <input
                        type="checkbox"
                        id="hasbox-check"
                        checked={formData.hasBox}
                        onChange={(e) => setFormData({ ...formData, hasBox: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label htmlFor="hasbox-check" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                        Includes Original Box & Original Accessories
                    </label>
                </div>

                {/* Photo Upload Section */}
                <div className="border-t border-slate-800/80 pt-5">
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                        Upload Device Photos * <span className="text-slate-500">(1 to 6 images)</span>
                    </label>

                    {selectedFiles.length < 6 && (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-amber-400/80 rounded-2xl cursor-pointer bg-[#0B0F17] hover:bg-[#0B0F17]/80 transition group shadow-inner">
                            <Upload className="w-6 h-6 text-amber-400 group-hover:scale-110 transition duration-200 mb-2" />
                            <span className="text-xs text-slate-200 font-bold">Click to select device photos</span>
                            <span className="text-[11px] text-slate-500 mt-0.5">Upload front, back, camera bump, or side angles</span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </label>
                    )}

                    {error && (
                        <div className="flex items-center gap-1.5 mt-3 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Image Previews */}
                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-4">
                            {previewUrls.map((url, index) => (
                                <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black aspect-square shadow-md">
                                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePhoto(index)}
                                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-full shadow-lg transition cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                    <span>{submitting ? 'Submitting Valuation Request...' : `Submit Valuation Request (${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''})`}</span>
                </button>
            </form>
        </div>
    );
}