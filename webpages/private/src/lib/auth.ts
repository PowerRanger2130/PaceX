export type Worker = { id?: number; username: string; email?: string; role?: string; access_token: string }

const KEY = 'gls-worker'

export function isAuthenticated() {
    return !!sessionStorage.getItem(KEY)
}

export function setWorker(worker: Worker) {
    sessionStorage.setItem(KEY, JSON.stringify(worker))
}

export function getWorker(): Worker | null {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
}

export function getToken(): string | null {
    const worker = getWorker()
    return worker?.access_token || null
}

export function logout() {
    sessionStorage.removeItem(KEY)
}
