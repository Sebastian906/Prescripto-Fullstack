import { useTranslation } from "react-i18next"
import { assets } from "../assets/assets"

const About = () => {
    const { t } = useTranslation()
    return (
        <div>
            <div className="text-center text-2xl pt-10 text-slate-500">
                <p>{t('about.title')} <span className="text-slate-700 font-medium">{t('about.us')}</span></p>
            </div>
            <div className="my-10 flex flex-col md:flex-row gap-12">
                <img className="w-full md:max-w-90" src={assets.about_image} alt="" />
                <div className="flex flex-col justify-center gap-6 md:w-2/4 text-sm text-slate-600">
                    <p>{t('about.intro1')}</p>
                    <p>{t('about.intro2')}</p>
                    <b className="text-slate-800">{t('about.visionTitle')}</b>
                    <p>{t('about.visionText')}</p>
                </div>
            </div>
            <div className="text-xl my-4 text-slate-500">
                <p>{t('about.whyChoose')} <span className="text-slate-700 font-semibold">{t('about.chooseUs')}</span></p>
            </div>
            <div className="flex flex-col md:flex-row mb-20">
                <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-indigo-500 hover:text-white transition-all duration-300 text-slate-600 cursor-pointer">
                    <b>{t('about.efficiency')}</b>
                    <p>{t('about.efficiencyText')}</p>
                </div>
                <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-indigo-500 hover:text-white transition-all duration-300 text-slate-600 cursor-pointer">
                    <b>{t('about.convenience')}</b>
                    <p>{t('about.convenienceText')}</p>
                </div>
                <div className="border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-indigo-500 hover:text-white transition-all duration-300 text-slate-600 cursor-pointer">
                    <b>{t('about.personalization')}</b>
                    <p>{t('about.personalizationText')}</p>
                </div>
            </div>
        </div>
    )
}

export default About