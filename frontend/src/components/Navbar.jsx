import { NavLink, Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Navbar = () => {

    const navigate = useNavigate();
    const { token, setToken, userData, unreadCount } = useContext(AppContext)
    const [showMenu, setShowMenu] = useState(false);
    const { t } = useTranslation()

    const logout = () => {
        setToken(false)
        localStorage.removeItem('token')
    }

    return (
        <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-slate-500'>
            <img
                onClick={() => navigate('/')}
                className='w-44 cursor-pointer' src={assets.logo} alt=""
            />
            <ul className='hidden md:flex items-start gap-5 font-medium'>
                <NavLink to='/'>
                    <li className='py-1'>{t('nav.home')}</li>
                    <hr className='border-none outline-none h-0.5 bg-indigo-700 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/doctors'>
                    <li className='py-1'>{t('nav.allDoctors')}</li>
                    <hr className='border-none outline-none h-0.5 bg-indigo-700 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/about'>
                    <li className='py-1'>{t('nav.about')}</li>
                    <hr className='border-none outline-none h-0.5 bg-indigo-700 w-3/5 m-auto hidden' />
                </NavLink>
                <NavLink to='/contact'>
                    <li className='py-1'>{t('nav.contact')}</li>
                    <hr className='border-none outline-none h-0.5 bg-indigo-700 w-3/5 m-auto hidden' />
                </NavLink>
            </ul>
            <div className='flex items-center gap-4'>
                <LanguageSwitcher />
                {token && userData && (
                    <button
                        onClick={() => navigate('/notifications')}
                        className="relative cursor-pointer"
                        aria-label={t('nav.notifications')}
                        title={t('nav.notifications')}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-slate-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
                            />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 text-[10px] leading-none bg-red-500 text-white rounded-full px-1.5 py-0.5">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                )}
                {token && userData ? (
                    <div className="relative group">
                        <button
                            type="button"
                            aria-label={userData.name || t('nav.myProfile')}
                            aria-haspopup="menu"
                            className="flex items-center gap-2 min-h-11 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            <img className="w-8 rounded-full" src={userData.image} alt="" />
                            <img className="w-2.5" src={assets.dropdown_icon} alt="" />
                        </button>
                        <div className="absolute top-full right-0 z-20 pt-2 hidden group-hover:block group-focus-within:block">
                            <div role="menu" className="min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4 text-base font-medium text-slate-500">
                                <Link role="menuitem" to="/my-profile" className="rounded hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                    {t('nav.myProfile')}
                                </Link>
                                <Link role="menuitem" to="/my-appointments" className="rounded hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                    {t('nav.myAppointments')}
                                </Link>
                                <Link role="menuitem" to="/my-records" className="rounded hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                    {t('nav.myRecords')}
                                </Link>
                                <Link role="menuitem" to="/my-prescriptions" className="rounded hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                    {t('nav.myPrescriptions')}
                                </Link>
                                <button type="button" role="menuitem" onClick={logout} className="text-left rounded hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                    {t('nav.logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-indigo-600 text-slate-100 px-8 py-3 rounded-full font-medium hidden md:block cursor-pointer"
                    >
                        {t('nav.createAccount')}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setShowMenu(true)}
                    aria-label={t('nav.openMenu')}
                    aria-expanded={showMenu}
                    className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                    <img className="w-6" src={assets.menu_icon} alt="" />
                </button>
                <div className={`${showMenu ? 'fixed w-full' : 'h-0 w-0'} md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-indigo-100 transition-all`}>
                    <div className="flex items-center justify-between px-5 py-6">
                        <img className="w-36" src={assets.logo} alt="" />
                        <button
                            type="button"
                            onClick={() => setShowMenu(false)}
                            aria-label={t('nav.closeMenu')}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            <img className="w-7" src={assets.cross_icon} alt="" />
                        </button>
                    </div>
                    <ul className="flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium">
                        <NavLink onClick={() => setShowMenu(false)} to="/">
                            <p className="px-4 py-2 rounded inline-block">{t('nav.home')}</p>
                        </NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to="/doctors">
                            <p className="px-4 py-2 rounded inline-block">{t('nav.allDoctors')}</p>
                        </NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to="/about">
                            <p className="px-4 py-2 rounded inline-block">{t('nav.about')}</p>
                        </NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to="/contact">
                            <p className="px-4 py-2 rounded inline-block">{t('nav.contact')}</p>
                        </NavLink>
                        {token && userData && (
                            <>
                                <NavLink onClick={() => setShowMenu(false)} to="/my-records">
                                    <p className="px-4 py-2 rounded inline-block">{t('nav.myRecords')}</p>
                                </NavLink>
                                <NavLink onClick={() => setShowMenu(false)} to="/my-prescriptions">
                                    <p className="px-4 py-2 rounded inline-block">{t('nav.myPrescriptions')}</p>
                                </NavLink>
                            </>
                        )}
                    </ul>
                    <div className="px-5 mt-4 flex justify-center">
                        <LanguageSwitcher />
                    </div>
                    {!token && (
                        <div className="px-5 mt-4 flex items-center justify-center">
                            <button
                                onClick={() => { setShowMenu(false); navigate('/login'); window.scrollTo(0, 0) }}
                                className="w-3/7 bg-indigo-600 text-white px-6 py-3 rounded-full font-medium"
                            >
                                {t('nav.createAccount')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar