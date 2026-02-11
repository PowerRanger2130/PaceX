import { getToken } from './auth'

export type DoorPins = { [door: number]: string }

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.104:8000'

export async function fetchPins(): Promise<DoorPins> {
    const token = getToken()
    const res = await fetch(`${API_URL}/pins`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })
    if (!res.ok) {
        throw new Error('Failed to fetch PINs')
    }
    const data = await res.json()
    // Convert string keys to number keys
    const pins: DoorPins = {}
    for (const [door, pin] of Object.entries(data.pins)) {
        pins[Number(door)] = pin as string
    }
    return pins
}

export async function savePins(pins: DoorPins): Promise<DoorPins> {
    const token = getToken()
    // Convert number keys to string keys for API
    const pinsPayload: { [key: string]: string } = {}
    for (const [door, pin] of Object.entries(pins)) {
        pinsPayload[String(door)] = pin
    }
    const res = await fetch(`${API_URL}/pins`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins: pinsPayload }),
    })
    if (!res.ok) {
        throw new Error('Failed to save PINs')
    }
    const data = await res.json()
    const result: DoorPins = {}
    for (const [door, pin] of Object.entries(data.pins)) {
        result[Number(door)] = pin as string
    }
    return result
}

export async function verifyPin(pin: string): Promise<{ valid: boolean; door: number | null }> {
    const res = await fetch(`${API_URL}/pins/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
    })
    if (!res.ok) {
        throw new Error('Failed to verify PIN')
    }
    return res.json()
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
