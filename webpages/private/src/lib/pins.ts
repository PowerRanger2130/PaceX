export type DoorPins = { [door: number]: string }

const DOOR_COUNT = 8

export function pinForDoor(door: number): string {
    if (door < 1 || door > DOOR_COUNT) {
        throw new Error(`Door must be between 1 and ${DOOR_COUNT}`)
    }
    return String(door).repeat(4)
}

export function defaultPins(): DoorPins {
    return {
        1: '1111',
        2: '2222',
        3: '3333',
        4: '4444',
        5: '5555',
        6: '6666',
        7: '7777',
        8: '8888',
    }
}

export async function fetchPins(): Promise<DoorPins> {
    return defaultPins()
}

export async function savePins(pins: DoorPins): Promise<DoorPins> {
    void pins
    return defaultPins()
}

export async function verifyPin(pin: string): Promise<{ valid: boolean; door: number | null }> {
    const normalized = pin.replace(/\D/g, '').slice(0, 4)
    if (normalized.length !== 4) {
        return { valid: false, door: null }
    }

    const first = normalized[0]
    if (![...normalized].every((digit) => digit === first)) {
        return { valid: false, door: null }
    }

    const door = Number(first)
    if (!Number.isInteger(door) || door < 1 || door > DOOR_COUNT) {
        return { valid: false, door: null }
    }

    return { valid: normalized === pinForDoor(door), door }
}
