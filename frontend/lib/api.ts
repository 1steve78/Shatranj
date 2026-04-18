// lib/api.ts — API layer for chess analysis backend

export interface AnalysisRequest {
    fen: string;
    depth?: number;
    multiPv?: number;
}

export interface AnalysisResult {
    evaluation: number;
    mate: number | null;
    bestMove: string;
    lines: PvLine[];
    depth: number;
    best_move_arrows?: string[][];
}

export interface PvLine {
    moves: string[];
    evaluation: number;
    mate: number | null;
}

export interface ChatRequest {
    fen: string;
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
    reply: string;
}

export interface MoveInsightInput {
    moveIndex: number;
    san: string;
    fen: string;
    evaluation?: number;
    mate?: number | null;
    bestMove?: string | null;
}

export interface PgnInsightsRequest {
    pgn: string;
    moves: MoveInsightInput[];
}

export interface MoveInsight {
    moveIndex: number;
    text: string;
}

export interface PgnInsightsResponse {
    insights: MoveInsight[];
}

export interface GameImportRequest {
    pgn?: string;
    fen?: string;
}

export interface ParsedGame {
    moves: { san: string; fen: string }[];
    headers: Record<string, string>;
    initialFen: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

// ─── Analysis ────────────────────────────────────────────────────────────────

export async function analyzePosition(req: AnalysisRequest): Promise<AnalysisResult> {
    return request<AnalysisResult>("/analyze", {
        method: "POST",
        body: JSON.stringify(req),
    });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
    return request<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify(req),
    });
}

export async function getPgnInsights(req: PgnInsightsRequest): Promise<PgnInsightsResponse> {
    return request<PgnInsightsResponse>("/chat/pgn-insights", {
        method: "POST",
        body: JSON.stringify(req),
    });
}

// Streaming variant — yields chunks as they arrive
export async function* streamChatMessage(req: ChatRequest): AsyncGenerator<string> {
    const res = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });
    if (!res.ok || !res.body) throw new Error(`Stream error ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
    }
}

// ─── Game Import ──────────────────────────────────────────────────────────────

export async function importGame(req: GameImportRequest): Promise<ParsedGame> {
    return request<ParsedGame>("/games/import", {
        method: "POST",
        body: JSON.stringify(req),
    });
}

// ─── Openings ─────────────────────────────────────────────────────────────────

export interface OpeningInfo {
    name: string;
    eco: string;
    pgn: string;
}

export async function lookupOpening(fen: string): Promise<OpeningInfo | null> {
    try {
        return await request<OpeningInfo>(`/opening?fen=${encodeURIComponent(fen)}`);
    } catch {
        return null;
    }
}
