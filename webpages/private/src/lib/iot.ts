export type RelayState = 'on' | 'off'

export type RelayPulseEvent = {
    door: number
    relay: number
    cycle: number
    state: RelayState
}

const SR201_HOST = '192.168.199.250'
const SR201_PORT = 6722
const SR201_SWITCHES = 8
const RELAY_CLICK_COUNT = 3
const RELAY_ON_MS = 1000
const RELAY_OFF_MS = 1000

const IOT_BRIDGE_URL = (import.meta.env.VITE_IOT_BRIDGE_URL as string | undefined)?.trim()

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function sendRelayCommand(relay: number, enabled: boolean): Promise<void> {
    const command = `${enabled ? '1' : '2'}${relay}`

    // Browser apps cannot open raw TCP sockets directly.
    // If no bridge API is configured, we keep this in simulation mode.
    if (!IOT_BRIDGE_URL) {
        console.info(`[IOT management] Simulated SR201 command ${command} -> ${SR201_HOST}:${SR201_PORT}`)
        return
    }

    const baseUrl = IOT_BRIDGE_URL.replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/relay/command`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            host: SR201_HOST,
            port: SR201_PORT,
            relay,
            command,
            enabled,
        }),
    })

    if (!response.ok) {
        throw new Error(`IOT bridge call failed (${response.status})`)
    }
}

export async function iotManagement(door: number, onPulse?: (event: RelayPulseEvent) => void): Promise<void> {
    if (!Number.isInteger(door) || door < 1 || door > SR201_SWITCHES) {
        throw new Error(`Door must be between 1 and ${SR201_SWITCHES}`)
    }

    for (let cycle = 1; cycle <= RELAY_CLICK_COUNT; cycle += 1) {
        onPulse?.({ door, relay: door, cycle, state: 'on' })
        await sendRelayCommand(door, true)
        await wait(RELAY_ON_MS)

        onPulse?.({ door, relay: door, cycle, state: 'off' })
        await sendRelayCommand(door, false)
        await wait(RELAY_OFF_MS)
    }
}
