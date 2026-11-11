import { useTranslation } from 'react-i18next'

const StarRating = ({ value = 0, onChange, readOnly = false }) => {
    const { t } = useTranslation()
    const safeValue = Math.min(5, Math.max(0, Number(value) || 0))

    if (readOnly) {
        return (
            <span
                role="img"
                aria-label={t('reviews.ratingLabel', { rating: safeValue })}
                className="text-amber-500"
            >
                {'★'.repeat(safeValue)}{'☆'.repeat(5 - safeValue)}
            </span>
        )
    }

    return (
        <div role="group" aria-label={t('reviews.scoreLabel')} className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    aria-label={t('reviews.starLabel', { value: star })}
                    aria-pressed={star <= safeValue}
                    onClick={() => onChange?.(star)}
                    className={`h-10 w-10 rounded text-2xl leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        star <= safeValue ? 'text-amber-500' : 'text-slate-300'
                    } hover:text-amber-400`}
                >
                    <span aria-hidden="true">{star <= safeValue ? '★' : '☆'}</span>
                </button>
            ))}
        </div>
    )
}

export default StarRating
