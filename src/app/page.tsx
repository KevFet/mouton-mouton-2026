"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import RulesModal from '@/components/RulesModal';
import { HelpCircle, ChevronRight, Globe2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = async () => {
    if (!username) return;
    setIsCreating(true);
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ code: newCode, status: 'lobby' })
      .select()
      .single();

    if (room) {
      // Store username in session storage to use later
      sessionStorage.setItem('mouton_username', username);
      router.push(`/room/${newCode}`);
    }
    setIsCreating(false);
  };

  const joinRoom = async () => {
    if (!username || !code) return;
    sessionStorage.setItem('mouton_username', username);
    router.push(`/room/${code.toUpperCase()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12"
      >
        <span className="px-4 py-1 rounded-full border border-white/20 text-xs font-bold tracking-[0.3em] uppercase mb-4 inline-block bg-white/5 backdrop-blur-md">
          Edition 2026
        </span>
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 italic bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
          {t('title').toUpperCase()}
        </h1>
        <p className="text-white/60 text-lg md:text-xl font-medium max-w-md mx-auto">
          {t('subtitle')}
        </p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <input
            type="text"
            placeholder={t('username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="glass-input text-center text-xl font-bold"
          />
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4 pt-4"
        >
          <div className="relative group">
            <input
              type="text"
              placeholder={t('enter_code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="glass-input text-center text-xl font-bold uppercase tracking-widest pl-12"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20">
              #
            </div>
          </div>

          <button
            onClick={joinRoom}
            disabled={!username || !code}
            className="glass-button bg-white text-black hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {t('join')} <ChevronRight size={20} />
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-white/20 text-xs font-bold uppercase tracking-widest">OR</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <button
            onClick={createRoom}
            disabled={!username || isCreating}
            className="glass-button border-white/10 hover:border-white/20"
          >
            {isCreating ? '...' : t('create')}
          </button>
        </motion.div>
      </div>

      {/* Utilities Toolbar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 glass flex items-center p-2 rounded-full border-white/10 gap-2">
        <button
          onClick={() => setIsRulesOpen(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <HelpCircle size={24} />
        </button>
        <div className="w-[1px] h-6 bg-white/10" />
        <div className="flex items-center gap-1">
          {(['fr', 'en', 'es_mx'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${language === l ? 'bg-white text-black' : 'text-white/40 hover:text-white/80'
                }`}
            >
              {l.replace('_mx', '')}
            </button>
          ))}
        </div>
      </div>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
