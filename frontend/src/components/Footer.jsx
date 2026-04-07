import { useTranslation } from "react-i18next"
import { assets } from "../assets/assets"

const Footer = () => {
    const { t } = useTranslation()
    return (
        <div className="md:mx-10">
            <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
                {/* LADO IZQUIERDO */}
                <div>
                    <img
                        className="mb-5 w-40"
                        src={assets.logo}
                        alt=""
                    />
                    <p className="w-full md:w-2/3 text-slate-600 leading-6">
                        {t('footer.description')}
                    </p>
                </div>
                {/* CENTRO */}
                <div>
                    <p className="text-xl font-medium mb-5">{t('footer.company')}</p>
                    <ul className="flex flex-col gap-2 text-slate-600">
                        <li>{t('footer.home')}</li>
                        <li>{t('footer.aboutUs')}</li>
                        <li>{t('footer.contactUs')}</li>
                        <li>{t('footer.privacyPolicy')}</li>
                    </ul>
                </div>
                {/* LADO DERECHO */}
                <div>
                    <p className="text-xl font-medium mb-5">{t('footer.getInTouch')}</p>
                    <ul className="flex flex-col gap-2 text-slate-600">
                        <li>Sebastian906</li>
                        <li>elsebas1912@gmail.com</li>
                    </ul>
                </div>
            </div>
            {/* TEXTO DE COPYRIGHT */}
            <div>
                <hr />
                <p className="py-5 text-sm text-center">{t('footer.copyright')}</p>
            </div>
        </div>
    )
}

export default Footer