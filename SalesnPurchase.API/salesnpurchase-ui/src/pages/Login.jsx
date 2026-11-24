import React, { useState } from 'react';
import { loginUser } from '../api/axiosInstance';
import { Lock, User, LogIn } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await loginUser(username, password);
            alert('Login successful!');
            if (onLoginSuccess) {
                onLoginSuccess();
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || err.response?.data || 'Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto mb-3">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Admin Login</h2>
                    <p className="text-slate-400 text-xs mt-1">Enter your credentials to access inventory</p>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-slate-300 text-xs font-medium block mb-1">Username</label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                required
                                type="text"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-300 text-xs font-medium block mb-1">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                required
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                        <LogIn className="w-4 h-4" />
                        <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}