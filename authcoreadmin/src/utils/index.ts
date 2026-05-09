export const HtyAuthToken = 'Authorization'
export const HtySudoToken = 'HtySudoerToken'
export const HtyHostHeader = 'HtyHost'

export function saveToken(token: string) {
  window.localStorage.setItem(HtyAuthToken, token)
}

export function getToken(): string | null {
  return window.localStorage.getItem(HtyAuthToken)
}

export function clearTokens() {
  window.localStorage.removeItem(HtyAuthToken)
  window.localStorage.removeItem(HtySudoToken)
}
