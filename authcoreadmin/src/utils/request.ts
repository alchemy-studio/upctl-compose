import axios from 'axios'
import { HtyAuthToken, HtySudoToken, HtyHostHeader, getToken, clearTokens } from './index'

const axiosInstance = axios.create({
  withCredentials: true,
})

axiosInstance.interceptors.request.use((options) => {
  const headers: any = options.headers || {}
  const token = getToken()
  if (token) {
    headers[HtyAuthToken] = token
    const sudo = window.localStorage.getItem(HtySudoToken)
    if (sudo) {
      headers[HtySudoToken] = sudo
    }
  }
  headers[HtyHostHeader] = HOST || window.location.host

  let url = options.url || ''
  if (url.startsWith('/api/v1/uc')) {
    url = UC_SERVER + url
  }

  console.log('[request]', options.method, url, 'HtyHost=', headers[HtyHostHeader], 'Authorization=', headers[HtyAuthToken]?.substring(0, 30) + '...')

  return { ...options, url, headers }
})

axiosInstance.interceptors.response.use(
  (res) => {
    console.log('[response]', res.config.url, res.status, JSON.stringify(res.data).substring(0, 200))
    return res
  },
  (error) => {
    const { response } = error
    console.log('[response ERROR]', error.config?.url, response?.status, error.message)
    if (response) {
      return Promise.resolve(response)
    }
    return Promise.resolve({ r: false, e: error.message })
  }
)

export default async function request({ url = '', method = 'get', data, params, ...rest }: any) {
  if (method.toLowerCase() === 'get' && data && !params) {
    params = data
  }

  try {
    const response = await axiosInstance.request({ url, method, data, params, ...rest })
    const { status, data: resData } = response

    if (status === 401) {
      // 401 on login/token means session is invalid → logout
      if (url.includes('/login_with_password') || url.includes('/find_user_with_info_by_token')) {
        clearTokens()
        window.location.href = '/login'
      }
      return { r: false, e: '登录已过期', statusCode: 401 }
    }

    const r = status >= 200 && status < 300
    let result: any = { r, statusCode: status }

    if (typeof resData === 'object' && resData !== null) {
      result = { ...result, ...resData }
    } else {
      result = { ...result, d: resData }
    }

    if (!r) {
      result.e = result.e || '请求失败'
    }

    return result
  } catch (e: any) {
    return { r: false, e: e.message || '网络异常' }
  }
}
