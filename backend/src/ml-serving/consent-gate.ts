import { mongo } from 'mongoose';

/**
 * Consentimiento vigente por (userId, scope='ml_training'): gana la última
 * escritura, igual que ConsentService.hasGrantedScope.
 */
export async function loadGrantedMlConsentUserIds(
  db: mongo.Db,
): Promise<Set<string>> {
  const docs = await db
    .collection('consents')
    .find({ scope: 'ml_training' })
    .toArray();

  const latest = new Map<string, { status: string; at: number }>();
  for (const doc of docs) {
    const userId = String(doc.userId);
    const at = doc.updatedAt ? new Date(doc.updatedAt as Date).getTime() : 0;
    const previous = latest.get(userId);
    if (!previous || at >= previous.at) {
      latest.set(userId, { status: String(doc.status), at });
    }
  }

  return new Set(
    [...latest.entries()]
      .filter(([, value]) => value.status === 'granted')
      .map(([userId]) => userId),
  );
}
