import { useContext, useEffect, useRef, useState } from "react"
import { AppContext } from "../context/AppContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import ReviewModal from "../components/ReviewModal"

/** Wait between Stripe verification attempts. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const MyAppointments = () => {

    const { backendUrl, token, getDoctorsData, doctors } = useContext(AppContext)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()

    const [appointments, setAppointments] = useState([])
    const [reviewTarget, setReviewTarget] = useState(null)
    const [payingId, setPayingId] = useState(null)
    const paymentsInFlight = useRef(new Set())
    const cancelInFlight = useRef(false)
    const mountedRef = useRef(true)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('/')
        return dateArray[0] + ' ' + months[Number(dateArray[1]) - 1] + ' ' + dateArray[2]
    }

    /** Load the patient appointments; ignore responses after unmount. */
    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/appointments/user-appointments', {headers: {token}})
            if (mountedRef.current && data.success) {
                setAppointments(data.appointments)
            }
        } catch (error) {
            console.log(error);
            if (mountedRef.current) toast.error(error.message)
        }
    }

    /** Translate the backend payment state returned by verify-payment. */
    const paymentMessage = (message) => {
        if (message === 'Payment was refunded') return t('myAppointments.paymentRefunded')
        if (message === 'Payment not completed') return t('myAppointments.paymentNotCompleted')
        if (message === 'Appointment is cancelled') return t('myAppointments.paymentAppointmentCancelled')
        return message
    }

    /** Poll Stripe verification three times, stopping if the page unmounts. */
    const verifyStripeReturn = async (appointmentId) => {
        let lastMessage = ''

        try {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const { data } = await axios.get(backendUrl + `/api/appointments/verify-payment/${appointmentId}`, { headers: { token } })
                    if (!mountedRef.current) return
                    if (data.success) {
                        toast.success(t('myAppointments.paymentSuccess'))
                        getUserAppointments()
                        return
                    }

                    lastMessage = data.message || ''
                    if (lastMessage !== 'Payment not completed') break
                } catch (error) {
                    console.log(error)
                    lastMessage = error?.response?.data?.message || error.message || ''
                }

                if (attempt < 2) await sleep(1500)
                if (!mountedRef.current) return
            }

            if (!mountedRef.current) return
            toast.error(paymentMessage(lastMessage) || t('myAppointments.paymentVerifyFailed'))
        } finally {
            if (mountedRef.current) navigate('/my-appointments', { replace: true })
        }
    }

    /** Cancel an appointment, warning first when it was already paid. */
    const cancelAppointment = async (appointment) => {
        if (cancelInFlight.current) return
        if (appointment.payment && !window.confirm(t('myAppointments.cancelPaidWarning'))) return

        cancelInFlight.current = true
        try {
            const { data } = await axios.patch(backendUrl + '/api/appointments/cancel-appointment', { appointmentId: appointment._id }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
                getDoctorsData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        } finally {
            cancelInFlight.current = false
        }
    }

    /** Start Stripe checkout, locking only this appointment's pay action. */
    const payWithStripe = async (appointmentId) => {
        if (paymentsInFlight.current.has(appointmentId)) return
        paymentsInFlight.current.add(appointmentId)
        let navigating = false
        try {
            const { data } = await axios.post(backendUrl + '/api/appointments/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                navigating = true
                window.location.href = data.url
                return
            }
            toast.error(t('myAppointments.paymentInitError'))
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            if (!navigating) {
                paymentsInFlight.current.delete(appointmentId)
                setPayingId(null)
            }
        }
    }

    /** Confirm cash payment and refresh the row. */
    const payWithCOD = async (appointmentId) => {
        if (paymentsInFlight.current.has(appointmentId)) return
        paymentsInFlight.current.add(appointmentId)
        try {
            const { data } = await axios.patch(backendUrl + '/api/appointments/payment-cod', { appointmentId }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            paymentsInFlight.current.delete(appointmentId)
            setPayingId(null)
        }
    }

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    useEffect(() => {
        const paymentStatus = searchParams.get('payment')
        const appointmentId = searchParams.get('appointmentId')

        if (paymentStatus === 'success' && appointmentId) {
            verifyStripeReturn(appointmentId)
        } else if (paymentStatus === 'cancelled') {
            toast.info(t('myAppointments.paymentCancelled'))
            navigate('/my-appointments', { replace: true })
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = () => setPayingId(null)
        if (payingId) document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [payingId])

    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    return (
        <div>
            <p className="pb-3 mt-12 font-medium text-zinc-700 border-b border-slate-400">
                {t('myAppointments.title')}
            </p>
            <div>
                {appointments.map((item, index) => {
                    // Snapshot del doctor al reservar; si viene incompleto (filas antiguas)
                    // cae al doctor actual cargado en el contexto, buscado por docId.
                    const doc = item.docData?.name
                        ? item.docData
                        : (doctors.find((d) => d._id === item.docId) || {})
                    return (
                    <div
                        className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b border-slate-300"
                        key={index}
                    >
                        <div>
                            <img className="w-32 bg-indigo-200" src={doc.image} alt="" />
                        </div>
                        <div className="flex-1 text-sm text-zinc-600">
                            <p className="text-neutral-800 font-semibold">{doc.name}</p>
                            <p>{doc.speciality}</p>
                            <p className="text-zinc-700 font-medium mt-1">{t('myAppointments.address')}</p>
                            <p className="text-xs">{doc.address?.line1}</p>
                            <p className="text-xs">{doc.address?.line2}</p>
                            <p className="text-xs mt-1">
                                <span className="text-sm text-neutral-700 font-medium">{t('myAppointments.dateTime')}</span>{' '}
                                {slotDateFormat(item.slotDate)} | {item.slotTime}
                            </p>
                        </div>
                        <div />
                        <div className="flex flex-col gap-2 justify-end">
                            {!item.cancelled && !item.payment && !item.isCompleted && (
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setPayingId(payingId === item._id ? null : item._id)}
                                        className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-indigo-500 hover:text-white transition-all duration-300 cursor-pointer w-full"
                                    >
                                        {t('myAppointments.payOnline')}
                                    </button>
                                    {payingId === item._id && (
                                        <div className="absolute right-0 mt-1 w-full sm:min-w-48 bg-white border border-slate-200 rounded shadow-md z-10 overflow-hidden">
                                            <button
                                                onClick={() => payWithStripe(item._id)}
                                                className="w-full text-left text-sm px-4 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                            >
                                                {t('myAppointments.payWithStripe')}
                                            </button>
                                            <hr className="border-slate-100" />
                                            <button
                                                onClick={() => payWithCOD(item._id)}
                                                className="w-full text-left text-sm px-4 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                            >
                                                {t('myAppointments.cashOnDelivery')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!item.cancelled && item.payment && !item.isCompleted && (
                                <button className="sm:min-w-48 py-2 border border-green-600 rounded text-green-600 text-sm cursor-default">
                                    {t('myAppointments.paid')}
                                </button>
                            )}
                            {!item.cancelled && !item.isCompleted && (
                                <button
                                    onClick={() => cancelAppointment(item)}
                                    className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300 cursor-pointer"
                                >
                                    {t('myAppointments.cancelAppointment')}
                                </button>
                            )}
                            {item.cancelled && !item.isCompleted && (
                                <button className="sm:min-w-48 py-2 border border-red-600 rounded text-red-600 text-sm cursor-default">
                                    {t('myAppointments.appointmentCancelled')}
                                </button>
                            )}
                            {item.cancelled && item.cancellationReason && (
                                <p className="text-xs text-stone-400 text-center mt-1">
                                    {t('myAppointments.cancellationReason')}: {item.cancellationReason}
                                </p>
                            )}
                            {item.isCompleted && (
                                <button className="sm:min-w-48 py-2 border border-green-600 rounded text-green-600">
                                    {t('myAppointments.completed')}
                                </button>
                            )}
                            {item.isCompleted && !item.cancelled && (
                                <button
                                    onClick={() => setReviewTarget(item)}
                                    className="text-sm text-indigo-600 text-center sm:min-w-48 py-2 border border-indigo-500 rounded hover:bg-indigo-500 hover:text-white transition-all duration-300 cursor-pointer"
                                >
                                    {t('reviews.rate')}
                                </button>
                            )}
                        </div>
                    </div>
                    )
                })}
            </div>
            {reviewTarget && (
                <ReviewModal
                    appointmentId={reviewTarget._id}
                    onClose={() => setReviewTarget(null)}
                    onSaved={() => {
                        setReviewTarget(null)
                        getUserAppointments()
                    }}
                />
            )}
            <div className="mt-6">
                <button
                    onClick={() => navigate('/my-records')}
                    className="min-h-11 text-sm border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                    {t('myAppointments.viewRecords')}
                </button>
            </div>
        </div>
    )
}

export default MyAppointments