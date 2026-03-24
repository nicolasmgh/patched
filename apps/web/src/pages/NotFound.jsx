import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-8xl font-black text-emerald-100 mb-4">
                        404
                    </p>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Página no encontrada
                    </h1>
                    <p className="text-sm text-gray-400 mb-6">
                        La página que buscás no existe o fue movida
                    </p>
                    <Link
                        to="/"
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
