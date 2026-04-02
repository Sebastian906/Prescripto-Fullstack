export interface SlotCandidate {
    slotDate: string;   // "15/7/2025"
    slotTime: string;   // "10:00 AM"
    doctorLoad: number; // citas del doctor ese día (0-N)
    gapMinutes: number; // minutos libres antes del siguiente slot ocupado
    score: number;      // calculado por el motor greedy
}

export interface SchedulingSuggestionRequest {
    docId: string;
    preferredDates: string[]; // hasta 7 fechas (DD/MM/YYYY)
    priorityLevel: 'urgent' | 'normal' | 'flexible';
    minGapMinutes?: number;   // hueco mínimo deseado entre citas
}

export interface SchedulingSuggestionResult {
    suggestions: SlotCandidate[];
    isIdeal: boolean;
    reason: string;
}