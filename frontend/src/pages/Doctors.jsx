import { useContext, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AppContext } from "../context/AppContext"
import { useSort, SORT_OPTIONS } from "../hooks/useSort"

const Doctors = () => {

    const { speciality } = useParams()
    const [filterDoc, setFilterDoc] = useState([])
    const [showFilters, setShowFilters] = useState(false)
    const navigate = useNavigate();
    const { doctors } = useContext(AppContext)
    const { sortedDoctors, sortOption, setSortOption } = useSort(filterDoc)

    const applyFilter = () => {
        if (speciality) {
            setFilterDoc(doctors.filter(doc => doc.speciality === speciality))
        } else {
            setFilterDoc(doctors)
        }
    }

    useEffect(() => {
        applyFilter()
    }, [doctors, speciality])

    return (
        <div>
            <p className="text-slate-600">Browse through the doctors speciality.</p>
            <div className="flex flex-col sm:flex-row items-start gap-5 mt-5">
                <button
                    className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilters ? 'bg-indigo-500 text-white' : ''}`}
                    onClick={() => setShowFilters(prev => !prev)}
                >
                    Filters
                </button>
                <div className={`flex-col gap-4 text-sm text-slate-600 ${showFilters ? 'flex' : 'hidden'} sm:flex`}>
                    <p
                        onClick={() => speciality === 'General physician' ? navigate('/doctors') : navigate('/doctors/General physician')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'General physician' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        General physician
                    </p>
                    <p
                        onClick={() => speciality === 'Gynecologist' ? navigate('/doctors') : navigate('/doctors/Gynecologist')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'Gynecologist' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        Gynecologist
                    </p>
                    <p
                        onClick={() => speciality === 'Dermatologist' ? navigate('/doctors') : navigate('/doctors/Dermatologist')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'Dermatologist' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        Dermatologist
                    </p>
                    <p
                        onClick={() => speciality === 'Pediatricians' ? navigate('/doctors') : navigate('/doctors/Pediatricians')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'Pediatricians' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        Pediatricians
                    </p>
                    <p
                        onClick={() => speciality === 'Neurologist' ? navigate('/doctors') : navigate('/doctors/Neurologist')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'Neurologist' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        Neurologist
                    </p>
                    <p
                        onClick={() => speciality === 'Gastroenterologist' ? navigate('/doctors') : navigate('/doctors/Gastroenterologist')}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        Gastroenterologist
                    </p>
                </div>
                <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="sort-select"
                            className="text-sm text-slate-500 shrink-0"
                        >
                            Sort by:
                        </label>
                        <select
                            id="sort-select"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="text-sm border border-slate-500 rounded px-3 py-1.5 text-slate-600 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">
                            {sortedDoctors.length} doctor{sortedDoctors.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="w-full grid grid-cols-auto gap-4 gap-y-6">
                        {sortedDoctors.map((item, index) => (
                            <div
                                onClick={() => navigate(`/appointment/${item._id}`)}
                                className="border border-blue-300 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2.5 transition-all duration-500"
                                key={item._id ?? index}
                            >
                                <img
                                    className="bg-blue-200 w-full object-cover"
                                    src={item.image}
                                    alt={item.name}
                                />
                                <div className="p-4">
                                    <div className={`flex items-center gap-2 text-sm ${item.available ? 'text-green-500' : 'text-gray-500'}`}>
                                        <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <p>{item.available ? 'Available' : 'Not Available'}</p>
                                    </div>
                                    <p className="text-slate-900 text-lg font-medium">{item.name}</p>
                                    <p className="text-slate-600 text-sm">{item.speciality}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {sortedDoctors.length === 0 && (
                        <p className="text-center text-slate-400 py-16 text-sm">
                            No doctors found for this speciality.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Doctors