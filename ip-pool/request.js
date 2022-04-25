const axios = require("axios")
const Config = require('../config')

axios.defaults.baseURL = Config.proxy.host + ':' + Config.proxy.controlPort
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
axios.defaults.timeout = 5000

axios.interceptors.response.use((response) => {
  if (response.status === 204) {
    return Promise.resolve({ status: 'successful' })
  } else if (!response.data) {
    return Promise.reject(response)
  } else {
    return Promise.resolve(response.data)
  }
})

function getAction (url, params) {
  return axios.get(url, { params })
}

function putAction (url, params) {
  return axios.put(url, params)
}

//获取节点列表
function getNodeList () {
  return getAction('/proxies')
}

//获取节点联通时延
function getNodeDelay (nodeName) {
  return getAction(`/proxies/${nodeName}/delay?timeout=1000&url=http:%2F%2Fwww.fycoder.top`)
}

//切换节点
function selectNode (nodeName) {
  return putAction('/proxies/Proxy', {
    name: nodeName
  })
}

module.exports = {
  getNodeList,
  getNodeDelay,
  selectNode
}