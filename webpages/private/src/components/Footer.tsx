import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 mt-12">
            {/* Main footer content */}
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Column 1 - Csomagküldés */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Csomagküldés</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">Árak és szállítási idők</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Szolgáltatások</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Csomagolási útmutató</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Tiltott áruk</Link></li>
                        </ul>
                    </div>

                    {/* Column 2 - Integrációk */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Integrációk</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">E-kereskedelmi platformok</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Szállítási szoftverek</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">API dokumentáció</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Borküldési szolgáltatás</Link></li>
                        </ul>
                    </div>

                    {/* Column 3 - Rólunk */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Rólunk</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">Cégünkről</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Karrier</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Sajtószoba</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Zöld kezdeményezés</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Események</Link></li>
                        </ul>
                    </div>

                    {/* Column 4 - Támogatás */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Támogatás</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">Ügyfélszolgálat</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">GYIK</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Kapcsolat</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Csomagkövetés</Link></li>
                            <li><Link to="/" className="hover:text-white transition-colors">Átvételi pontok</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Bottom bar */}
            <div className="mx-auto max-w-6xl px-6 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                        © {new Date().getFullYear()} GLS Hungary. Minden jog fenntartva.
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <Link to="/" className="hover:text-white transition-colors">Általános Szerződési Feltételek</Link>
                        <Link to="/" className="hover:text-white transition-colors">Adatvédelmi szabályzat</Link>
                        <Link to="/" className="hover:text-white transition-colors">Cookie beállítások</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
