import { useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const Notifications = () => {

    const { notifications, unreadCount, loadNotifications, markNotificationRead, token } = useContext(AppContext)
    const { t } = useTranslation()
    const navigate = useNavigate()

    // Copy localizado por tipo de evento; el texto del backend queda de fallback.
    const itemTitle = (n) => t(`notifications.type.${n.type}.title`, { defaultValue: n.title })
    const itemBody = (n) => t(`notifications.type.${n.type}.body`, { defaultValue: n.body })

    // Marca leida y lleva a la cita relacionada (todas las notificaciones son de citas).
    const openNotification = (n) => {
        markNotificationRead(n._id)
        navigate('/my-appointments')
    }

    useEffect(() => {
        if (token) loadNotifications()
    }, [token])

    return (
        <div>
            <div className="flex items-center justify-between pb-3 mt-12 border-b border-slate-400">
                <p className="font-medium text-zinc-700">{t('notifications.title')}</p>
                {unreadCount > 0 && (
                    <span className="text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5">
                        {unreadCount}
                    </span>
                )}
            </div>

            {notifications.length === 0 ? (
                <p className="text-sm text-zinc-500 py-6">{t('notifications.empty')}</p>
            ) : (
                <ul>
                    {notifications.map((n) => (
                        <li
                            key={n._id}
                            onClick={() => openNotification(n)}
                            className={`flex items-start gap-3 py-4 border-b border-slate-300 cursor-pointer ${n.readAt ? 'opacity-60' : ''}`}
                        >
                            <span
                                className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${n.readAt ? 'bg-transparent' : 'bg-indigo-600'}`}
                            />
                            <div className="text-sm">
                                <p className="font-semibold text-neutral-800">{itemTitle(n)}</p>
                                <p className="text-zinc-600">{itemBody(n)}</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {new Date(n.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Notifications