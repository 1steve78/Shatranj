import { useState, useCallback, useRef } from "react";
import {
    analyzePosition,
    sendChatMessage,
    importGame,
    lookupOpening,
    type AnalysisResult,
    type ParsedGame,
    type OpeningInfo,
} from "@/lib/api";
import type { ChatMessage } from "@/components/ChatBox";
import type { Move } from "@/components/MoveList";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface AnalysisState {
    fen: string;
    evaluation: number;
    mate: number | null;
    bestMove: string | null;
    depth: number;
    moves: Move[];
    currentMoveIndex: number;
    parsedGame: ParsedGame | null;
    opening: OpeningInfo | null;
    chatMessages: ChatMessage[];
    isChatLoading: boolean;
    isAnalyzing: boolean;
    isImporting: boolean;
    error: string | null;
}

export function useAnalysis() {
    const [state, setState] = useState<AnalysisState>({
        fen: STARTING_FEN,
        evaluation: 0,
        mate: null,
        bestMove: null,
        depth: 0,
        moves: [],
        currentMoveIndex: 0,
        parsedGame: null,
        opening: null,
        chatMessages: [],
        isChatLoading: false,
        isAnalyzing: false,
        isImporting: false,
        error: null,
    });

    const abortRef = useRef<AbortController | null>(null);

    // ─── Analyze ──────────────────────────────────────────────────────────────
    const analyze = useCallback(async (fen: string, depth = 20) => {
        setState((s) => ({ ...s, isAnalyzing: true, error: null }));
        try {
            const result: AnalysisResult = await analyzePosition({ fen, depth });
            setState((s) => ({
                ...s,
                evaluation: result.evaluation,
                mate: result.mate,
                bestMove: result.bestMove,
                depth: result.depth,
                isAnalyzing: false,
            }));
        } catch (err) {
            setState((s) => ({
                ...s,
                isAnalyzing: false,
                error: err instanceof Error ? err.message : "Analysis failed",
            }));
        }
    }, []);

    // ─── Navigate moves ────────────────────────────────────────────────────────
    const goToMove = useCallback(
        async (halfMoveIndex: number) => {
            setState((s) => {
                if (!s.parsedGame) return s;
                const fenAtMove =
                    halfMoveIndex === 0
                        ? s.parsedGame.initialFen
                        : s.parsedGame.moves[halfMoveIndex - 1]?.fen ?? s.fen;
                return { ...s, currentMoveIndex: halfMoveIndex, fen: fenAtMove };
            });
            // Re-analyze after navigation
            setState((prev) => {
                analyze(prev.fen);
                return prev;
            });
        },
        [analyze]
    );

    const goBack = useCallback(() => {
        setState((s) => {
            const next = Math.max(0, s.currentMoveIndex - 1);
            const fenAtMove =
                next === 0
                    ? s.parsedGame?.initialFen ?? STARTING_FEN
                    : s.parsedGame?.moves[next - 1]?.fen ?? s.fen;
            return { ...s, currentMoveIndex: next, fen: fenAtMove };
        });
    }, []);

    const goForward = useCallback(() => {
        setState((s) => {
            if (!s.parsedGame) return s;
            const next = Math.min(s.parsedGame.moves.length, s.currentMoveIndex + 1);
            const fenAtMove = s.parsedGame.moves[next - 1]?.fen ?? s.fen;
            return { ...s, currentMoveIndex: next, fen: fenAtMove };
        });
    }, []);

    // ─── Import game ───────────────────────────────────────────────────────────
    const importPgn = useCallback(
        async (pgn: string) => {
            setState((s) => ({ ...s, isImporting: true, error: null }));
            try {
                const game = await importGame({ pgn });

                // Build Move[] for MoveList
                const moves: Move[] = [];
                for (let i = 0; i < game.moves.length; i += 2) {
                    const moveNum = Math.floor(i / 2) + 1;
                    moves.push({
                        moveNumber: moveNum,
                        white: game.moves[i].san,
                        black: game.moves[i + 1]?.san,
                    });
                }

                const opening = await lookupOpening(game.initialFen).catch(() => null);

                setState((s) => ({
                    ...s,
                    parsedGame: game,
                    moves,
                    opening,
                    fen: game.initialFen,
                    currentMoveIndex: 0,
                    isImporting: false,
                }));

                await analyze(game.initialFen);
            } catch (err) {
                setState((s) => ({
                    ...s,
                    isImporting: false,
                    error: err instanceof Error ? err.message : "Import failed",
                }));
            }
        },
        [analyze]
    );

    // ─── Chat ─────────────────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (content: string) => {
            const userMsg: ChatMessage = {
                id: `u-${Date.now()}`,
                role: "user",
                content,
                timestamp: new Date(),
            };

            setState((s) => ({
                ...s,
                chatMessages: [...s.chatMessages, userMsg],
                isChatLoading: true,
            }));

            try {
                const currentFen = state.fen;
                const history = state.chatMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

                const { reply } = await sendChatMessage({
                    fen: currentFen,
                    message: content,
                    history,
                });

                const assistantMsg: ChatMessage = {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    content: reply,
                    timestamp: new Date(),
                };

                setState((s) => ({
                    ...s,
                    chatMessages: [...s.chatMessages, assistantMsg],
                    isChatLoading: false,
                }));
            } catch (err) {
                const errorMsg: ChatMessage = {
                    id: `e-${Date.now()}`,
                    role: "assistant",
                    content: "Sorry, I couldn't process your request. Please try again.",
                    timestamp: new Date(),
                };
                setState((s) => ({
                    ...s,
                    chatMessages: [...s.chatMessages, errorMsg],
                    isChatLoading: false,
                    error: err instanceof Error ? err.message : "Chat error",
                }));
            }
        },
        [state.fen, state.chatMessages]
    );

    const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

    return {
        ...state,
        analyze,
        goToMove,
        goBack,
        goForward,
        importPgn,
        sendMessage,
        clearError,
    };
}