import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
    KeyRound,
    Sparkles,
    User,
    Lock,
    X,
    Loader2
} from 'lucide-react';

export default function AdminAuthModal({ onClose, onLoginSuccess, onSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let res;
            try {
                res = await axiosInstance.post('/Auth/login', {
                    username: username.trim(),
                    password
                });
            } catch (primaryErr) {
                if (primaryErr.response?.status === 404) {
                    res = await axiosInstance.post('/Admin/login', {
                        username: username.trim(),
                        password
                    });
                } else {
                    throw primaryErr;
                }
            }

            const payload = res.data || {};
            const token = payload.token || payload.Token || payload.accessToken || payload.data?.token;
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('authToken', token);
                localStorage.setItem('adminToken', token);
            }

            onLoginSuccess?.(payload);
            onSuccess?.(payload);
            onClose?.();
        } catch (err) {
            console.error('Admin auth failed:', err);
            setError(
                err.response?.data?.message ||
                err.response?.data?.title ||
                'Invalid credentials. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
            className="fixed inset-0 z-50 bg-[#141210]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
            <div className="bg-white border border-[#141210]/10 rounded-[26px] max-w-md w-full p-6 sm:p-8 relative shadow-2xl text-[#141210] space-y-6">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Admin Auth"
                    className="absolute top-4 right-4 p-2 rounded-full bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] transition cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Top Badge & Heading */}
                <div className="flex flex-col items-center text-center space-y-3 pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#B4562F]/12 border border-[#B4562F]/20 text-[#B4562F] flex items-center justify-center">
                        <KeyRound className="w-5 h-5" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-[#B4562F]/10 text-[#B4562F] border border-[#B4562F]/20 px-3.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.16em]">
                        <Sparkles className="w-3 h-3" />
                        <span>Restricted Portal</span>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#141210]">
                            Admin <span className="font-display italic text-[#B4562F]">Access.</span>
                        </h2>
                        <p className="text-xs text-[#7C746B]">
                            Enter your credentials to unlock the dashboard.
                        </p>
                    </div>
                </div>

                {/* Error Notice */}
                {error && (
                    <div className="p-3 rounded-2xl bg-[#B4562F]/10 border border-[#B4562F]/25 text-[#B4562F] text-xs font-medium text-center">
                        {error}
                    </div>
                )}

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="text-[11px] font-semibold text-[#2A2622] block mb-1.5">
                            Username
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-[#7C746B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                required
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-semibold text-[#2A2622] block mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-[#7C746B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                required
                                placeholder="Enter Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#F7F5F2] border border-[#141210]/12 focus:bg-white focus:border-[#141210] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#141210] placeholder:text-[#7C746B]/80 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3.5 px-6 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <span className="sheen"></span>
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{loading ? 'Unlocking...' : 'Unlock Dashboard'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}