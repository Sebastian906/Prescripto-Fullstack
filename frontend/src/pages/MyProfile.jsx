import { useContext, useState } from "react"
import { AppContext } from "../context/AppContext"
import { assets } from "../assets/assets"
import { toast } from "react-toastify"
import axios from "axios"
import { useTranslation } from "react-i18next"

const MyProfile = () => {

    const { userData, setUserData, token, backendUrl, loadUserProfileData } = useContext(AppContext)
    const { t } = useTranslation()

    const [isEdit, setIsEdit] = useState(false)
    const [image, setImage] = useState()

    const updateUserProfileData = async () => {
        try {
            const formData = new FormData()
            formData.append('name', userData.name)
            formData.append('phone', userData.phone)
            formData.append('address', JSON.stringify(userData.address))
            formData.append('gender', userData.gender)
            formData.append('dob', userData.dob)
            image && formData.append('image', image)

            const { data } = await axios.put(backendUrl + '/api/users/update-profile', formData, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                setIsEdit(false)
                setImage(undefined)
                try {
                    await loadUserProfileData()
                } catch (err) {
                    console.error('Failed to reload profile after update', err)
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to update profile")
        }
    }

    return userData && (
        <div className="max-w-lg flex flex-col gap-2 text-sm">
            {isEdit ? (
                <label htmlFor="image">
                    <div className="inline-block relative cursor-pointer">
                        <img
                            className="w-36 rounded opacity-75"
                            src={image ? URL.createObjectURL(image) : userData.image}
                            alt=""
                        />
                        <img
                            className="w-10 absolute bottom-12 right-12"
                            src={image ? '' : assets.upload_icon}
                            alt=""
                        />
                    </div>
                    <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
                </label>
            ) : (
                <img className="w-36 rounded" src={userData.image} alt="" />
            )}

            {isEdit ? (
                <input
                    className="bg-slate-200 border border-slate-300 text-3xl font-medium max-w-60 mt-4"
                    type="text"
                    value={userData.name}
                    onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))}
                />
            ) : (
                <p className="font-medium text-3xl text-neutral-800 mt-4">{userData.name}</p>
            )}

            <hr className="bg-zinc-400 h-px border-none" />
            <div>
                <p className="text-neutral-500 underline mt-3">{t('myProfile.contactInfo')}</p>
                <div className="grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700">
                    <p className="font-medium">{t('myProfile.emailId')}</p>
                    <p className="text-blue-500">{userData.email}</p>

                    <p className="font-medium">{t('myProfile.phone')}</p>
                    {isEdit ? (
                        <input
                            className="bg-slate-200 border border-slate-300 max-w-52"
                            type="text"
                            value={userData.phone}
                            onChange={e => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    ) : (
                        <p className="text-blue-400">{userData.phone}</p>
                    )}

                    <p className="font-medium">{t('myProfile.address')}</p>
                    {isEdit ? (
                        <p>
                            <input
                                className="bg-slate-200 border border-slate-300"
                                type="text"
                                value={userData.address.line1}
                                onChange={e => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                            />
                            <br />
                            <input
                                className="bg-slate-200 border border-slate-300"
                                type="text"
                                value={userData.address.line2}
                                onChange={e => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                            />
                        </p>
                    ) : (
                        <p className="text-slate-500">
                            {userData.address.line1}<br />{userData.address.line2}
                        </p>
                    )}
                </div>
            </div>
            <div>
                <p className="text-neutral-500 underline mt-3">{t('myProfile.basicInfo')}</p>
                <div className="grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700">
                    <p className="font-medium">{t('myProfile.gender')}</p>
                    {isEdit ? (
                        <select
                            className="max-w-20 bg-slate-200 border border-slate-300"
                            onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))}
                            value={userData.gender}
                        >
                            <option value="Male">{t('myProfile.male')}</option>
                            <option value="Female">{t('myProfile.female')}</option>
                            <option value="Other">{t('myProfile.other')}</option>
                        </select>
                    ) : (
                        <p className="text-slate-400">{userData.gender}</p>
                    )}

                    <p className="font-medium">{t('myProfile.birthday')}</p>
                    {isEdit ? (
                        <input
                            className="max-w-28 bg-slate-200 border border-slate-300"
                            type="date"
                            onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))}
                            value={userData.dob}
                        />
                    ) : (
                        <p className="text-slate-400">{userData.dob}</p>
                    )}
                </div>
            </div>
            <div className="mt-10">
                {isEdit ? (
                    <button
                        className="border border-indigo-500 px-8 py-2 rounded-full hover:bg-indigo-500 hover:text-white transition-all"
                        onClick={updateUserProfileData}
                    >
                        {t('myProfile.saveInfo')}
                    </button>
                ) : (
                    <button
                        className="border border-indigo-500 px-8 py-2 rounded-full hover:bg-indigo-500 hover:text-white transition-all"
                        onClick={() => setIsEdit(true)}
                    >
                        {t('myProfile.edit')}
                    </button>
                )}
            </div>
        </div>
    )
}

export default MyProfile