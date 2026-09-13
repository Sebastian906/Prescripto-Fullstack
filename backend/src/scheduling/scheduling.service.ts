import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Appointment, AppointmentDocument } from 'src/appointments/schemas/appointment.schema';
import { Doctor, DoctorDocument } from 'src/doctors/schemas/doctor.schema';
import { PriorityQueue } from 'src/shared/structures/priority-queue';
import { SchedulingSuggestionRequest, SchedulingSuggestionResult, SlotCandidate } from 'src/shared/structures/scheduling-types';
import { getAvailableSlots } from 'src/shared/utils/binary-search.util';
import { generateDaySlots } from 'src/shared/utils/slot-generator.util';

/** Pesos para la función de score greedy */
const WEIGHT_LOAD = -2;  // penaliza doctores sobrecargados
const WEIGHT_GAP = 1;  // premia huecos cómodos
const WEIGHT_MORNING = 1;  // premia horarios de mañana (heurística)
const URGENCY_BONUS = { urgent: 10, normal: 5, flexible: 0 };

@Injectable()
export class SchedulingService {
    constructor(
        @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
        @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
    ) { }

    /**
     * Punto de entrada principal.
     * Complejidad total: O(d * s * log s) donde d = días, s = slots/día (~22).
     * Prácticamente O(d) dado que s es constante y pequeño.
     */
    async suggestSlots(
        req: SchedulingSuggestionRequest,
    ): Promise<SchedulingSuggestionResult> {
        const { docId, preferredDates, priorityLevel, minGapMinutes = 30 } = req;

        if (!isValidObjectId(docId)) throw new BadRequestException('Invalid docId');

        const doctor = await this.doctorModel
            .findById(docId)
            .select('slots_booked available')
            .lean();

        if (!doctor) throw new NotFoundException('Doctor not found');
        if (!doctor.available) {
            return { suggestions: [], isIdeal: false, reason: 'Doctor is not available' };
        }

        const queue = new PriorityQueue<SlotCandidate>();

        for (const dateStr of preferredDates) {
            this.buildCandidatesForDate(dateStr, doctor, priorityLevel, minGapMinutes, queue);
        }

        const suggestions: SlotCandidate[] = [];
        while (!queue.isEmpty() && suggestions.length < 3) {
            const item = queue.extractMax();
            if (item) suggestions.push(item.value);
        }

        const isIdeal = suggestions.length > 0 && suggestions[0].score >= URGENCY_BONUS[priorityLevel];
        const reason = isIdeal
            ? 'Optimal slots found based on doctor availability and load'
            : 'Limited availability — consider expanding date range';

        return { suggestions, isIdeal, reason };
    }

    private buildCandidatesForDate(
        dateStr: string,
        doctor: { slots_booked?: Record<string, string[]> },
        priorityLevel: SchedulingSuggestionRequest['priorityLevel'],
        minGapMinutes: number,
        queue: PriorityQueue<SlotCandidate>,
    ): void {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return;
        const [d, m, y] = parts.map(Number);
        if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return;
        const date = new Date(y, m - 1, d);
        // round-trip: evita 32/13/2026 -> fecha válida distinta
        if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) return;

        const allSlots = generateDaySlots(date);

        // orden cronológico por minutos, no lexicográfico (rompía AM/PM)
        const booked: string[] = [...(doctor.slots_booked?.[dateStr] ?? [])]
            .sort((a, b) => this.parseHour(a) - this.parseHour(b));
        
        const available = getAvailableSlots(allSlots, booked);

        if (available.length === 0) return;

        const dayLoad = booked.length;

        for (let i = 0; i < available.length; i++) {
            const slotTime = available[i];
            const gapMinutes = this.computeGap(available, i, booked, minGapMinutes);
            const score = this.computeScore(priorityLevel, dayLoad, gapMinutes, slotTime);

            const candidate: SlotCandidate = { slotDate: dateStr, slotTime, doctorLoad: dayLoad, gapMinutes, score };
            queue.insert(candidate, score);
        }
    }

    private computeScore(
        priorityLevel: SchedulingSuggestionRequest['priorityLevel'],
        dayLoad: number,
        gapMinutes: number,
        slotTime: string,
    ): number {
        const morningBonus = this.parseHour(slotTime) < 13 ? WEIGHT_MORNING : 0;
        return (
            URGENCY_BONUS[priorityLevel] +
            WEIGHT_LOAD * dayLoad +
            WEIGHT_GAP * Math.min(gapMinutes / 30, 4) +
            morningBonus
        );
    }

    /**
     * Backtracking implícito: calcula cuántos minutos libres hay
     * después del slot actual antes de un slot ocupado.
     * Poda: si el gap ya satisface minGapMinutes, retorna inmediatamente.
     */
    private computeGap(
        available: string[],
        idx: number,
        booked: string[],
        _minGap: number,
    ): number {
        const currentHour = this.parseHour(available[idx]);
        if (Number.isNaN(currentHour)) return 0;
        for (const bookedSlot of booked) {
            const bookedHour = this.parseHour(bookedSlot);
            if (Number.isNaN(bookedHour)) continue;
            const diff = (bookedHour - currentHour) * 60;
            if (diff > 0) return diff;
        }
        // No hay citas posteriores ese día — gap "infinito", se normaliza a 120
        return 120;
    }

    private parseHour(timeStr: string): number {
        // "10:30 AM" → 10.5,  "02:00 PM" → 14
        const s = timeStr.trim().toUpperCase().replace(/\./g, '');
        // 24h: "14:30"
        const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
        if (m24) return Number(m24[1]) + Number(m24[2]) / 60;
        // 12h: "02:30 PM" / "2:30PM" / "10:30 A M"
        const m12 = s.match(/^(\d{1,2}):(\d{2})\s*([AP])\s*M?$/);
        if (!m12) return NaN;
        let h = Number(m12[1]);
        const m = Number(m12[2]);
        if (m12[3] === 'P' && h !== 12) h += 12;
        if (m12[3] === 'A' && h === 12) h = 0;
        return h + m / 60;
    }

    /** Criterio de poda Branch & Bound */
    private meetsBound(score: number, level: SchedulingSuggestionRequest['priorityLevel']): boolean {
        const thresholds = { urgent: 8, normal: 4, flexible: 1 };
        return score >= thresholds[level];
    }
}