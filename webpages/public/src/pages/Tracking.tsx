import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface PackageEvent {
    id?: number
    location: string
    status: string
    notes?: string
    recorded_at: string
}
interface Package {
    tracking_number: string
    recipient_name: string
    status: string
    created_at: string
    updated_at: string
    recipient_address: string
    weight_kg?: number
    dimensions?: string
    location_history?: PackageEvent[]
}

export default function Tracking() {
    const [trackingNumber, setTrackingNumber] = useState('')
    const [pkg, setPkg] = useState<Package | null>(null)
    const [loading, setLoading] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const q = params.get('q') || ''
        if (q) setTrackingNumber(q)
    }, [location.search])

    async function search() {
        if (!trackingNumber.trim()) return
        setLoading(true)
        try {
            const api = import.meta.env.VITE_API_URL || ''
            const res = await fetch(`${api}/track/${encodeURIComponent(trackingNumber)}`, {
                mode: 'cors',
                credentials: 'omit'
            })
            if (!res.ok) {
                setPkg(null)
                toast.error('Csomag nem található', { description: 'Ellenőrizze a csomagszámot és próbálja újra.' })
                return
            }
            const data = await res.json()
            setPkg(data)
        } catch {
            toast.error('Nem sikerült elérni a követési szolgáltatást')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Kövesse nyomon csomagját</CardTitle>
                    <CardDescription>Adja meg a GLS csomagszámot az aktuális állapot és előzmények megtekintéséhez.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="pl. GLS123456789" className="max-w-sm" />
                    <Button onClick={search} disabled={loading}>{loading ? 'Keresés…' : 'Keresés'}</Button>
                </CardContent>
            </Card>

            {pkg && (
                <Card className="border-primary/30">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <CardTitle className="text-xl">{pkg.tracking_number}</CardTitle>
                                <CardDescription>
                                    Címzett: {pkg.recipient_address}
                                </CardDescription>
                            </div>
                            <Badge>{pkg.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="overview">
                            <TabsList>
                                <TabsTrigger value="overview">Áttekintés</TabsTrigger>
                                <TabsTrigger value="history">Előzmények</TabsTrigger>
                            </TabsList>
                            <TabsContent value="overview" className="mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="rounded-lg border p-4">
                                        <div className="text-muted-foreground">Címzett</div>
                                        <div className="font-medium">{pkg.recipient_name}</div>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <div className="text-muted-foreground">Utolsó frissítés</div>
                                        <div className="font-medium">{new Date(pkg.updated_at).toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <div className="text-muted-foreground">Cím</div>
                                        <div className="font-medium">{pkg.recipient_address}</div>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="history" className="mt-4">
                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[180px]">Időpont</TableHead>
                                                <TableHead className="w-[220px]">Helyszín</TableHead>
                                                <TableHead>Állapot</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(pkg.location_history || []).map((ev: PackageEvent, i: number) => (
                                                <TableRow key={i}>
                                                    <TableCell>{new Date(ev.recorded_at).toLocaleString()}</TableCell>
                                                    <TableCell>{ev.location}</TableCell>
                                                    <TableCell className="font-medium">{ev.status}{ev.notes ? ` - ${ev.notes}` : ''}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
