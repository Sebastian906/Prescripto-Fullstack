import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { toast } from 'react-toastify'

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
)

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
)

const ResetPassword = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const token = searchParams.get('token') ?? ''

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNew, setShowNew] = useState(false)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const validate = () => {
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return false
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/reset-password', {
                token,
                newPassword,
            })
            if (data.success) {
                setDone(true)
                toast.success('Password updated successfully!')
                setTimeout(() => navigate('/'), 2500)
            } else {
                toast.error(data.message ?? 'Something went wrong')
            }
        } catch (err) {
            const msg = err?.response?.data?.message ?? err.message
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] text-slate-500 text-sm">
                Invalid or missing reset link.
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] py-8">
            <div className="bg-white rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] px-10 py-10 w-full max-w-md mx-4">
                <h1 className="text-3xl font-semibold text-slate-800 text-center mb-1">
                    Reset Password
                </h1>
                <p className="text-sm text-slate-500 text-center mb-7">
                    Enter your new password below.
                </p>

                {done ? (
                    <div className="text-center text-green-600 font-medium">
                        Password changed successfully. Redirecting…
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="relative">
                            <input
                                className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                type={showNew ? 'text' : 'password'}
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                tabIndex={-1}
                            >
                                {showNew ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md"
                        >
                            {loading ? 'Updating…' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ResetPassword