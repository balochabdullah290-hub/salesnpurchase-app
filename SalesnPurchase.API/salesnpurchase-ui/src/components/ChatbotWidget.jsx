import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    X,
    Send,
    Bot,
    Sparkles,
    Loader2
} from 'lucide-react';

export default function ChatbotWidget({ products = [], onOpenTracker, onOpenCalculator, onOpenTradeIn }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: 'Salam! 👋 Welcome to SalesnPurchase. How can I assist you today?',
            options: [
                { label: '📱 Show Available iPhones', action: 'show_iphones' },
                { label: '📦 Track My Order', action: 'track_order' },
                { label: '🇵🇰 PTA Tax Duties', action: 'pta_info' },
                { label: '📍 Meetup Locations', action: 'meetups' }
            ]
        }
    ]);

    const chatEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const addBotMessage = (text, options = []) => {
        setMessages(prev => [
            ...prev,
            { id: Date.now(), sender: 'bot', text, options }
        ]);
    };

    // Autonomous Agent Action Interceptor with Regex Tag Cleanup
    const processAgentAction = (rawText) => {
        let cleanText = rawText || '';

        if (cleanText.includes('[ACTION:NAVIGATE_TRADEIN]')) {
            setTimeout(() => onOpenTradeIn?.(), 600);
        } else if (cleanText.includes('[ACTION:NAVIGATE_TRACKER]') || cleanText.includes('[ACTION:NAVIGATE')) {
            setTimeout(() => onOpenTracker?.(), 600);
        } else if (cleanText.includes('[ACTION:NAVIGATE_CALCULATOR]')) {
            setTimeout(() => onOpenCalculator?.(), 600);
        }

        // Safely strip complete or partial [ACTION:...] brackets out of the visible chat text
        cleanText = cleanText.replace(/\[ACTION:[^\]]*\]?/gi, '').trim();
        return cleanText;
    };

    const handleActionClick = (action) => {
        if (action === 'show_iphones') {
            const iphoneProducts = products.filter(p => {
                const title = String(p?.title || p?.Title || '').toLowerCase();
                const cat = String(p?.category || p?.Category || '').toLowerCase();
                return title.includes('iphone') || cat.includes('iphone');
            });

            const top3 = iphoneProducts.slice(0, 3);
            let replyText = "Here are some top available iPhone models in our store right now:\n\n";

            if (top3.length === 0) {
                replyText = "We currently have flagship devices coming in! You can browse our main catalog or contact us on WhatsApp for live stock.";
            } else {
                top3.forEach(p => {
                    const name = p?.title || p?.Title;
                    const price = p?.pricePKR ?? p?.PricePKR ?? 0;
                    const pta = p?.ptaStatus || p?.PtaStatus || p?.pta || 'PTA Status Verified';
                    replyText += `• ${name} (${p?.storage || p?.Storage || 'Standard'}) - ${price > 0 ? `PKR ${price.toLocaleString()}` : 'Pre-Booking'} [${pta}]\n`;
                });
            }

            addBotMessage(replyText, [
                { label: '📍 Meetup Locations', action: 'meetups' },
                { label: '💬 Chat on WhatsApp', action: 'whatsapp' }
            ]);
        } else if (action === 'track_order') {
            addBotMessage("Opening the Order Tracking portal for you right now!", []);
            onOpenTracker?.();
        } else if (action === 'pta_info') {
            addBotMessage("Opening the PTA Tax Duty calculator for you right now!", []);
            onOpenCalculator?.();
        } else if (action === 'meetups') {
            addBotMessage("We conduct safe, verified face-to-face deals in Islamabad & Rawalpindi at:\n\n📍 F-7 Markaz (Islamabad)\n📍 I-8 Markaz (Islamabad)\n📍 Commercial Market (Rawalpindi)\n\nYou can inspect the phone & verify PTA status before payment!", [
                { label: '💬 Schedule Meetup on WhatsApp', action: 'whatsapp' }
            ]);
        } else if (action === 'whatsapp') {
            window.open('https://wa.me/923000000000?text=Hi%20SalesnPurchase%20team,%20I%20have%20an%20inquiry%20about%20your%20stock%20and%20meetup.', '_blank');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userText = input.trim();
        const userMsg = { id: Date.now(), sender: 'user', text: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Ensure this URL matches your backend API controller port and route
            const res = await fetch('https://localhost:7266/api/Chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMessage: userText })
            });

            if (!res.ok) throw new Error("API Network Error");

            const data = await res.json();
            const rawAiReply = data.response || data.Response || data.reply || "I am here to help you with your Apple device queries!";

            // Intercept agent action commands and clean text tags
            const cleanAiReply = processAgentAction(rawAiReply);

            addBotMessage(cleanAiReply || "Opening that for you right now!", [
                { label: '📍 Meetup Locations', action: 'meetups' },
                { label: '💬 Talk on WhatsApp', action: 'whatsapp' }
            ]);
        } catch (err) {
            addBotMessage("I am having a temporary connection issue reaching the AI server. You can chat directly with our team on WhatsApp!", [
                { label: '💬 Connect on WhatsApp', action: 'whatsapp' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Floating Trigger Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        type="button"
                        className="btn btn-primary relative text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center"
                    >
                        <span className="sheen"></span>
                        <MessageCircle className="w-6 h-6 text-white" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22423A] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#22423A] border-2 border-white"></span>
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chatbot Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border border-[#141210]/12 rounded-[26px] w-[90vw] sm:w-[380px] h-[520px] shadow-2xl flex flex-col overflow-hidden text-[#141210]"
                    >
                        {/* Header */}
                        <div className="bg-[#F7F5F2] border-b border-[#141210]/10 p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#B4562F]/12 border border-[#B4562F]/20 text-[#B4562F] flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold tracking-[-0.02em] text-[#141210] flex items-center gap-1.5">
                                        SalesnPurchase AI Agent
                                        <Sparkles className="w-3.5 h-3.5 text-[#B4562F]" />
                                    </h3>
                                    <span className="text-[10.5px] text-[#22423A] font-medium flex items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#22423A] animate-pulse" />
                                        Autonomous Agent • Active
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full bg-white hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] border border-[#141210]/10 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Messages Body */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-white">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`flex items-start space-x-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                        {msg.sender === 'bot' && (
                                            <div className="w-7 h-7 rounded-full bg-[#F7F5F2] border border-[#141210]/12 text-[#B4562F] flex items-center justify-center shrink-0 mt-0.5">
                                                <Bot className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <div
                                            className={`p-3 rounded-[20px] whitespace-pre-wrap leading-relaxed border ${msg.sender === 'user'
                                                    ? 'bg-[#141210] text-white border-[#141210] rounded-br-sm'
                                                    : 'bg-[#F7F5F2] text-[#141210] border-[#141210]/8 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>

                                    {/* Action Quick-Reply Buttons */}
                                    {msg.options && msg.options.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2.5 ml-9">
                                            {msg.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleActionClick(opt.action)}
                                                    className="bg-[#F7F5F2] hover:bg-[#E9E3DB] text-[#2A2622] hover:text-[#141210] border border-[#141210]/12 text-[11px] font-semibold px-3 py-1.5 rounded-full transition cursor-pointer"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-center space-x-2 text-[#7C746B] bg-[#F7F5F2] border border-[#141210]/8 p-3 rounded-[18px] w-fit">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B4562F]" />
                                    <span className="text-[11px] font-medium">AI Agent executing action...</span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSend} className="p-3 bg-[#F7F5F2] border-t border-[#141210]/10 flex items-center space-x-2">
                            <input
                                type="text"
                                placeholder="Ask agent to open portals, check stock, calculate quotes..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                                className="flex-1 bg-white border border-[#141210]/12 focus:border-[#141210] text-[#141210] placeholder-[#7C746B]/80 rounded-full px-4 py-2 text-xs focus:outline-none transition disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary p-2.5 text-white rounded-full font-medium transition cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
                            >
                                <span className="sheen"></span>
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}