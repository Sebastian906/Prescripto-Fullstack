import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const bookingP95 = new Trend('booking_p95');

// Slots alineados a generateDaySlots (cada 30m). Colisión intencional y realista.
const SLOTS = [
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM',
];

export const options = {
    vus: 50,
    duration: '60s',
    thresholds: { http_req_duration: ['p(95)<800'] },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';
const DOC_ID = __ENV.DOC_ID || '';

if (!TOKEN || !DOC_ID) {
    throw new Error('TOKEN y DOC_ID requeridos: k6 run --env TOKEN=<t> --env DOC_ID=<id> scripts/k6/booking-smoke.js');
}

export default function () {
    const slotTime = SLOTS[__VU % SLOTS.length];
    const res = http.post(
        `${BASE}/api/appointments/book-appointment`,
        JSON.stringify({ docId: DOC_ID, slotDate: '20_7_2030', slotTime }),
        { headers: { 'Content-Type': 'application/json', token: TOKEN } },
    );
    bookingP95.add(res.timings.duration);
    check(res, { 'no 5xx': (r) => r.status < 500 });
    sleep(1);
}

// Alternativa sin k6 (aceptada por el issue):
// Atlas Shell o Compass: db.availabilities.find({doctorId:"<id>",date:"20_7_2025"}).explain("executionStats")
// OK = stage IXSCAN sobre {doctorId:1,date:1}, nReturned 1, totalDocsExamined 1.