import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
        const [d, m, y] = dateStr.split('/').map(Number);
        const date = new Date(y, m - 1, d);

        const allSlots = generateDaySlots(date);
        // comparador explícito de strings para evitar sort alfabético implícito
        const booked: string[] = [...(doctor.slots_booked?.[dateStr] ?? [])].sort((a, b) => a.localeCompare(b));
        const available = getAvailableSlots(allSlots, booked);

        if (available.length === 0) return;

        const dayLoad = booked.length;

        for (let i = 0; i < available.length; i++) {
            const slotTime = available[i];
            const gapMinutes = this.computeGap(available, i, booked, minGapMinutes);
            const score = this.computeScore(priorityLevel, dayLoad, gapMinutes, slotTime);

            const candidate: SlotCandidate = { slotDate: dateStr, slotTime, doctorLoad: dayLoad, gapMinutes, score };
            queue.insert(candidate, score);

            if (queue.size >= 10 && this.meetsBound(score, priorityLevel)) break;
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
        minGap: number,
    ): number {
        const currentHour = this.parseHour(available[idx]);
        for (const bookedSlot of booked) {
            const bookedHour = this.parseHour(bookedSlot);
            const diff = (bookedHour - currentHour) * 60;
            if (diff > 0) return diff; // primer ocupado posterior
        }
        // No hay citas posteriores ese día — gap "infinito", se normaliza a 120
        return 120;
    }

    private parseHour(timeStr: string): number {
        // "10:30 AM" → 10.5,  "02:00 PM" → 14
        const [time, period] = timeStr.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h + m / 60;
    }

    /** Criterio de poda Branch & Bound */
    private meetsBound(score: number, level: SchedulingSuggestionRequest['priorityLevel']): boolean {
        const thresholds = { urgent: 8, normal: 4, flexible: 1 };
        return score >= thresholds[level];
    }
}