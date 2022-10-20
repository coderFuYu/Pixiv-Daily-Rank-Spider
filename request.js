const axios = require('axios')
axios.defaults.timeout = 20000

axios.interceptors.response.use((response) => {
  if (response.status === 204) {
    return Promise.resolve({ status: 'successful' })
  } else if (!response.data) {
    return Promise.reject(response)
  } else {
    return Promise.resolve(response.data)
  }
})

module.exports = axios
