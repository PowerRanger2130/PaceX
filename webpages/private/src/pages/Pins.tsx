import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { defaultPins, pinForDoor } from '@/lib/pins'
import { Package, Lock } from 'lucide-react'

export default function Pins() {
    const pins = useMemo(() => defaultPins(), [])
    const [selectedDoor, setSelectedDoor] = useState<number | null>(null)

    function selectDoor(door: number) {
        setSelectedDoor(door)
    }

    return (
        <div className="space-y-6 pb-48">
            {/* Main content - side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PIN Management */}
                <Card className="border shadow-lg">
                    <CardHeader>
                        <CardTitle>Ajtó PIN kódok</CardTitle>
                        <CardDescription>
                            {selectedDoor
                                ? `${selectedDoor}. ajtó PIN kódja: ${pinForDoor(selectedDoor)}`
                                : 'Fix szabály: PIN = ajtószám 4x (1111 ... 8888).'}
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
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`
                                                w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                                                ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                                            `}>
                                                {door}
                                            </span>
                                            {door}. ajtó
                                        </div>
                                        <div className={`h-9 rounded-md border px-3 flex items-center font-mono tracking-[0.35em] ${isSelected ? 'border-primary' : 'border-input'}`}>
                                            {pins[door]}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <Button size="sm" variant="outline" className="mt-4" onClick={() => setSelectedDoor(null)}>
                            Kijelölés törlése
                        </Button>
                    </CardContent>
                </Card>

                {/* Door Visualization - Compact */}
                <Card className="border shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-5 w-5 text-primary" />
                            Csomagautomata
                        </CardTitle>
                        <CardDescription className="text-sm">Kattintson egy ajtóra a PIN megtekintéséhez</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 shadow-inner">
                            {/* Locker frame - compact */}
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 8 }).map((_, i) => {
                                    const door = i + 1
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
                                                    : 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-600'
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
                                            <Lock className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />

                                            {/* Status indicator */}
                                            <div className={`
                                                absolute bottom-1 right-1 w-2 h-2 rounded-full
                                                bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]
                                            `} />
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Status legend */}
                            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>Fix PIN (1111–8888)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
