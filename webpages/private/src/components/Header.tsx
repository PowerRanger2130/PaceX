import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isAuthenticated, logout } from '@/lib/auth'

export default function Header() {
    const { pathname } = useLocation()
    const authed = isAuthenticated()
    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link to="/" className="inline-flex items-center gap-2">
                    <img
                        src="https://www.gls-us.com/content/assets/images/logo.svg"
                        alt="GLS"
                        className="h-7 w-auto"
                        loading="eager"
                    />
                    <span className="sr-only">GLS Hungary</span>
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                    <Link
                        to="/"
                        className={cn(
                            'text-muted-foreground hover:text-foreground',
                            pathname === '/' && 'text-foreground font-medium'
                        )}
                    >Ajtó PIN kódok</Link>
                    <Link
                        to="/panel"
                        className={cn(
                            'text-muted-foreground hover:text-foreground',
                            pathname === '/panel' && 'text-foreground font-medium'
                        )}
                    >Kezelőpanel</Link>
                    {!authed ? (
                        <Link
                            to="/login"
                            className={cn(
                                'text-muted-foreground hover:text-foreground',
                                pathname === '/login' && 'text-foreground font-medium'
                            )}
                        >Bejelentkezés</Link>
                    ) : (
                        <button
                            onClick={() => { logout(); location.href = '/'; }}
                            className="text-muted-foreground hover:text-foreground"
                        >Kijelentkezés</button>
                    )}
                </nav>
            </div>
        </header>
    )
}
