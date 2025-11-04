import axios, { AxiosRequestConfig } from 'axios'
import {
  handleRequestHeader,
  handleAuth,
  handleNetworkError,
  handleGeneralError,
} from './tool'

export interface FcResponse<T> {
  code: number
  message: string
  data: T
}

export interface IAnyObj {
  [index: string]: unknown
}

export type ApiResponse<T> = Promise<[any, FcResponse<T> | undefined]>

type Fn = (data: FcResponse<any>) => unknown

axios.interceptors.request.use((config) => {
  config = handleRequestHeader(config)
  config = handleAuth(config)
  return config
})

axios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) return Promise.reject(response.data)
    handleGeneralError(response.data.error)
    return response
  },
  (err) => {
    handleNetworkError(err.response.status)
    Promise.reject(err)
  }
)

export const Get = <T>(
  url: string,
  params?: IAnyObj,
  cb?: Fn
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    axios
      .get(url, { params })
      .then((result) => {
        let res: FcResponse<T>
        if (cb !== undefined) {
          res = cb(result.data) as unknown as FcResponse<T>
        } else {
          res = result.data as FcResponse<T>
        }
        resolve([null, res])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

export const Post = <T>(
  url: string,
  data: IAnyObj,
  params: IAnyObj = {},
  config: AxiosRequestConfig = {}
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    axios
      .post(url, data, { params, ...config })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

export const Put = <T>(
  url: string,
  data: IAnyObj,
  params: IAnyObj = {}
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    axios
      .post(url, data, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

export const Delete = <T>(
  url: string,
  data: IAnyObj,
  params: IAnyObj = {}
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    axios
      .post(url, data, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

