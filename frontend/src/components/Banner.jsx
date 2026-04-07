import { useNavigate } from "react-router-dom"
import { assets } from "../assets/assets"
import { useTranslation } from "react-i18next"

const Banner = () => {

    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <div className="flex bg-indigo-500 rounded-lg px-6 sm:px-10 md:px-14 lg:px-12 my-20 md:mx-10 ">
            { /* LADO IZQUIERDO */}
            <div className="flex-1 py-8 sm:py-10 md:py-16 lg:py-24 lg:pl-5">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold text-white">
                    <p>{t('home.bannerTitle1')}</p>
                    <p className="mt-4">{t('home.bannerTitle2')}</p>
                </div>
                <button
                    onClick={() => { navigate('/login'); scrollTo(0, 0) }}
                    className="bg-white text-sm sm:text-base text-slate-600 px-8 py-3 rounded-full mt-6 hover:scale-105 transition-all cursor-pointer"
                >
                    {t('home.bannerCta')}
                </button>
            </div>
            { /* LADO DERECHO */}
            <div className="hidden md:block md:w-1/2 lg:w-92.5 relative">
                <img
                    className="hidden md:block md:w-1/2 lg:w-92.5 relative"
                    src={assets.appointment_img}
                    alt=""
                />
            </div>
        </div>
    )
}

export default Banner