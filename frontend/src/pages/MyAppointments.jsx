import { useContext, useEffect, useState } from "react"
import { AppContext } from "../context/AppContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"

const MyAppointments = () => {

    const { backendUrl, token, getDoctorsData } = useContext(AppContext)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [appointments, setAppointments] = useState([])
    const [payingId, setPayingId] = useState(null)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('/')
        return dateArray[0] + ' ' + months[Number(dateArray[1]) - 1] + ' ' + dateArray[2]
    }

    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/appointments/user-appointments', {headers: {token}})
            if (data.success) {
                setAppointments(data.appointments.reverse())
                console.log(data.appointments);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

    const verifyStripeReturn = async (appointmentId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/appointments/verify-payment/${appointmentId}`, { headers: { token } })
            if (data.success) {
                toast.success('Payment completed successfully')
                getUserAppointments()
            } else {
                toast.error('Payment could not be verified, please try again')
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            navigate('/my-appointments', { replace: true })
        }
    }

    const cancelAppointment = async (appointmentId) => { 
        try {
            const { data } = await axios.patch(backendUrl + '/api/appointments/cancel-appointment', { appointmentId }, { headers: { token } })
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
        }
    }

    const payWithStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/appointments/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                window.location.href = data.url
            } else {
                toast.error('Could not initiate payment')
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            setPayingId(null)
        }
    }

    const payWithCOD = async (appointmentId) => {
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
            setPayingId(null)
        }
    }

    useEffect(() => {
        const paymentStatus = searchParams.get('payment')
        const appointmentId = searchParams.get('appointmentId')

        if (paymentStatus === 'success' && appointmentId) {
            verifyStripeReturn(appointmentId)
        } else if (paymentStatus === 'cancelled') {
            toast.info('Payment was cancelled')
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
            <p className="pb-3 mt-12 font-medium text-zinc-700 border-b border-slate-400">My Appointments</p>
            <div>
                {appointments.slice(0,3).map((item, index) => (
                    <div
                        className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b border-slate-300"
                        key={index}
                    >
                        <div>
                            <img
                                className="w-32 bg-indigo-200"
                                src={item.docData.image}
                                alt=""
                            />
                        </div>
                        <div className="flex-1 text-sm text-zinc-600">
                            <p className="text-neutral-800 font-semibold">{item.docData.name}</p>
                            <p>{item.docData.speciality}</p>
                            <p className="text-zinc-700 font-medium mt-1">Address:</p>
                            <p className="text-xs">{item.docData.address.line1}</p>
                            <p className="text-xs">{item.docData.address.line2}</p>
                            <p className="text-xs mt-1"><span className="text-sm text-neutral-700 font-medium">Date & Time:</span> {slotDateFormat(item.slotDate)} | {item.slotTime}</p>
                        </div>
                        <div></div>
                        <div className="flex flex-col gap-2 justify-end">
                            {!item.cancelled && !item.payment && (
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setPayingId(payingId === item._id ? null : item._id)}
                                        className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-indigo-500 hover:text-white transition-all duration-300 cursor-pointer w-full"
                                    >
                                        Pay Online
                                    </button>
                                    {payingId === item._id && (
                                        <div className="absolute right-0 mt-1 w-full sm:min-w-48 bg-white border border-slate-200 rounded shadow-md z-10 overflow-hidden">
                                            <button
                                                onClick={() => payWithStripe(item._id)}
                                                className="w-full text-left text-sm px-4 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                            >
                                                Pay with Stripe
                                            </button>
                                            <hr className="border-slate-100" />
                                            <button
                                                onClick={() => payWithCOD(item._id)}
                                                className="w-full text-left text-sm px-4 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                            >
                                                Cash on Delivery
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!item.cancelled && item.payment && (
                                <button className="sm:min-w-48 py-2 border border-green-600 rounded text-green-600 text-sm cursor-default">
                                    Paid
                                </button>
                            )}
                            {!item.cancelled && !item.payment && (
                                <button
                                    onClick={() => cancelAppointment(item._id)}
                                    className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300 cursor-pointer"
                                >
                                    Cancel appointment
                                </button>
                            )}
                            {item.cancelled && (
                                <button className="sm:min-w-48 py-2 border border-red-600 rounded text-red-600 text-sm cursor-default">
                                    Appointment cancelled
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MyAppointments