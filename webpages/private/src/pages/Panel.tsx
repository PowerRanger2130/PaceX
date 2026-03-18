import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { verifyPin } from '@/lib/pins'
import { iotManagement, type RelayState } from '@/lib/iot'
import { Package, Lock, LockOpen, Loader2 } from 'lucide-react'

export default function Panel() {
    const [entered, setEntered] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [openDoor, setOpenDoor] = useState<number | null>(null)
    const [activeDoor, setActiveDoor] = useState<number | null>(null)
    const [pulseState, setPulseState] = useState<RelayState | null>(null)
    const [pulseCycle, setPulseCycle] = useState(0)

    const keypad = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✓'], [])

    function press(key: string) {
        if (verifying) return
        if (key === '←') {
            setEntered(prev => prev.slice(0, -1))
        } else if (key === '✓') {
            submit()
        } else {
            setEntered(prev => (prev + key).slice(0, 4))
        }
    }

    async function submit() {
        if (!entered) return
        if (entered.length !== 4) {
            toast.error('A PIN kód pontosan 4 számjegy legyen')
            return
        }

        setVerifying(true)
        setOpenDoor(null)
        setActiveDoor(null)
        setPulseState(null)
        setPulseCycle(0)

        try {
            const result = await verifyPin(entered)
            if (result.valid && result.door) {
                await iotManagement(result.door, ({ door, cycle, state }) => {
                    setActiveDoor(door)
                    setPulseCycle(cycle)
                    setPulseState(state)
                })

                setActiveDoor(null)
                setPulseState(null)
                setPulseCycle(0)
                setOpenDoor(result.door)
                toast.success(`${result.door}. ajtó kinyitva`, {
                    description: 'IOT management lefutott (3 kattintás: 1s be / 1s ki).',
                })
                setTimeout(() => setOpenDoor(null), 5000)
            } else {
                toast.error('Érvénytelen PIN kód')
            }
        } catch {
            toast.error('IOT művelet sikertelen', { description: 'A relé vezérlése nem futott le.' })
        } finally {
            setEntered('')
            setVerifying(false)
            setActiveDoor(null)
            setPulseState(null)
            setPulseCycle(0)
        }
    }

    return (
        <div className="space-y-6 pb-48">
            {/* Main content - side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Keypad Panel */}
                <Card className="border shadow-lg">
                    <CardHeader>
                        <CardTitle>PIN kód bevitel</CardTitle>
                        <CardDescription>
                            Fix PIN kódok: 1→1111, 2→2222, ... 8→8888. Érvényes kódnál az IOT management vezérli a relét.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs mx-auto space-y-4">
                            {/* PIN Display */}
                            <div className="relative">
                                <Input
                                    value={entered.replace(/./g, '●')}
                                    readOnly
                                    placeholder="PIN kód megadása"
                                    className={`text-center text-2xl tracking-[0.5em] h-14 font-mono ${verifying ? 'opacity-50' : ''}`}
                                />
                                {verifying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-2">
                                {keypad.map((k) => (
                                    <Button
                                        key={k}
                                        variant={k === '✓' ? 'default' : k === '←' ? 'secondary' : 'outline'}
                                        onClick={() => press(k)}
                                        className={`
                                            h-12 text-lg font-semibold
                                            ${k === '✓' ? 'bg-green-600 hover:bg-green-700' : ''}
                                            ${k === '←' ? 'bg-red-600/20 hover:bg-red-600/30 text-red-500' : ''}
                                        `}
                                        disabled={verifying}
                                    >
                                        {k === '✓' && verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : k}
                                    </Button>
                                ))}
                            </div>

                            <div className="text-xs text-muted-foreground text-center">
                                Adatbázis nélkül működik, a PIN ellenőrzés lokális.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Locker Visualization - Compact */}
                <Card className="border shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-5 w-5 text-primary" />
                            Csomagautomata
                        </CardTitle>
                        <CardDescription className="text-sm">
                            {activeDoor
                                ? `${activeDoor}. relé kattintás: ${pulseCycle}/3 (${pulseState === 'on' ? 'BE' : 'KI'})`
                                : openDoor
                                    ? `A ${openDoor}. ajtó nyitva – vegye ki a csomagot!`
                                    : 'Ajtó állapot előnézet'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 shadow-inner">
                            {/* Locker frame - compact */}
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 8 }).map((_, i) => {
                                    const door = i + 1
                                    const isActiveDoor = activeDoor === door
                                    const isRelayOn = isActiveDoor && pulseState === 'on'
                                    const isOpen = openDoor === door

                                    return (
                                        <div
                                            key={door}
                                            className={`
                                                relative aspect-[3/4] rounded border transition-all duration-500
                                                flex flex-col items-center justify-center
                                                ${isRelayOn
                                                    ? 'bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.7)] scale-105'
                                                    : isActiveDoor
                                                        ? 'bg-amber-500/15 border-amber-500/70 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                                                        : isOpen
                                                    ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105'
                                                    : 'bg-gray-700 border-gray-600'
                                                }
                                            `}
                                        >
                                            {/* Door number badge */}
                                            <div className={`
                                                absolute top-1 left-1 w-4 h-4 rounded-full text-[10px] font-bold
                                                flex items-center justify-center
                                                ${isRelayOn
                                                    ? 'bg-amber-400 text-black'
                                                    : isOpen
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-600 text-gray-300'}
                                            `}>
                                                {door}
                                            </div>

                                            {/* Lock icon */}
                                            {isRelayOn ? (
                                                <Loader2 className="h-5 w-5 text-amber-300 animate-spin" />
                                            ) : isOpen ? (
                                                <LockOpen className="h-5 w-5 text-green-400 animate-bounce" />
                                            ) : (
                                                <Lock className="h-4 w-4 text-gray-400" />
                                            )}

                                            {/* Status indicator light */}
                                            <div className={`
                                                absolute bottom-1 right-1 w-2 h-2 rounded-full transition-all duration-300
                                                ${isRelayOn
                                                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                                                    : isOpen
                                                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                                                    : 'bg-red-500/60'
                                                }
                                            `} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
