import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface User {
    id: string
    email: string
    name: string
    password: string
}

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/data/users.json')
            const users: User[] = await res.json()
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
            if (user) {
                sessionStorage.setItem('gls-user', JSON.stringify({ id: user.id, email: user.email, name: user.name }))
                toast.success(`Welcome, ${user.name}!`, { description: 'Authenticated (read-only)' })
                navigate('/tracking')
            } else {
                toast.error('Invalid credentials', { description: 'Try alice@example.com / alice123' })
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to authenticate', { description: 'Could not load users database' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-sm">
                <CardHeader>
                    <CardTitle>Sign in</CardTitle>
                    <CardDescription>Use demo credentials. This is read-only auth from a static database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                    <div className="text-xs text-muted-foreground mt-4 space-y-1">
                        <p>Try: alice@example.com / alice123</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
