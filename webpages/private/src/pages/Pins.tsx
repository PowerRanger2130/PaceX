import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DoorPins } from '@/lib/pins'
import { fetchPins, savePins, defaultPins } from '@/lib/pins'
import { Package, Lock, LockOpen } from 'lucide-react'

export default function Pins() {
    const [pins, setPinsState] = useState<DoorPins>({})
    const [originalPins, setOriginalPins] = useState<DoorPins>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedDoor, setSelectedDoor] = useState<number | null>(null)
    const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

    useEffect(() => {
        loadPins()
    }, [])

    function selectDoor(door: number) {
        setSelectedDoor(door)
        // Focus and select the input after a brief delay to ensure state is updated
        setTimeout(() => {
            const input = inputRefs.current[door]
            if (input) {
                input.focus()
                input.select()
            }
        }, 0)
    }

    async function loadPins() {
        setLoading(true)
        try {
            const data = await fetchPins()
            setPinsState(data)
            setOriginalPins(data)
        } catch (err) {
            toast.error('PIN kódok betöltése sikertelen', { description: 'Alapértelmezett értékek használata.' })
            const defaults = defaultPins()
            setPinsState(defaults)
            setOriginalPins(defaults)
        } finally {
            setLoading(false)
        }
    }

    function updatePin(door: number, value: string) {
        setPinsState(prev => ({ ...prev, [door]: value.replace(/\D/g, '').slice(0, 8) }))
    }

    async function save() {
        setSaving(true)
        try {
            const updated = await savePins(pins)
            setPinsState(updated)
            setOriginalPins(updated)
            toast.success('PIN kódok mentve', { description: 'Adatbázisban tárolva.' })
        } catch (err) {
            toast.error('PIN kódok mentése sikertelen')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 pb-48">
            {/* Main content - side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PIN Management */}
                <Card className="border shadow-lg">
                    <CardHeader>
                        <CardTitle>Ajtó PIN kódok kezelése</CardTitle>
                        <CardDescription>
                            {selectedDoor
                                ? `${selectedDoor}. ajtó PIN kódjának szerkesztése`
                                : 'Adja meg az egyes ajtók hozzáférési PIN kódját (1–8).'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 8 }).map((_, i) => {
                                const door = i + 1
                                const isSelected = selectedDoor === door
                                return (
                                    <div
                                        key={door}
                                        className={`
                                            rounded-lg border p-3 space-y-2 transition-all duration-300 cursor-pointer
                                            ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-muted-foreground/30'}
                                        `}
                                        onClick={() => selectDoor(door)}
                                    >
                                        <Label htmlFor={`door-${door}`} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <span className={`
                                                w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                                                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                                            `}>
                                                {door}
                                            </span>
                                            {door}. ajtó
                                        </Label>
                                        <Input
                                            ref={(el) => { inputRefs.current[door] = el }}
                                            id={`door-${door}`}
                                            value={pins[door] ?? ''}
                                            onChange={e => updatePin(door, e.target.value)}
                                            placeholder="4-8 számjegy"
                                            inputMode="numeric"
                                            pattern="\\d*"
                                            className={`h-9 ${isSelected ? 'border-primary' : ''}`}
                                            onFocus={() => setSelectedDoor(door)}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" onClick={save} disabled={saving || loading}>
                                {saving ? 'Mentés...' : 'Mentés'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setPinsState(originalPins); toast('Utoljára mentett értékek visszaállítva') }} disabled={loading}>
                                Visszaállítás
                            </Button>
                            <Button size="sm" variant="outline" onClick={loadPins} disabled={loading}>
                                {loading ? 'Betöltés...' : 'Frissítés'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Door Visualization - Compact */}
                <Card className="border shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-5 w-5 text-primary" />
                            Csomagautomata
                        </CardTitle>
                        <CardDescription className="text-sm">Kattintson egy ajtóra a PIN szerkesztéséhez</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 shadow-inner">
                            {/* Locker frame - compact */}
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 8 }).map((_, i) => {
                                    const door = i + 1
                                    const hasPin = !!pins[door]
                                    const isSelected = selectedDoor === door
                                    return (
                                        <button
                                            key={door}
                                            onClick={() => selectDoor(door)}
                                            className={`
                                                relative aspect-[3/4] rounded border transition-all duration-300
                                                flex flex-col items-center justify-center
                                                ${isSelected
                                                    ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)] scale-105'
                                                    : hasPin
                                                        ? 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-600'
                                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            {/* Door number badge */}
                                            <div className={`
                                                absolute top-1 left-1 w-4 h-4 rounded-full text-[10px] font-bold
                                                flex items-center justify-center
                                                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-600 text-gray-300'}
                                            `}>
                                                {door}
                                            </div>

                                            {/* Lock icon */}
                                            {hasPin ? (
                                                <Lock className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                                            ) : (
                                                <LockOpen className="h-4 w-4 text-gray-500" />
                                            )}

                                            {/* Status indicator */}
                                            <div className={`
                                                absolute bottom-1 right-1 w-2 h-2 rounded-full
                                                ${hasPin ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}
                                            `} />
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Status legend */}
                            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>PIN beállítva</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                    <span>Nincs PIN</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
