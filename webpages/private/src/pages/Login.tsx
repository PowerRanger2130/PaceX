import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { setWorker } from '@/lib/auth'
import { Lock, Loader2 } from 'lucide-react'

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const api = import.meta.env.VITE_API_URL as string
            if (!api) {
                toast.error('API URL nincs konfigurálva')
                return
            }
            const res = await fetch(`${api}/auth/login`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            if (!res.ok) {
                toast.error('Hibás felhasználónév vagy jelszó')
                return
            }
            const tokenData = await res.json()
            // Fetch user info with the token
            const meRes = await fetch(`${api}/auth/me`, {
                mode: 'cors',
                credentials: 'omit',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            })
            const user = meRes.ok ? await meRes.json() : { username }
            setWorker({ ...user, access_token: tokenData.access_token })
            toast.success(`Üdvözöljük, ${user.username || username}!`)
            navigate('/')
        } catch (err) {
            console.error(err)
            toast.error('Nem sikerült kapcsolódni a hitelesítési szolgáltatáshoz')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-md shadow-lg border">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Munkatárs bejelentkezés</CardTitle>
                    <CardDescription>Jelentkezzen be a csomagautomata ajtó PIN kódok kezeléséhez.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Felhasználónév</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="felhasználónév"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Jelszó</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Bejelentkezés...
                                </>
                            ) : 'Bejelentkezés'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
