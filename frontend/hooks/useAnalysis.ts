import { useState, useCallback, useRef } from "react";
import { importGame, analyzePosition, type ParsedGame, type AnalysisResult } from "@/lib/api";
import type { Move } from "@/components/MoveList";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PositionAnalysis {
    evaluation: number;
    mate: number | null;
    bestMove: string | null;
    bestMoveArrows: string[][];
    depth: number;
    pvLines: string[];
}

interface AnalysisState {
    fen: string;
    moves: Move[];
    currentMoveIndex: number;
    parsedGame: ParsedGame | null;

    // Current-position analysis (mirrors analysisByMoveIndex[currentMoveIndex])
    evaluation: number;
    mate: number | null;
    bestMove: string | null;
    bestMoveArrows: string[][];
    depth: number;

    // Per-move cache
    analysisByMoveIndex: Record<number, PositionAnalysis>;

    // Progress
    gameAnalysisProgress: { completed: number; total: number };

    // Flags
    isImporting: boolean;
    isAnalyzing: boolean;
    isGameAnalyzing: boolean;

    error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEFAULT_DEPTH = 18;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function looksLikeFen(input: string) {
    return /^[rnbqkpRNBQKP1-8/]+ [wb](?: |$)/.test(input.trim());
}

function getFenAtIndex(game: ParsedGame, index: number): string {
    return index === 0 ? game.initialFen : (game.moves[index - 1]?.fen ?? game.initialFen);
}

function getGameFens(game: ParsedGame): string[] {
    return [game.initialFen, ...game.moves.map((m) => m.fen)];
}

function toMoveList(game: ParsedGame): Move[] {
    const result: Move[] = [];
    for (let i = 0; i < game.moves.length; i += 2) {
        result.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: game.moves[i].san,
            black: game.moves[i + 1]?.san,
        });
    }
    return result;
}

function toPositionAnalysis(raw: AnalysisResult): PositionAnalysis {
    return {
        evaluation:     raw.evaluation,
        mate:           raw.mate,
        bestMove:       raw.bestMove || null,
        bestMoveArrows: (raw.best_move_arrows ?? []).filter(
            (a): a is string[] => Array.isArray(a) && a.length >= 2
        ),
        depth:   raw.depth,
        pvLines: raw.lines?.map((l) => l.moves).flat() ?? [],
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalysis() {
    const runIdRef = useRef(0);
    const wsRef    = useRef<WebSocket | null>(null);

    const [state, setState] = useState<AnalysisState>({
        fen:                  STARTING_FEN,
        moves:                [],
        currentMoveIndex:     0,
        parsedGame:           null,
        evaluation:           0,
        mate:                 null,
        bestMove:             null,
        bestMoveArrows:       [],
        depth:                0,
        analysisByMoveIndex:  {},
        gameAnalysisProgress: { completed: 0, total: 0 },
        isImporting:          false,
        isAnalyzing:          false,
        isGameAnalyzing:      false,
        error:                null,
    });

    // ── Single-position analysis (used when no game is loaded) ───────────────

    const analyze = useCallback(async (fen: string, depth = DEFAULT_DEPTH) => {
        setState((s) => ({ ...s, isAnalyzing: true, error: null }));
        try {
            const raw      = await analyzePosition({ fen, depth });
            const analysis = toPositionAnalysis(raw);
            setState((s) => ({
                ...s,
                evaluation:     analysis.evaluation,
                mate:           analysis.mate,
                bestMove:       analysis.bestMove,
                bestMoveArrows: analysis.bestMoveArrows,
                depth:          analysis.depth,
                isAnalyzing:    false,
            }));
        } catch (err) {
            setState((s) => ({
                ...s,
                isAnalyzing: false,
                error: err instanceof Error ? err.message : "Analysis failed",
            }));
        }
    }, []);

    // ── Move navigation ───────────────────────────────────────────────────────

    const goToMove = useCallback(
        (halfMoveIndex: number) => {
            setState((s) => {
                const game = s.parsedGame;
                if (!game) return s;

                const next     = Math.max(0, Math.min(halfMoveIndex, game.moves.length));
                const nextFen  = getFenAtIndex(game, next);
                const cached   = s.analysisByMoveIndex[next];

                return {
                    ...s,
                    currentMoveIndex: next,
                    fen:              nextFen,
                    // Show cached analysis immediately if available
                    ...(cached
                        ? {
                            evaluation:     cached.evaluation,
                            mate:           cached.mate,
                            bestMove:       cached.bestMove,
                            bestMoveArrows: cached.bestMoveArrows,
                            depth:          cached.depth,
                          }
                        : {}),
                };
            });
        },
        []
    );

    const goBack    = useCallback(() => setState((s) => {
        const game = s.parsedGame; if (!game) return s;
        const next = Math.max(0, s.currentMoveIndex - 1);
        return { ...s, currentMoveIndex: next, fen: getFenAtIndex(game, next),
                 ...(s.analysisByMoveIndex[next] ?? {}) };
    }), []);

    const goForward = useCallback(() => setState((s) => {
        const game = s.parsedGame; if (!game) return s;
        const next = Math.min(game.moves.length, s.currentMoveIndex + 1);
        return { ...s, currentMoveIndex: next, fen: getFenAtIndex(game, next),
                 ...(s.analysisByMoveIndex[next] ?? {}) };
    }), []);

    // ── PGN / FEN import → WebSocket stream ──────────────────────────────────

    const importPgn = useCallback(async (input: string) => {
        const trimmed = input.trim();
        const runId   = ++runIdRef.current;

        // Cancel any ongoing stream
        wsRef.current?.close();
        wsRef.current = null;

        setState((s) => ({
            ...s,
            analysisByMoveIndex:  {},
            gameAnalysisProgress: { completed: 0, total: 0 },
            isImporting:          true,
            isAnalyzing:          true,
            isGameAnalyzing:      true,
            error:                null,
        }));

        try {
            // 1. Parse PGN / FEN via backend
            const game = await importGame(
                looksLikeFen(trimmed) ? { fen: trimmed } : { pgn: trimmed }
            );

            if (runIdRef.current !== runId) return; // Superseded

            const gameFens = getGameFens(game);

            setState((s) => ({
                ...s,
                parsedGame:           game,
                moves:                toMoveList(game),
                fen:                  game.initialFen,
                currentMoveIndex:     0,
                isImporting:          false,
                gameAnalysisProgress: { completed: 0, total: gameFens.length },
            }));

            // 2. Stream evaluations over WebSocket
            const wsBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
                .replace(/^http/, "ws");

            await new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(`${wsBase}/analyze/stream`);
                wsRef.current = ws;

                // 5-minute hard timeout
                const timer = setTimeout(() => {
                    ws.close();
                    reject(new Error("Game analysis timed out after 5 minutes."));
                }, 300_000);

                ws.onopen = () => {
                    ws.send(JSON.stringify({ fens: gameFens, depth: DEFAULT_DEPTH }));
                };

                ws.onmessage = (event) => {
                    if (runIdRef.current !== runId) { ws.close(); return; }

                    const msg = JSON.parse(event.data as string) as {
                        type: string;
                        index?: number;
                        result?: AnalysisResult;
                        message?: string;
                    };

                    if (msg.type === "eval" && msg.index !== undefined && msg.result) {
                        const analysis = toPositionAnalysis(msg.result);
                        setState((s) => {
                            const next = {
                                ...s,
                                analysisByMoveIndex: {
                                    ...s.analysisByMoveIndex,
                                    [msg.index!]: analysis,
                                },
                                gameAnalysisProgress: {
                                    completed: s.gameAnalysisProgress.completed + 1,
                                    total:     s.gameAnalysisProgress.total,
                                },
                            };
                            // Update visible eval if this is the current position
                            if (msg.index === s.currentMoveIndex) {
                                next.evaluation     = analysis.evaluation;
                                next.mate           = analysis.mate;
                                next.bestMove       = analysis.bestMove;
                                next.bestMoveArrows = analysis.bestMoveArrows;
                                next.depth          = analysis.depth;
                            }
                            return next;
                        });
                    } else if (msg.type === "done") {
                        clearTimeout(timer);
                        ws.close();
                        wsRef.current = null;
                        resolve();
                    } else if (msg.type === "error" && !msg.index) {
                        // Only fatal if it's a stream-level error (no index)
                        clearTimeout(timer);
                        ws.close();
                        wsRef.current = null;
                        reject(new Error(msg.message ?? "Stream error"));
                    }
                };

                ws.onerror = () => {
                    clearTimeout(timer);
                    wsRef.current = null;
                    reject(new Error("WebSocket connection failed"));
                };

                ws.onclose = (event) => {
                    clearTimeout(timer);
                    wsRef.current = null;
                    // Only reject on unexpected close (not our own ws.close() calls)
                    if (!event.wasClean && runIdRef.current === runId) {
                        reject(new Error("WebSocket closed unexpectedly"));
                    }
                };
            });

            setState((s) => {
                if (runIdRef.current !== runId) return s;
                const curr = s.analysisByMoveIndex[s.currentMoveIndex];
                return {
                    ...s,
                    isAnalyzing:     false,
                    isGameAnalyzing: false,
                    gameAnalysisProgress: {
                        completed: gameFens.length,
                        total:     gameFens.length,
                    },
                    ...(curr
                        ? {
                            evaluation:     curr.evaluation,
                            mate:           curr.mate,
                            bestMove:       curr.bestMove,
                            bestMoveArrows: curr.bestMoveArrows,
                            depth:          curr.depth,
                          }
                        : {}),
                };
            });

        } catch (err) {
            if (runIdRef.current !== runId) return;
            setState((s) => ({
                ...s,
                isImporting:     false,
                isAnalyzing:     false,
                isGameAnalyzing: false,
                error: err instanceof Error ? err.message : "Import failed",
            }));
        }
    }, []);

    const clearError = useCallback(
        () => setState((s) => ({ ...s, error: null })),
        []
    );

    return {
        ...state,
        analyze,
        goToMove,
        goBack,
        goForward,
        importPgn,
        clearError,
    };
}
