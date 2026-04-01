import { useCallback, useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AppContext } from "../context/AppContext"
import { assets } from "../assets/assets"
import RelatedDoctors from "../components/RelatedDoctors"
import { toast } from "react-toastify"
import axios from "axios"

function generateDateRange(daysAhead = 7) {
    const today = new Date()
    return Array.from({ length: daysAhead }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        return d
    })
}

function dateToSlotKey(date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctorsData } = useContext(AppContext)
    const navigate = useNavigate()
    const [docInfo, setDocInfo] = useState(null)
    const [docSlots, setDocSlots] = useState([])
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [availableSlots, setAvailableSlots] = useState([])
    const dateRange = generateDateRange(7)

    useEffect(() => {
        const found = doctors.find((d) => d._id === docId)
        setDocInfo(found ?? null)
    }, [doctors, docId])

    const fetchSlots = useCallback(
        async (date) => {
            if (!docInfo) return
            setLoadingSlots(true)
            setSlotTime('')
            try {
                const dateKey = dateToSlotKey(date)
                const { data } = await axios.get(`${backendUrl}/api/appointments/available-slots`, { params: { docId, date: dateKey } })
                if (data.success) {
                    setAvailableSlots(data.slots)
                }
            } catch {
                toast.error('Could not load available slots')
                setAvailableSlots([])
            } finally {
                setLoadingSlots(false)
            }
        }, [docInfo, docId, backendUrl],
    )

    useEffect(() => {
        if (docInfo) fetchSlots(dateRange[slotIndex])
    }, [docInfo, slotIndex])

    const getAvailableSlots = async () => {
        setDocSlots([])

        // getting current date
        let today = new Date()
        for (let i = 0; i < 7; i++) {
            let currentDate = new Date(today)
            currentDate.setDate(today.getDate() + i)

            // setting end time of the date with index
            let endTime = new Date()
            endTime.setDate(today.getDate() + i)
            endTime.setHours(21, 0, 0, 0)

            // setting hours
            if (today.getDate() === currentDate.getDate()) {
                currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
                currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
            } else {
                currentDate.setHours(10)
                currentDate.setMinutes(0)
            }

            let timeSlots = []

            while (currentDate < endTime) {
                let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                let day = currentDate.getDate()
                let month = currentDate.getMonth() + 1
                let year = currentDate.getFullYear()

                const slotDate = day + "/" + month + "/" + year
                const slotTime = formattedTime

                const isSlotAvailable = docInfo.slots_booked[slotDate] && docInfo.slots_booked[slotDate].includes(slotTime) ? false : true

                if (isSlotAvailable) {
                    // add slot to array
                    timeSlots.push({
                        datetime: new Date(currentDate),
                        time: formattedTime
                    })
                }

                // Increment current time by 30 minutes
                currentDate.setMinutes(currentDate.getMinutes() + 30)
            }

            setDocSlots(prev => ([...prev, timeSlots]))

        }
    }

    const bookAppointment = async () => {
        if (!token) {
            toast.warn('Please login to book an appointment')
            return navigate('/login')
        }

        if (!slotTime) {
            toast.warn('Please select a time slot')
            return
        }

        try {
            const slotDate = dateToSlotKey(dateRange[slotIndex])
            const { data } = await axios.post(`${backendUrl}/api/appointments/book-appointment`, { docId, slotDate, slotTime }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                getDoctorsData()
                navigate('/my-appointments')
            } else {
                toast.error('Slot not available, please select another slot')
                fetchSlots(dateRange[slotIndex])
            }
        } catch (error) {
            const msg = error?.response?.data?.message ?? 'Slot not available'
            toast.error(msg)
            fetchSlots(dateRange[slotIndex])
        }
    }

    useEffect(() => {
        getAvailableSlots()
    }, [docInfo])

    useEffect(() => {
        console.log(docSlots);
    }, [docSlots])

    if (!docInfo) return null
    

    return docInfo && (
        <div>
            {/* DETALLES DEL DOCTOR */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div>
                    <img
                        className="bg-indigo-500 w-full sm:max-w-72 rounded-lg"
                        src={docInfo.image}
                        alt={docInfo.name}
                    />
                </div>
                <div className="flex-1 border border-slate-400 rounded-lg p-8 py-7 bg-indigo-100 mx-2 sm:mx-0 -mt-20 sm:mt-0">
                    {/* INFORMACIÓN DEL DOCTOR */}
                    <p className="flex items-center gap-2 text-2xl font-medium text-slate-900">
                        {docInfo.name}
                        <img
                            className="w-5"
                            src={assets.verified_icon}
                            alt=""
                        />
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-1 text-slate-600">
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className="py-0.5 px-2 border text-xs rounded-full">
                            {docInfo.experience}
                        </button>
                    </div>
                    {/* SOBRE EL DOCTOR */}
                    <div>
                        <p className="flex items-center gap-1 text-sm font-medium text-slate-900 mt-3">
                            About <img src={assets.info_icon} alt="" />
                        </p>
                        <p className="text-sm text-slate-500 max-w-175 mt-1">
                            {docInfo.about}
                        </p>
                    </div>
                    <p className="text-slate-500 font-medium mt-4">
                        Appointment fee: <span className="text-slate-800">{currencySymbol}{docInfo.fees}</span>
                    </p>
                </div>
            </div>

            {/* HORARIOS DISPONIBLES */}
            <div className="sm:ml-72 sm:pl-4 mt-4 font-medium text-slate-700">
                <p>Booking slots</p>
                <div className="flex gap-3 items-center w-full overflow-x-scroll mt-4">
                    {dateRange.map((date, index) => (
                        <div
                            key={index}
                            onClick={() => setSlotIndex(index)}
                            className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index
                                    ? 'bg-indigo-500 text-white'
                                    : 'border border-slate-300'
                                }`}
                        >
                            <p>{DAYS[date.getDay()]}</p>
                            <p>{date.getDate()}</p>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3 w-full overflow-x-scroll mt-4 min-h-12">
                    {loadingSlots ? (
                        <p className="text-sm text-slate-400 animate-pulse">
                            Loading slots…
                        </p>
                    ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            No slots available for this day
                        </p>
                    ) : (
                        availableSlots.map((time, index) => (
                            <p
                                key={index}
                                onClick={() => setSlotTime(time)}
                                className={`text-sm font-light shrink-0 px-5 py-2 rounded-full cursor-pointer ${slotTime === time
                                        ? 'bg-indigo-500 text-white'
                                        : 'text-slate-500 border border-slate-300'
                                    }`}
                            >
                                {time.toLowerCase()}
                            </p>
                        ))
                    )}
                </div>
                <button
                    onClick={bookAppointment}
                    disabled={!slotTime || loadingSlots}
                    className="bg-indigo-500 text-white text-sm font-light px-14 py-3 rounded-full my-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Book an appointment
                </button>
            </div>
            {/* DOCTORES RELACIONADOS */}
            <RelatedDoctors
                docId={docId}
                speciality={docInfo.speciality}
            />
        </div>
    )
}

export default Appointment