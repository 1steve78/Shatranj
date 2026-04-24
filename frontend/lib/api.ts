// lib/api.ts — API layer for chess analysis backend

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`API error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisRequest {
    fen: string;
    depth?: number;
}

export interface PvLine {
    moves: string[];
    evaluation: number;
    mate: number | null;
}

export interface AnalysisResult {
    evaluation:       number;
    mate:             number | null;
    bestMove:         string;
    lines:            PvLine[];
    depth:            number;
    best_move_arrows?: string[][];
}

export interface GameImportRequest {
    pgn?: string;
    fen?: string;
}

export interface ParsedGame {
    moves:      { san: string; fen: string; moveNumber?: number }[];
    headers:    Record<string, string>;
    initialFen: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export async function analyzePosition(req: AnalysisRequest): Promise<AnalysisResult> {
    return request<AnalysisResult>("/analyze", {
        method: "POST",
        body:   JSON.stringify(req),
    });
}

// ─── Game Import ──────────────────────────────────────────────────────────────

export async function importGame(req: GameImportRequest): Promise<ParsedGame> {
    return request<ParsedGame>("/games/import", {
        method: "POST",
        body:   JSON.stringify(req),
    });
}
