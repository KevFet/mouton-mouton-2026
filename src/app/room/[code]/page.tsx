"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, Player, TurnAnswer } from '@/hooks/useGame';
import { useLanguage } from '@/hooks/useLanguage';
import confetti from 'canvas-confetti';
import { HelpCircle, Send, Home, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import RulesModal from '@/components/RulesModal';

export default function GameRoom() {
    const { code } = useParams();
    const router = useRouter();
    const { t, language } = useLanguage();
    const { room, players, currentPlayer, currentPrompt, answers, scores, typingPlayers, loading, joinRoom, submitAnswer, nextTurn, setTyping, handleFinishTurn, secureScore } = useGame(code as string);

    const [isRulesOpen, setIsRulesOpen] = useState(false);
    const [answerInput, setAnswerInput] = useState('');
    const [showRevelation, setShowRevelation] = useState(false);
    const [revelationResult, setRevelationResult] = useState<'match' | 'mismatch' | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Auto-join if username is in session storage
    useEffect(() => {
        if (!loading && room && !currentPlayer) {
            const username = sessionStorage.getItem('mouton_username');
            if (username) {
                joinRoom(username);
            } else {
                router.push('/');
            }
        }
    }, [loading, room, currentPlayer, joinRoom, router]);

    // Handle Revelation Logic
    useEffect(() => {
        if (!currentPlayer) return;

        // Find my partner's answer
        const pairAnswers = answers.filter(a => a.pair_id === currentPlayer.pair_id);

        if (pairAnswers.length === 2 && !showRevelation) {
            setShowRevelation(true);
            const [a1, a2] = pairAnswers;
            const isMatch = a1.normalized_answer === a2.normalized_answer;

            setRevelationResult(isMatch ? 'match' : 'mismatch');

            // Elect one player in the duo to handle score update to avoid race conditions
            const pairPlayers = players.filter(p => p.pair_id === currentPlayer.pair_id).sort((a, b) => a.id.localeCompare(b.id));
            if (pairPlayers[0]?.id === currentPlayer.id) {
                handleFinishTurn(isMatch);
            }

            if (isMatch) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#39ff14', '#ffffff', '#00ff00']
                });
                // Play success sound (TODO: add sound)
            } else {
                // Play fail sound (TODO: add sound)
            }

            // Automatically reset after 5 seconds if host, or show buttons
        }
    }, [answers, currentPlayer, showRevelation]);

    const handleSubmit = async () => {
        if (!answerInput || hasSubmitted) return;
        setHasSubmitted(true);
        setTyping(false);
        await submitAnswer(answerInput);
    };

    const handleAnswerChange = (val: string) => {
        setAnswerInput(val);
        if (!hasSubmitted) {
            setTyping(val.length > 0);
        }
    };

    if (loading || !room) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full"
                />
            </div>
        );
    }

    // Lobby View
    if (room.status === 'lobby') {
        return (
            <div className="max-w-4xl mx-auto p-6 min-h-screen flex flex-col items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-8 text-center"
                >
                    <div>
                        <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">{t('title')}</h2>
                        <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border-white/20">
                            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Room Code:</span>
                            <span className="text-xl font-black tracking-widest text-[#39ff14]">{code}</span>
                        </div>
                    </div>

                    <div className="bento-grid mt-12">
                        <div className="glass-card flex flex-col items-center justify-center border-white/10">
                            <span className="text-white/40 text-xs font-bold uppercase mb-4 tracking-widest">Players</span>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {players.map((p) => (
                                    <div key={p.id} className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border-white/10">
                                        <div className={`w-2 h-2 rounded-full ${p.is_ready ? 'bg-[#39ff14]' : 'bg-white/20'}`} />
                                        <span className="font-bold">{p.username}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card flex flex-col items-center justify-center border-white/10">
                            <span className="text-white/40 text-xs font-bold uppercase mb-4 tracking-widest">Ready up</span>
                            {currentPlayer?.is_host && players.length >= 2 ? (
                                <button onClick={() => nextTurn()} className="glass-button bg-[#39ff14] text-black w-full flex items-center justify-center gap-2">
                                    <Play size={20} fill="currentColor" /> {t('start_game')}
                                </button>
                            ) : (
                                <p className="text-white/60 font-medium italic">{t('waiting_players')}</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Playing View
    return (
        <div className="max-w-2xl mx-auto p-6 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
                {!showRevelation ? (
                    <motion.div
                        key="question"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="w-full space-y-8"
                    >
                        {/* Prompt Card */}
                        <div className="glass-card p-12 text-center border-white/20 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] mb-4 block">Question</span>
                            <h3 className="text-4xl md:text-5xl font-black leading-tight tracking-tight italic">
                                {currentPrompt ? (currentPrompt as any)[`text_${language}`] : '...'}
                            </h3>
                        </div>

                        {/* Input Phase */}
                        {!hasSubmitted ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="..."
                                    value={answerInput}
                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    className="glass-input text-3xl font-black text-center py-8 border-white/20"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!answerInput}
                                    className="w-full glass-button bg-white text-black flex items-center justify-center gap-3 py-6"
                                >
                                    SUBMIT <Send size={24} />
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-card text-center py-12 border-white/10 border-dashed"
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-4 h-4 rounded-full bg-[#39ff14] shadow-[0_0_15px_#39ff14]"
                                    />
                                    <p className="text-xl font-bold italic text-white/60">
                                        {Object.entries(typingPlayers).some(([pid, isTyping]) => {
                                            const p = players.find(player => player.id === pid);
                                            return isTyping && p?.pair_id === currentPlayer?.pair_id && p?.id !== currentPlayer?.id;
                                        }) ? t('partner_typing') : 'Waiting for partner...'}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="revelation"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-xl"
                    >
                        <div className={`shards ${revelationResult === 'mismatch' ? 'active' : ''}`} />

                        <div className="relative w-full max-w-4xl flex items-center justify-center gap-4 md:gap-12 flex-col md:flex-row mb-12">
                            {/* Collision Animation */}
                            {answers.filter(a => a.pair_id === currentPlayer?.pair_id).map((ans, i) => (
                                <motion.div
                                    key={ans.player_id}
                                    initial={{ x: i === 0 ? -300 : 300, opacity: 0, rotate: i === 0 ? -10 : 10 }}
                                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 10 }}
                                    className="glass-card flex-1 min-w-[280px] text-center border-white/30 p-8"
                                >
                                    <span className="text-white/20 text-xs font-black uppercase mb-4 block">
                                        {players.find(p => p.id === ans.player_id)?.username}
                                    </span>
                                    <div className="text-4xl font-black uppercase tracking-tighter italic">
                                        {ans.answer}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ scale: 0, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className={`text-6xl md:text-8xl font-black tracking-tighter italic mb-4 drop-shadow-2xl ${revelationResult === 'match' ? 'text-[#39ff14] drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]' : 'text-[#ff3131] drop-shadow-[0_0_20px_rgba(255,49,49,0.5)]'
                                }`}
                        >
                            {revelationResult === 'match' ? t('success') : t('fail')}
                        </motion.div>

                        {/* Score Display */}
                        <div className="flex gap-8 mb-12">
                            <div className="text-center">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1">{t('total_score')}</span>
                                <span className="text-3xl font-black">{scores.find(s => s.pair_id === currentPlayer?.pair_id)?.score || 0}</span>
                            </div>
                            <div className="text-center">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1">{t('temp_score')}</span>
                                <span className={`text-3xl font-black ${revelationResult === 'match' ? 'text-[#39ff14]' : 'text-[#ff3131]'}`}>
                                    {scores.find(s => s.pair_id === currentPlayer?.pair_id)?.temp_score || 0}
                                </span>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="flex flex-col md:flex-row gap-4 w-full max-w-md"
                        >
                            {revelationResult === 'match' ? (
                                <>
                                    <button onClick={() => { setShowRevelation(false); setHasSubmitted(false); nextTurn(); }} className="glass-button bg-[#39ff14] text-black flex-1 py-6">
                                        {t('continue')}
                                    </button>
                                    <button onClick={async () => { await secureScore(); setShowRevelation(false); setHasSubmitted(false); nextTurn(); }} className="glass-button border-white/20 flex-1 py-6 bg-white/5">
                                        {t('secure')}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => { setShowRevelation(false); setHasSubmitted(false); nextTurn(); }} className="glass-button border-white/20 w-full py-6">
                                    NEXT TURN
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsRulesOpen(true)}
                className="fixed top-10 right-10 w-12 h-12 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-colors z-30"
            >
                <HelpCircle size={24} />
            </button>

            <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        </div>
    );
}
