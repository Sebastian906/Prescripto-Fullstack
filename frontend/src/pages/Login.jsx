import { useContext, useEffect, useState } from "react"
import { socialsIcons } from "../assets/assets"
import { AppContext } from "../context/AppContext"
import axios from "axios"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"

const Login = () => {

    const { backendUrl, token, setToken } = useContext(AppContext)
    const navigate = useNavigate()
    const [state, setState] = useState('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [isActive, setIsActive] = useState(false)

    const onSubmitHandler = async (event) => {
        event.preventDefault()
        try {
            if (state === 'Login') {
                const { data } = await axios.post(backendUrl + '/api/auth/login', { password, email })
                if (data.success) {
                    localStorage.setItem('token', data.token)
                    setToken(data.token)
                } else {
                    toast.error('Invalid credentials, please try again')
                }
            } else {
                const { data } = await axios.post(backendUrl + '/api/auth/register', { name, password, email })
                if (data.success) {
                    localStorage.setItem('token', data.token)
                    setToken(data.token)
                } else {
                    toast.error('Error at registration')
                }
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleOAuthLogin = (providerName) => {
        const providerMap = {
            Google: '/api/auth/google',
            Facebook: '/api/auth/facebook',
        }
        const endpoint = providerMap[providerName]
        if (endpoint) {
            window.location.href = backendUrl + endpoint
        }
    }

    const handleRegisterClick = () => {
        setIsActive(true)
        setState('Sign Up')
    }

    const handleLoginClick = () => {
        setIsActive(false)
        setState('Login')
    }

    useEffect(() => {
        if (token) {
            navigate('/')
        }
    }, [token])

    return (
        <>
            {/* PANTALLA GRANDE */}
            <div className="hidden min-[560px]:flex items-center justify-center min-h-[80vh] py-8">
                <div
                    className="relative w-212.5 h-137.5 bg-white rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden mx-4"
                    style={{ maxWidth: "calc(100vw - 2rem)" }}
                >
                    {/* Formulario LOGIN */}
                    <div
                        className="absolute top-0 w-1/2 h-full bg-white flex items-center justify-center text-slate-700 text-center px-10 z-1 transition-[right] duration-600 ease-in-out delay-1200"
                        style={{ right: isActive ? "50%" : "0" }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-4xl font-semibold mb-2 -mt-2.5 text-slate-800">Login</h1>
                            <div className="relative my-7">
                                <input className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} value={email} required />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </span>
                            </div>
                            <div className="relative my-7">
                                <input className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </span>
                            </div>
                            <div className="text-left -mt-4 mb-3">
                                <a href="#" className="text-sm text-slate-600 hover:text-indigo-500 transition-colors">Forgot Password?</a>
                            </div>
                            <button type="submit" className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md duration-300">Login</button>
                            <p className="text-sm text-slate-500 my-4">or login with your socials</p>
                            <div className="flex justify-center gap-4">
                                {socialsIcons.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => handleOAuthLogin(item.name)}
                                        className="inline-flex items-center justify-center w-11 h-11 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 cursor-pointer"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>
                    {/* Formulario REGISTRO */}
                    <div
                        className="absolute top-0 w-1/2 h-full bg-white flex items-center justify-center text-slate-700 text-center px-10 z-1 transition-[left] duration-600 ease-in-out delay-1200"
                        style={{ left: isActive ? "0" : "-50%" }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-4xl font-semibold mb-2 -mt-2.5 text-slate-800">Create account</h1>
                            <div className="relative my-5">
                                <input className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="text" placeholder="Full Name" onChange={(e) => setName(e.target.value)} value={name} required />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </span>
                            </div>
                            <div className="relative my-5">
                                <input className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} value={email} required />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </span>
                            </div>
                            <div className="relative my-5">
                                <input className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </span>
                            </div>
                            <button type="submit" className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md duration-300">Create account</button>
                            <p className="text-sm text-slate-500 my-3">or register with your socials</p>
                            <div className="flex justify-center gap-4">
                                {socialsIcons.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => handleOAuthLogin(item.name)}
                                        className="inline-flex items-center justify-center w-11 h-11 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 cursor-pointer"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>
                    {/* Blob + paneles de texto desktop */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div
                            className="absolute top-0 h-full w-[300%] bg-indigo-500 rounded-[150px] z-2 transition-[left] duration-1800 ease-in-out"
                            style={{ left: isActive ? "50%" : "-250%" }}
                        />
                        <div
                            className="absolute top-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto transition-[left] duration-600 ease-in-out"
                            style={{ left: isActive ? "-50%" : "0", transitionDelay: isActive ? "0.6s" : "1.2s" }}
                        >
                            <h1 className="text-4xl font-semibold mb-2">Hello, Welcome!</h1>
                            <p className="text-sm mb-5">Create a new account?</p>
                            <button
                                onClick={handleRegisterClick}
                                type="submit"
                                className="w-40 h-11 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-base cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Create account
                            </button>
                        </div>
                        <div
                            className="absolute top-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto transition-[right] duration-600 ease-in-out"
                            style={{ right: isActive ? "0" : "-50%", transitionDelay: isActive ? "1.2s" : "0.6s" }}
                        >
                            <h1 className="text-4xl font-semibold mb-2">Welcome Back!</h1>
                            <p className="text-sm mb-5">Already have an account?</p>
                            <button
                                onClick={handleLoginClick}
                                type="submit"
                                className="w-40 h-11 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-base cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* PANTALLA PEQUEÑA */}
            <div className="min-[560px]:hidden flex items-center justify-center py-5" style={{ minHeight: "calc(100vh - 80px)" }}>
                <div
                    className="relative w-full mx-4 bg-white rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden"
                    style={{ height: "calc(100vh - 120px)", maxHeight: "760px" }}
                >
                    {/* FORMULARIO LOGIN */}
                    <div
                        className="absolute bottom-0 left-0 w-full bg-white flex items-center justify-center px-7 z-1 transition-transform ease-in-out duration-600"
                        style={{
                            height: "70%",
                            transform: isActive ? "translateY(100%)" : "translateY(0%)",
                            transitionDelay: isActive ? "0s" : "1.2s",
                        }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-3xl font-semibold text-slate-800 text-center mb-1">Login</h1>
                            <div className="relative mt-6 mb-4">
                                <input className="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} value={email} required />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </span>
                            </div>
                            <div className="relative mb-3">
                                <input className="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </span>
                            </div>
                            <div className="text-left mb-3">
                                <a href="#" className="text-sm text-slate-600 hover:text-indigo-500 transition-colors">Forgot Password?</a>
                            </div>
                            <button type="submit" className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md">Login</button>
                            <p className="text-sm text-slate-500 my-3 text-center">or login with your socials</p>
                            <div className="flex justify-center gap-3">
                                {socialsIcons.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => handleOAuthLogin(item.name)}
                                        className="inline-flex items-center justify-center w-10 h-10 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 cursor-pointer"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>
                    {/* FORMULARIO REGISTER */}
                    <div
                        className="absolute top-0 left-0 w-full bg-white flex items-center justify-center px-7 z-1 transition-transform ease-in-out duration-600"
                        style={{
                            height: "70%",
                            transform: isActive ? "translateY(0%)" : "translateY(-100%)",
                            transitionDelay: isActive ? "1.2s" : "0s",
                        }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-3xl font-semibold text-slate-800 text-center mb-1">Create account</h1>
                            <div className="relative mt-5 mb-4">
                                <input className="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="text" placeholder="Full Name" onChange={(e) => setName(e.target.value)} value={name} required />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </span>
                            </div>
                            <div className="relative mb-4">
                                <input className="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} value={email} required />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </span>
                            </div>
                            <div className="relative mb-4">
                                <input className="w-full py-3 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} value={password} required />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </span>
                            </div>
                            <button type="submit" className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md">Create account</button>
                            <p className="text-sm text-slate-500 my-3 text-center">or register with your socials</p>
                            <div className="flex justify-center gap-3">
                                {socialsIcons.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => handleOAuthLogin(item.name)}
                                        className="inline-flex items-center justify-center w-10 h-10 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 cursor-pointer"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>
                    {/* BLOB + PANELES DE TEXTO móvil */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div
                            className="absolute left-0 w-full bg-indigo-500 z-2 transition-[top] ease-in-out duration-1800"
                            style={{
                                top: isActive ? "70%" : "-270%",
                                height: "300%",
                                borderRadius: "20vw",
                            }}
                        />
                        {/* Panel superior */}
                        <div
                            className="absolute top-0 left-0 w-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto transition-transform ease-in-out duration-600"
                            style={{
                                height: "30%",
                                transform: isActive ? "translateY(-100%)" : "translateY(0%)",
                                transitionDelay: isActive ? "0.6s" : "1.2s",
                            }}
                        >
                            <h1 className="text-2xl font-semibold mb-1">Hello, Welcome!</h1>
                            <p className="text-sm mb-3 text-indigo-100">Don't have an account?</p>
                            <button
                                onClick={handleRegisterClick}
                                type="submit"
                                className="w-36 h-9 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-sm cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Create account
                            </button>
                        </div>
                        {/* Panel inferior */}
                        <div
                            className="absolute bottom-0 left-0 w-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto transition-transform ease-in-out duration-600"
                            style={{
                                height: "30%",
                                transform: isActive ? "translateY(0%)" : "translateY(100%)",
                                transitionDelay: isActive ? "1.2s" : "0.6s",
                            }}
                        >
                            <h1 className="text-2xl font-semibold mb-1">Welcome Back!</h1>
                            <p className="text-sm mb-3 text-indigo-100">Already have an account?</p>
                            <button
                                type="submit"
                                onClick={handleLoginClick}
                                className="w-36 h-9 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-sm cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Login