type Getter = { get: (key: string, fallback?: any) => any };

export interface JwtSecrets {
    current: string;
    previous: string;
    deadline?: Date;
}

// CURRENT = JWT_SECRET_CURRENT || JWT_SECRET (legacy). Never throws on missing deadline.
export function getJwtSecrets(config: Getter): JwtSecrets {
    const current = config.get('JWT_SECRET_CURRENT') || config.get('JWT_SECRET') || '';
    const previous = config.get('JWT_SECRET_PREVIOUS') || '';
    const raw = config.get('JWT_ROTATION_DEADLINE') || '';
    let deadline: Date | undefined;
    if (raw) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) deadline = d;
    }
    return { current, previous, deadline };
}

// Fail closed: previous is accepted only with a valid deadline and now <= deadline.
// Absent or malformed deadlines reject the previous secret (never accept indefinitely).
export function isPreviousAccepted(s: JwtSecrets, now = new Date()): boolean {
    if (!s.previous) return false;
    if (!s.deadline) return false;
    return now.getTime() <= s.deadline.getTime();
}