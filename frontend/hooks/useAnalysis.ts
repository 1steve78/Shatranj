import { useState, useCallback, useRef } from "react";
import {
    analyzePosition,
    sendChatMessage,
    getPgnInsights,
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
    bestMoveArrows: string[][];
    depth: number;
    moves: Move[];
    currentMoveIndex: number;
    parsedGame: ParsedGame | null;
    opening: OpeningInfo | null;
    analysisByMoveIndex: Record<number, PositionAnalysis>;
    moveInsightsByIndex: Record<number, string>;
    currentMoveInsight: string | null;
    gameAnalysisProgress: { completed: number; total: number };
    chatMessages: ChatMessage[];
    isChatLoading: boolean;
    isAnalyzing: boolean;
    isGameAnalyzing: boolean;
    isImporting: boolean;
    error: string | null;
}

export type PositionAnalysis = Pick<AnalysisState, "evaluation" | "mate" | "bestMove" | "bestMoveArrows" | "depth">;

function looksLikeFen(input: string) {
    return /^[rnbqkpRNBQKP1-8/]+ [wb](?: |$)/.test(input.trim());
}

function getFenAtMove(game: ParsedGame, halfMoveIndex: number) {
    return halfMoveIndex === 0
        ? game.initialFen
        : game.moves[halfMoveIndex - 1]?.fen ?? game.initialFen;
}

function toMoveList(game: ParsedGame): Move[] {
    const moves: Move[] = [];

    for (let i = 0; i < game.moves.length; i += 2) {
        moves.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: game.moves[i].san,
            black: game.moves[i + 1]?.san,
        });
    }

    return moves;
}

function toArrowList(result: AnalysisResult) {
    return (result.best_move_arrows ?? []).filter(
        (arrow): arrow is string[] =>
            Array.isArray(arrow) && arrow.length >= 2 && arrow.every((sq) => typeof sq === "string")
    );
}

function toPositionAnalysis(result: AnalysisResult): PositionAnalysis {
    return {
        evaluation: result.evaluation,
        mate: result.mate,
        bestMove: result.bestMove,
        bestMoveArrows: toArrowList(result),
        depth: result.depth,
    };
}

function getGameFens(game: ParsedGame) {
    return [game.initialFen, ...game.moves.map((move) => move.fen)];
}

export function useAnalysis() {
    const analysisRunRef = useRef(0);
    const wsRef = useRef<WebSocket | null>(null);

    const [state, setState] = useState<AnalysisState>({
        fen: STARTING_FEN,
        evaluation: 0,
        mate: null,
        bestMove: null,
        bestMoveArrows: [],
        depth: 0,
        moves: [],
        currentMoveIndex: 0,
        parsedGame: null,
        opening: null,
        analysisByMoveIndex: {},
        moveInsightsByIndex: {},
        currentMoveInsight: null,
        gameAnalysisProgress: { completed: 0, total: 0 },
        chatMessages: [],
        isChatLoading: false,
        isAnalyzing: false,
        isGameAnalyzing: false,
        isImporting: false,
        error: null,
    });

    const analyze = useCallback(async (fen: string, depth = 20) => {
        setState((s) => ({ ...s, isAnalyzing: true, error: null }));

        try {
            const result = await analyzePosition({ fen, depth });
            const analysis = toPositionAnalysis(result);
            setState((s) => ({
                ...s,
                ...analysis,
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

    const goToMove = useCallback(
        (halfMoveIndex: number) => {
            const game = state.parsedGame;
            if (!game) return;

            const next = Math.max(0, Math.min(halfMoveIndex, game.moves.length));
            const nextFen = getFenAtMove(game, next);
            const cachedAnalysis = state.analysisByMoveIndex[next];
            const currentMoveInsight = state.moveInsightsByIndex[next] ?? null;

            setState((s) => ({
                ...s,
                ...(cachedAnalysis ?? {}),
                currentMoveInsight,
                currentMoveIndex: next,
                fen: nextFen,
            }));

            if (!cachedAnalysis && !state.isGameAnalyzing) {
                void analyze(nextFen);
            } else if (!cachedAnalysis && state.isGameAnalyzing && wsRef.current?.readyState === WebSocket.OPEN) {
                // Focus bump for priority queue
                wsRef.current.send(JSON.stringify({ type: "focus", index: next }));
            }
        },
        [analyze, state.analysisByMoveIndex, state.isGameAnalyzing, state.moveInsightsByIndex, state.parsedGame]
    );

    const goBack = useCallback(() => {
        if (!state.parsedGame) return;
        goToMove(state.currentMoveIndex - 1);
    }, [goToMove, state.currentMoveIndex, state.parsedGame]);

    const goForward = useCallback(() => {
        if (!state.parsedGame) return;
        goToMove(state.currentMoveIndex + 1);
    }, [goToMove, state.currentMoveIndex, state.parsedGame]);

    const importPgn = useCallback(
        async (input: string) => {
            const trimmed = input.trim();
            const runId = analysisRunRef.current + 1;
            analysisRunRef.current = runId;

            setState((s) => ({
                ...s,
                analysisByMoveIndex: {},
                moveInsightsByIndex: {},
                currentMoveInsight: null,
                gameAnalysisProgress: { completed: 0, total: 0 },
                isImporting: true,
                isAnalyzing: true,
                isGameAnalyzing: true,
                error: null,
            }));

            try {
                const game = await importGame(
                    looksLikeFen(trimmed) ? { fen: trimmed } : { pgn: trimmed }
                );
                const gameFens = getGameFens(game);
                const openingPromise = lookupOpening(game.initialFen).catch(() => null);

                setState((s) => ({
                    ...s,
                    parsedGame: game,
                    moves: toMoveList(game),
                    fen: game.initialFen,
                    currentMoveIndex: 0,
                    isImporting: false,
                    gameAnalysisProgress: { completed: 0, total: gameFens.length },
                }));

                const analysisEntries: [number, PositionAnalysis][] = [];
                const wsUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");
                
                await new Promise<void>((resolve, reject) => {
                    const ws = new WebSocket(`${wsUrl}/analyze/stream`);
                    wsRef.current = ws;
                    let completedCount = 0;

                    ws.onopen = () => {
                        ws.send(JSON.stringify({ fens: gameFens, depth: 15 }));
                    };

                    ws.onmessage = (event) => {
                        if (analysisRunRef.current !== runId) {
                            ws.close();
                            wsRef.current = null;
                            return;
                        }

                        const data = JSON.parse(event.data);
                        if (data.type === "eval") {
                            const result = toPositionAnalysis(data.result);
                            analysisEntries.push([data.index, result]);
                            completedCount++;
                            
                            setState((s) => ({
                                ...s,
                                analysisByMoveIndex: {
                                    ...s.analysisByMoveIndex,
                                    [data.index]: result
                                },
                                gameAnalysisProgress: {
                                    completed: completedCount,
                                    total: gameFens.length,
                                }
                            }));
                        } else if (data.type === "done") {
                            ws.close();
                            wsRef.current = null;
                            resolve();
                        } else if (data.type === "error") {
                            ws.close();
                            wsRef.current = null;
                            reject(new Error(data.message));
                        }
                    };

                    ws.onerror = () => {
                        wsRef.current = null;
                        reject(new Error("WebSocket error"));
                    };
                });

                const opening = await openingPromise;
                const analysisByMoveIndex = Object.fromEntries(analysisEntries) as Record<number, PositionAnalysis>;
                const moveInsightsByIndex = !looksLikeFen(trimmed) && game.moves.length > 0
                    ? Object.fromEntries(
                        (await getPgnInsights({
                            pgn: trimmed,
                            moves: game.moves.map((move, index) => {
                                const moveIndex = index + 1;
                                const analysis = analysisByMoveIndex[moveIndex];

                                return {
                                    moveIndex,
                                    san: move.san,
                                    fen: move.fen,
                                    evaluation: analysis?.evaluation,
                                    mate: analysis?.mate,
                                    bestMove: analysis?.bestMove,
                                };
                            }),
                        }).catch(() => ({ insights: [] }))).insights.map((insight) => [
                            insight.moveIndex,
                            insight.text,
                        ])
                    ) as Record<number, string>
                    : {};

                setState((s) => {
                    if (analysisRunRef.current !== runId) return s;

                    const currentAnalysis = analysisByMoveIndex[s.currentMoveIndex] ?? analysisByMoveIndex[0];
                    const currentMoveInsight = moveInsightsByIndex[s.currentMoveIndex] ?? null;

                    return {
                        ...s,
                        ...(currentAnalysis ?? {}),
                        opening,
                        analysisByMoveIndex,
                        moveInsightsByIndex,
                        currentMoveInsight,
                        isAnalyzing: false,
                        isGameAnalyzing: false,
                        gameAnalysisProgress: {
                            completed: gameFens.length,
                            total: gameFens.length,
                        },
                    };
                });
            } catch (err) {
                if (analysisRunRef.current !== runId) return;

                setState((s) => ({
                    ...s,
                    isImporting: false,
                    isAnalyzing: false,
                    isGameAnalyzing: false,
                    error: err instanceof Error ? err.message : "Import failed",
                }));
            }
        },
        []
    );

    const sendMessage = useCallback(
        async (content: string) => {
            const userMsg: ChatMessage = {
                id: `u-${Date.now()}`,
                role: "user",
                content,
                timestamp: new Date(),
            };
            const history = state.chatMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            setState((s) => ({
                ...s,
                chatMessages: [...s.chatMessages, userMsg],
                isChatLoading: true,
            }));

            try {
                const { reply } = await sendChatMessage({
                    fen: state.fen,
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
        [state.chatMessages, state.fen]
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
