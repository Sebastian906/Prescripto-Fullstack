import { useTranslation } from "react-i18next"
import { assets } from "../assets/assets"

const Contact = () => {
    const { t } = useTranslation()
    return (
        <div>
            <div className="text-center text-2xl pt-10 text-slate-500">
                <p>{t('contact.title')} <span className="text-slate-700 font-semibold">{t('contact.us')}</span></p>
            </div>
            <div className="my-10 flex flex-col justify-center md:flex-row gap-10 mb-28 text-sm">
                <img
                    className="w-full md:max-w-90"
                    src={assets.contact_image}
                    alt=""
                />
                <div className="flex flex-col justify-center items-start gap-6">
                    <p className="font-semibold text-lg text-slate-600">{t('contact.ourOffice')}</p>
                    <p className="text-slate-500">
                        54709 Willms Station <br /> Suite 350, Washington, USA
                    </p>
                    <p className="text-slate-500">
                        {t('contact.officePhone')} <br /> {t('contact.officeEmail')}
                    </p>
                    <p className="font-semibold text-lg text-slate-600">{t('contact.careers')}</p>
                    <p className="text-slate-500">{t('contact.careersText')}</p>
                    <button className="border border-slate-900 px-8 py-4 text-sm hover:bg-slate-900 hover:text-slate-50 transition-all duration-500 cursor-pointer">
                        {t('contact.exploreJobs')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Contact