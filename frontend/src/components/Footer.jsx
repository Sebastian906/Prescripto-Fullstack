import { assets } from "../assets/assets"

const Footer = () => {
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
                        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quo nulla reprehenderit quis expedita. Maiores beatae ex illum unde perspiciatis assumenda ullam corrupti corporis veritatis officia cumque quibusdam iste eaque nostrum, libero, distinctio maxime consequatur exercitationem provident pariatur temporibus? Odio, fuga.
                    </p>
                </div>
                {/* CENTRO */}
                <div>
                    <p className="text-xl font-medium mb-5">COMPANY</p>
                    <ul className="flex flex-col gap-2 text-slate-600">
                        <li>Home</li>
                        <li>About us</li>
                        <li>Contact us</li>
                        <li>Privacy policy</li>
                    </ul>
                </div>
                {/* LADO DERECHO */}
                <div>
                    <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
                    <ul className="flex flex-col gap-2 text-slate-600">
                        <li>Sebastian906</li>
                        <li>elsebas1912@gmail.com</li>
                    </ul>
                </div>
            </div>
            {/* TEXTO DE COPYRIGHT */}
            <div>
                <hr />
                <p className="py-5 text-sm text-center">Copyright 2025© Prescripto - All Rights Reserved.</p>
            </div>
        </div>
    )
}

export default Footer