import { createCookieSessionStorage } from "@remix-run/node";

type AccessSessionData = {
    access_token: string
}

type RefreshSessionData = {
    refresh_token: string
}

type SessionFlashData = {
    error: string
}

export const accessTokenStorage = createCookieSessionStorage<AccessSessionData, SessionFlashData>({
    cookie: {
        name: '_access',
        maxAge: 800,
        secrets: [process.env.SESSION_SECRET!],
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
})

export const refreshTokenStorage = createCookieSessionStorage<RefreshSessionData, SessionFlashData>({
    cookie: {
        name: '_refresh',
        secrets: [process.env.SESSION_SECRET!],
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
})
