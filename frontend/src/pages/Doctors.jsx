import { useContext, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AppContext } from "../context/AppContext"
import { useSort, SORT_OPTIONS } from "../hooks/useSort"

const Doctors = () => {

    const { speciality } = useParams()
    const [filterDoc, setFilterDoc] = useState([])
    const [showFilters, setShowFilters] = useState(false)
    const navigate = useNavigate();
    const { doctors } = useContext(AppContext)
    const { sortedDoctors, sortOption, setSortOption } = useSort(filterDoc)
    const { t } = useTranslation()

    // Mapeo de especialidades: inglés (BD) <-> valor para URL/API
    const SPECIALTY_MAP = {
        generalPhysician: 'General physician',
        gynecologist: 'Gynecologist',
        dermatologist: 'Dermatologist',
        pediatricians: 'Pediatricians',
        neurologist: 'Neurologist',
        gastroenterologist: 'Gastroenterologist'
    }

    // Obtener el nombre en inglés desde el parámetro de URL o key
    const getSpecialityInEnglish = (urlParam) => {
        if (!urlParam) return null
        // Si viene del parámetro de URL, buscar su equivalente en inglés
        return Object.values(SPECIALTY_MAP).includes(urlParam) ? urlParam : null
    }

    const applyFilter = () => {
        const specialityInEnglish = getSpecialityInEnglish(speciality)
        if (specialityInEnglish) {
            setFilterDoc(doctors.filter(doc => doc.speciality === specialityInEnglish))
        } else {
            setFilterDoc(doctors)
        }
    }

    useEffect(() => {
        applyFilter()
    }, [doctors, speciality])

    return (
        <div>
            <p className="text-slate-600">{t('doctorsPage.browse')}</p>
            <div className="flex flex-col sm:flex-row items-start gap-5 mt-5">
                <button
                    className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilters ? 'bg-indigo-500 text-white' : ''}`}
                    onClick={() => setShowFilters(prev => !prev)}
                >
                    {t('doctorsPage.filters')}
                </button>
                <div className={`flex-col gap-4 text-sm text-slate-600 ${showFilters ? 'flex' : 'hidden'} sm:flex`}>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.generalPhysician ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.generalPhysician}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.generalPhysician ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.generalPhysician')}
                    </p>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.gynecologist ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.gynecologist}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.gynecologist ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.gynecologist')}
                    </p>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.dermatologist ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.dermatologist}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.dermatologist ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.dermatologist')}
                    </p>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.pediatricians ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.pediatricians}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.pediatricians ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.pediatricians')}
                    </p>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.neurologist ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.neurologist}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.neurologist ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.neurologist')}
                    </p>
                    <p
                        onClick={() => speciality === SPECIALTY_MAP.gastroenterologist ? navigate('/doctors') : navigate(`/doctors/${SPECIALTY_MAP.gastroenterologist}`)}
                        className={`w-[94vh] sm:w-auto pl-3 py-1.5 pr-16 border border-slate-300 rounded transition-all cursor-pointer ${speciality === SPECIALTY_MAP.gastroenterologist ? 'bg-indigo-200 text-slate-950' : ''}`}
                    >
                        {t('doctorsPage.specialty.gastroenterologist')}
                    </p>
                </div>
                <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="sort-select"
                            className="text-sm text-slate-500 shrink-0"
                        >
                            {t('doctorsPage.sortBy')}
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
                            {sortedDoctors.length} {sortedDoctors.length !== 1 ? t('doctorsPage.filters') : t('doctorsPage.filterLegend')}
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
                                        <p>{item.available ? t('doctorsPage.available') : t('doctorsPage.notAvailable')}</p>
                                    </div>
                                    <p className="text-slate-900 text-lg font-medium">{item.name}</p>
                                    <p className="text-slate-600 text-sm">{item.speciality}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {sortedDoctors.length === 0 && (
                        <p className="text-center text-slate-400 py-16 text-sm">
                            {t('doctorsPage.noDoctors')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Doctors