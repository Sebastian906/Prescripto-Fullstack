import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const ForgotPasswordModal = ({ onClose, backendUrl }) => {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/request-password-reset', {
                email,
                role: 'user',
            })
            if (data.success) {
                setSent(true)
            } else {
                toast.error(data.message ?? 'Something went wrong')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-semibold text-slate-800 mb-1">Forgot Password?</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Enter your email and we'll send you a reset link.
                </p>

                {sent ? (
                    <div className="text-center text-sm text-slate-600 py-4">
                        <p className="text-indigo-500 font-semibold text-base mb-2">Check your inbox!</p>
                        <p>If an account with that email exists, you will receive a reset link shortly.</p>
                        <button
                            onClick={onClose}
                            className="mt-5 w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative">
                            <input
                                className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 placeholder:text-slate-400"
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg font-semibold transition-colors shadow-md cursor-pointer"
                        >
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ForgotPasswordModal