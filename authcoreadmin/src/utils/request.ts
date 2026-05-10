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

  return { ...options, url, headers }
})

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const { response } = error
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
      clearTokens()
      window.location.href = '/login'
      return { r: false, e: '登录已过期' }
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
