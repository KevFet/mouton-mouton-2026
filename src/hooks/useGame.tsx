"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Player {
    id: string;
    username: string;
    pair_id: string;
    is_host: boolean;
    is_ready: boolean;
}

export interface Room {
    id: string;
    code: string;
    status: string;
    current_prompt_id: string | null;
}

export interface Prompt {
    id: string;
    text_fr: string;
    text_en: string;
    text_es_mx: string;
}

export interface TurnAnswer {
    player_id: string;
    pair_id: string;
    answer: string;
    normalized_answer: string;
}

export interface PairScore {
    pair_id: string;
    score: number;
    temp_score: number;
    streak: number;
}

export function useGame(roomCode: string) {
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
    const [answers, setAnswers] = useState<TurnAnswer[]>([]);
    const [scores, setScores] = useState<PairScore[]>([]);
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [typingPlayers, setTypingPlayers] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const fetchRoomData = useCallback(async () => {
        // Get room
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', roomCode)
            .single();

        if (roomError || !roomData) return null;

        setRoom(roomData);

        // Get players
        const { data: playersData } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomData.id);

        if (playersData) setPlayers(playersData);

        // Get prompt if exists
        if (roomData.current_prompt_id) {
            const { data: promptData } = await supabase
                .from('prompts')
                .select('*')
                .eq('id', roomData.current_prompt_id)
                .single();
            if (promptData) setCurrentPrompt(promptData);
        }

        // Get current turn answers
        const { data: answersData } = await supabase
            .from('turn_answers')
            .select('*')
            .eq('room_id', roomData.id);

        if (answersData) setAnswers(answersData);

        // Get scores
        const { data: scoresData } = await supabase
            .from('pair_scores')
            .select('*')
            .eq('room_id', roomData.id);

        if (scoresData) setScores(scoresData);

        setLoading(false);
        return roomData;
    }, [roomCode]);

    useEffect(() => {
        fetchRoomData();

        const roomChannel = supabase.channel(`room:${roomCode}`, {
            config: {
                presence: {
                    key: currentPlayer?.id || 'anonymous',
                },
            },
        })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, () => {
                fetchRoomData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
                fetchRoomData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'turn_answers' }, () => {
                fetchRoomData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pair_scores' }, () => {
                fetchRoomData();
            })
            .on('presence', { event: 'sync' }, () => {
                const state = roomChannel.presenceState();
                const typing: Record<string, boolean> = {};
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => {
                        if (p.is_typing) typing[p.player_id] = true;
                    });
                });
                setTypingPlayers(typing);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && currentPlayer) {
                    await roomChannel.track({
                        player_id: currentPlayer.id,
                        is_typing: false,
                    });
                }
            });

        setChannel(roomChannel);

        return () => {
            supabase.removeChannel(roomChannel);
        };
    }, [roomCode, fetchRoomData, currentPlayer]); // Added currentPlayer to dependencies

    const joinRoom = async (username: string) => {
        if (!room) return;

        // Assign to a pair (simplistic: first two get pair1, next two pair2, etc.)
        const pairIndex = Math.floor(players.length / 2) + 1;
        const pairId = `pair${pairIndex}`;

        const { data: player, error } = await supabase
            .from('players')
            .insert({
                room_id: room.id,
                username,
                pair_id: pairId,
                is_host: players.length === 0
            })
            .select()
            .single();

        if (player) {
            setCurrentPlayer(player);
            // Init score if not exists
            await supabase.from('pair_scores').upsert({
                room_id: room.id,
                pair_id: pairId,
            }, { onConflict: 'room_id,pair_id' });
        }
        return { player, error };
    };

    const submitAnswer = async (answer: string) => {
        if (!room || !currentPlayer) return;

        const normalized = answer.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        const { error } = await supabase
            .from('turn_answers')
            .insert({
                room_id: room.id,
                player_id: currentPlayer.id,
                pair_id: currentPlayer.pair_id,
                answer,
                normalized_answer: normalized
            });

        return error;
    };

    const nextTurn = async () => {
        if (!room) return;

        // Get all prompts
        const { data: allPrompts } = await supabase.from('prompts').select('id');
        if (!allPrompts) return;

        // Random prompt
        const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];

        // Clear answers and update room status
        await supabase.from('turn_answers').delete().eq('room_id', room.id);
        await supabase.from('rooms').update({
            current_prompt_id: randomPrompt.id,
            status: 'playing'
        }).eq('id', room.id);
    };

    const setTyping = (isTyping: boolean) => {
        if (channel && currentPlayer) {
            channel.track({
                player_id: currentPlayer.id,
                is_typing: isTyping,
            });
        }
    };

    const handleFinishTurn = async (isMatch: boolean) => {
        if (!room || !currentPlayer) return;

        const currentScore = scores.find(s => s.pair_id === currentPlayer.pair_id);
        if (!currentScore) return;

        if (isMatch) {
            const newStreak = (currentScore.streak || 0) + 1;
            const pointsToAdd = 100 * Math.pow(2, newStreak - 1);

            await supabase.from('pair_scores').update({
                temp_score: (currentScore.temp_score || 0) + pointsToAdd,
                streak: newStreak
            }).eq('room_id', room.id).eq('pair_id', currentPlayer.pair_id);
        } else {
            await supabase.from('pair_scores').update({
                temp_score: 0,
                streak: 0
            }).eq('room_id', room.id).eq('pair_id', currentPlayer.pair_id);
        }
    };

    const secureScore = async () => {
        if (!room || !currentPlayer) return;
        const currentScore = scores.find(s => s.pair_id === currentPlayer.pair_id);
        if (!currentScore) return;

        await supabase.from('pair_scores').update({
            score: (currentScore.score || 0) + (currentScore.temp_score || 0),
            temp_score: 0,
            streak: 0
        }).eq('room_id', room.id).eq('pair_id', currentPlayer.pair_id);
    };

    return {
        room,
        players,
        currentPlayer,
        currentPrompt,
        answers,
        scores,
        typingPlayers,
        loading,
        joinRoom,
        submitAnswer,
        nextTurn,
        setTyping,
        handleFinishTurn,
        secureScore
    };
}
