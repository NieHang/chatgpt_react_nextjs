import axios from 'axios'

export const handleRequestHeader = (config) => {
  config.headers = {
    ...config.headers,
    'Content-Type': 'application/json',
  }
  return config
}

export const handleAuth = (config) => {
  // Add authentication token if needed
  config.headers = {
    ...config.headers,
    token: localStorage.getItem('token') || '',
  }
  return config
}

export const handleNetworkError = (errStatus: number) => {
  let errMessage = 'unknown error'
  if (errStatus) {
    switch (errStatus) {
      case 400:
        errMessage = 'Bad Request'
        break
      case 401:
        errMessage = 'Unauthorized, please log in again'
        break
      case 403:
        errMessage = 'Forbidden'
        break
      case 404:
        errMessage = 'Request error, resource not found'
        break
      case 405:
        errMessage = 'Method Not Allowed'
        break
      case 408:
        errMessage = 'Request Timeout'
        break
      case 500:
        errMessage = 'Server Error'
        break
      case 501:
        errMessage = 'Network Not Implemented'
        break
      case 502:
        errMessage = 'Network Error'
        break
      case 503:
        errMessage = 'Service Unavailable'
        break
      case 504:
        errMessage = 'Network Timeout'
        break
      case 505:
        errMessage = 'HTTP Version Not Supported'
        break
      default:
        errMessage = `Other connection error --${errStatus}`
    }
  } else {
    errMessage = `Unable to connect to the server!`
  }

  console.error(errMessage)
}

export const handleGeneralError = (error) => {
  console.error('Error:', error.message)
}

