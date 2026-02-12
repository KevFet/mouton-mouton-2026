"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en' | 'es_mx';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    fr: {
        title: 'Mouton Mouton',
        subtitle: 'L\'alliance des esprits coopératifs',
        play: 'Jouer',
        join: 'Rejoindre un salon',
        create: 'Créer un salon',
        rules: 'Règles',
        enter_code: 'Entrez le code',
        username: 'Pseudo',
        ready: 'Prêt',
        waiting_players: 'En attente de joueurs...',
        start_game: 'Lancer la partie',
        secure: 'SÉCURISER (Banque)',
        continue: 'CONTINUER (Risquer)',
        partner_typing: 'Votre partenaire écrit...',
        revelation: 'La Révélation',
        success: 'MATCH !',
        fail: 'DOMMAGE...',
        total_score: 'Score Total',
        temp_score: 'Cagnotte Temporaire',
        rules_text: "Dans le jeu Mouton Mouton, la communication non verbale est reine. À chaque tour, une carte phrase incomplète est révélée (ex. : “Une pizza sans…”), et chaque binôme doit simultanément donner une réponse. Si les deux mots concordent, la carte est gagnée et vous pouvez décider de continuer… ou de sécuriser les points. Car plus vous enchaînez les bonnes réponses, plus la récompense grimpe, mais un seul mot différent annule tout. Il faudra donc bien se connaître, mais aussi savoir prendre des risques ensemble, pour viser le score parfait !"
    },
    en: {
        title: 'Mouton Mouton',
        subtitle: 'The alliance of cooperative minds',
        play: 'Play',
        join: 'Join a room',
        create: 'Create a room',
        rules: 'Rules',
        enter_code: 'Enter code',
        username: 'Username',
        ready: 'Ready',
        waiting_players: 'Waiting for players...',
        start_game: 'Start game',
        secure: 'SECURE (Bank)',
        continue: 'CONTINUE (Risk)',
        partner_typing: 'Your partner is typing...',
        revelation: 'The Revelation',
        success: 'MATCH!',
        fail: 'TOO BAD...',
        total_score: 'Total Score',
        temp_score: 'Temp Pot',
        rules_text: "In the game Mouton Mouton, non-verbal communication is king. Each turn, an incomplete phrase card is revealed (e.g., “A pizza without…”), and each pair must simultaneously give an answer. If both words match, the card is won and you can decide to continue… or secure the points. Because the more you chain correct answers, the more the reward grows, but a single different word cancels everything. You will therefore have to know each other well, but also know how to take risks together, to aim for the perfect score!"
    },
    es_mx: {
        title: 'Mouton Mouton',
        subtitle: 'La alianza de mentes cooperativas',
        play: 'Jugar',
        join: 'Unirse a una sala',
        create: 'Crear sala',
        rules: 'Reglas',
        enter_code: 'Introduce el código',
        username: 'Nombre de usuario',
        ready: 'Listo',
        waiting_players: 'Esperando jugadores...',
        start_game: 'Iniciar juego',
        secure: 'ASEGURAR (Banco)',
        continue: 'CONTINUAR (Arriesgar)',
        partner_typing: 'Tu pareja está escribiendo...',
        revelation: 'La Revelación',
        success: '¡COINCIDENCIA!',
        fail: 'QUÉ LÁSTIMA...',
        total_score: 'Puntuación Total',
        temp_score: 'Pozo Temporal',
        rules_text: "En el juego Mouton Mouton, la comunicación no verbal es la reina. En cada turno, se revela una tarjeta con una frase incompleta (p. ej.: “Una pizza sin...”), y cada pareja debe dar una respuesta simultáneamente. Si ambas palabras coinciden, se gana la tarjeta y puedes decidir si continuar... o asegurar los puntos. Porque cuanto más encadenes respuestas correctas, más crece la recompensa, pero una sola palabra diferente lo anula todo. Por lo tanto, tendrán que conocerse bien, pero también saber correr riesgos juntos, ¡para aspirar a la puntuación perfecta!"
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('fr');

    const t = (key: string) => {
        return (translations[language] as any)[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider');
    return context;
}
