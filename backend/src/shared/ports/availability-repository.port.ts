// The Mongoose adapter (in availability module infra) implements this and
// delegates to the existing AvailabilityService logic (claimSlot / releaseSlot
// / getBookedSlots, MAX_SLOTS_PER_DAY cap, normalizeSlotDate). Domain keeps
// normalization and cap rules; this port only abstracts persistence.

export interface ClaimResult {
  claimed: boolean;
  reason?: 'taken' | 'capped';
}

// adapter casts it to ClientSession. Upgrade path: branded TxSession type if
// a second adapter (e.g. in-memory for tests) needs stricter typing.
export interface AvailabilityRepository {
  claimSlot(
    doctorId: string,
    rawDate: string,
    slotTime: string,
    session?: unknown,
  ): Promise<ClaimResult>;
  releaseSlot(
    doctorId: string,
    rawDate: string,
    slotTime: string,
    session?: unknown,
  ): Promise<void>;
  getBookedSlots(doctorId: string, rawDate: string): Promise<string[]>;
}

export const AVAILABILITY_REPOSITORY = Symbol('AvailabilityRepository');