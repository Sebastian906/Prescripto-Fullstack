import { useState } from "react"
import { socialsIcons } from "../assets/assets"

const Login = () => {

    const [state, setState] = useState('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [isActive, setIsActive] = useState(false)

    const onSubmitHandler = async (event) => {
        event.preventDefault()
    }

    const handleRegisterClick = () => {
        setIsActive(true)
        setState('Sign Up')
    }

    const handleLoginClick = () => {
        setIsActive(false)
        setState('Login')
    }

    return (
        <>
            {/* PANTALLA GRANDE */}
            <div className="hidden min-[560px]:flex items-center justify-center min-h-[80vh] py-8">
                <div
                    className="relative w-212.5 h-137.5 bg-white rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden mx-4"
                    style={{ maxWidth: "calc(100vw - 2rem)" }}
                >
                    {/* FORMULARIO DE LOGIN */}
                    <div
                        className="absolute top-0 w-1/2 h-full bg-white flex items-center justify-center text-slate-700 text-center px-10 z-1"
                        style={{
                            right: isActive ? "50%" : "0",
                            transition: "right 0.6s ease-in-out 1.2s",
                        }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-4xl font-semibold mb-2 -mt-2.5 text-slate-800">Login</h1>
                            <div className="relative my-7">
                                <input
                                    className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                    type="email"
                                    placeholder="Email"
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    required
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="relative my-7">
                                <input
                                    className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                    type="password"
                                    placeholder="Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    required
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="text-left -mt-4 mb-3">
                                <a href="#" className="text-sm text-slate-600 hover:text-indigo-500 transition-colors">Forgot Password?</a>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md duration-300"
                            >
                                Login
                            </button>
                            <p className="text-sm text-slate-500 my-4">or login with your socials</p>
                            <div className="flex justify-center gap-4">
                                {socialsIcons.map((item) => (
                                    <a
                                        key={item.name}
                                        href="#"
                                        className="inline-flex items-center justify-center w-11 h-11 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </form>
                    </div>
                    {/* FORMULARIO DE REGISTRO */}
                    <div
                        className="absolute top-0 w-1/2 h-full bg-white flex items-center justify-center text-slate-700 text-center px-10 z-1"
                        style={{
                            left: isActive ? "0" : "-50%",
                            transition: "left 0.6s ease-in-out 1.2s",
                        }}
                    >
                        <form onSubmit={onSubmitHandler} className="w-full">
                            <h1 className="text-4xl font-semibold mb-2 -mt-2.5 text-slate-800">Create account</h1>
                            <div className="relative my-5">
                                <input
                                    className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                    type="text"
                                    placeholder="Full Name"
                                    onChange={(e) => setName(e.target.value)}
                                    value={name}
                                    required
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="relative my-5">
                                <input
                                    className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                    type="email"
                                    placeholder="Email"
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    required
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="relative my-5">
                                <input
                                    className="w-full py-3.5 pl-5 pr-12 bg-slate-100 rounded-lg border-none outline-none text-base text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                    type="password"
                                    placeholder="Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    required
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-base cursor-pointer transition-colors shadow-md duration-300"
                            >
                                Create account
                            </button>
                            <p className="text-sm text-slate-500 my-3">or register with your socials</p>
                            <div className="flex justify-center gap-4">
                                {socialsIcons.map((item) => (
                                    <a
                                        key={item.name}
                                        href="#"
                                        className="inline-flex items-center justify-center w-11 h-11 border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                                        title={item.name}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </form>
                    </div>
                    <div className="absolute w-full h-full pointer-events-none">
                        <div
                            className="absolute top-0 h-full w-[300%] bg-indigo-500 rounded-[150px] z-2"
                            style={{
                                left: isActive ? "50%" : "-250%",
                                transition: "left 1.8s ease-in-out",
                            }}
                        />
                        <div
                            className="absolute top-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto"
                            style={{
                                left: isActive ? "-50%" : "0",
                                transition: isActive
                                    ? "left 0.6s ease-in-out 0.6s"
                                    : "left 0.6s ease-in-out 1.2s",
                            }}
                        >
                            <h1 className="text-4xl font-semibold mb-2">Hello, Welcome!</h1>
                            <p className="text-sm mb-5">Create a new account?</p>
                            <button
                                onClick={handleRegisterClick}
                                className="w-40 h-11.5 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-base cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Create account
                            </button>
                        </div>
                        <div
                            className="absolute top-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-2 pointer-events-auto"
                            style={{
                                right: isActive ? "0" : "-50%",
                                transition: isActive
                                    ? "right 0.6s ease-in-out 1.2s"
                                    : "right 0.6s ease-in-out 0.6s",
                            }}
                        >
                            <h1 className="text-4xl font-semibold mb-2">Welcome Back!</h1>
                            <p className="text-sm mb-5">Already have an account?</p>
                            <button
                                onClick={handleLoginClick}
                                className="w-40 h-11.5 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-base cursor-pointer hover:bg-white hover:text-indigo-500 transition-all duration-300"
                            >
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* PANTALLAS PEQUEÑAS */}
            <form
                onSubmit={onSubmitHandler}
                className="min-[560px]:hidden min-h-[80vh] flex items-center"
            >
                <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[85vw] border border-zinc-300 rounded-xl text-zinc-600 text-sm shadow-lg bg-white">
                    <p className="text-2xl font-semibold text-slate-800">
                        {state === 'Sign Up' ? "Create Account" : "Login"}
                    </p>
                    <p>Please {state === 'Sign Up' ? "sign up" : "log in"} to book an appointment</p>
                    {state === 'Sign Up' && (
                        <div className="w-full">
                            <p>Full Name</p>
                            <input
                                className="border border-zinc-400 rounded w-full p-2 mt-1 outline-none focus:border-indigo-400"
                                type="text"
                                onChange={(e) => setName(e.target.value)}
                                value={name}
                                required
                            />
                        </div>
                    )}
                    <div className="w-full">
                        <p>Email</p>
                        <input
                            className="border border-zinc-400 rounded w-full p-2 mt-1 outline-none focus:border-indigo-400"
                            type="email"
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            required
                        />
                    </div>
                    <div className="w-full">
                        <p>Password</p>
                        <input
                            className="border border-zinc-400 rounded w-full p-2 mt-1 outline-none focus:border-indigo-400"
                            type="password"
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                        />
                    </div>
                    <button className="bg-indigo-500 hover:bg-indigo-600 text-white w-full py-2 rounded-md text-base transition-colors cursor-pointer">
                        {state === 'Sign Up' ? "Create Account" : "Login"}
                    </button>
                    {state === 'Sign Up' ? (
                        <p>
                            Already have an account?{" "}
                            <span
                                onClick={() => setState('Login')}
                                className="text-indigo-500 underline cursor-pointer"
                            >
                                Login here
                            </span>
                        </p>
                    ) : (
                        <p>
                            Create a new account?{" "}
                            <span
                                onClick={() => setState('Sign Up')}
                                className="text-indigo-500 underline cursor-pointer"
                            >
                                click here
                            </span>
                        </p>
                    )}
                </div>
            </form>
        </>
    )
}

export default Login