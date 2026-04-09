import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { translateSpeciality } from "../utils/specialityUtils"

const TopDoctors = () => {

    const navigate = useNavigate();
    const { doctors } = useContext(AppContext)
    const { t } = useTranslation()

    return (
        <div className='flex flex-col items-center gap-4 my-16 text-slate-900 md:mx-10'>
            <h1 className='text-3xl font-medium'>{t('topDoctors.title')}</h1>
            <p className='sm:w-1/3 text-center text-sm'>{t('topDoctors.subtitle')}</p>
            <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
                {doctors.slice(0, 10).map((item, index) => (
                    <div
                        onClick={() => navigate(`/appointment/${item._id}`)}
                        className='border border-blue-300 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2.5 transition-all duration-500'
                        key={index}
                    >
                        <img
                            className='bg-blue-200'
                            src={item.image}
                            alt={item.name}
                        />
                        <div className='p-4'>
                            <div className={`flex items-center gap-2 text-sm text-center ${item.available ? 'text-green-500' : 'text-gray-500'}`}>
                                <p className={`w-2 h-2 ${item.available ? 'bg-green-500' : 'bg-gray-500'} rounded-full`} />
                                <p>{item.available ? t('topDoctors.available') : t('topDoctors.notAvailable')}</p>
                            </div>
                            <p className='text-slate-900 text-lg font-medium'>{item.name}</p>
                            <p className='text-slate-600 text-sm'>
                                {translateSpeciality(item.speciality, t)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={() => { navigate('/doctors'); scrollTo(0, 0) }}
                className='bg-blue-200 text-slate-600 px-12 py-3 rounded-full mt-10'
            >
                {t('topDoctors.more')}
            </button>
        </div>
    )
}

export default TopDoctors