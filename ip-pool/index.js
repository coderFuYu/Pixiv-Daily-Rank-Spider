const apis = require('./request');
const fs = require('fs');

//获取节点列表并写入文件
function getIpPool () {
  return new Promise(async resolve => {
    let nodeList = (await apis.getNodeList()).proxies
    let nodeNameArray = Object.keys(nodeList)
    const uselessNode = ['AsianTV', 'DIRECT', 'Domestic', 'GLOBAL', 'GlobalTV', 'Others', 'Proxy', 'REJECT']
    // nodeNameArray存取所有节点的名称
    nodeNameArray = nodeNameArray.filter(i => {
      if (i.includes('剩余')) return false
      else if (i.includes('节点')) return false
      else if (uselessNode.includes(i)) return false
      return true
    })
    let nodeDelays = []

    //因为axios限制，将节点分块请求获取延迟数据
    const spliceNodeNameArray = []
    for (let i = 0; i < Math.ceil(nodeNameArray.length / 5); i++) {
      spliceNodeNameArray.push(nodeNameArray.slice(i * 5, i * 5 + 5))
    }
    for (let fiveNodeName of spliceNodeNameArray) {
      let res = await Promise.all(fiveNodeName.map(async (i, index) => apis.getNodeDelay(encodeURI(i)).catch(err => Promise.resolve({ delay: 5000 }))))
      res.forEach((delayObj, index) => delayObj.name = fiveNodeName[index])
      nodeDelays.push(...res)
    }

    //nodeDelays中存储所有节点名称和延迟数据
    nodeDelays = nodeDelays.filter(i => i.delay < 5000).sort((a, b) => a.delay - b.delay).slice(0, 20)
    console.log(nodeDelays)

    fs.writeFile('./ip-pool/clash-node.txt', JSON.stringify(nodeDelays), (err) => resolve())
  })

}

//读取列表节点文件
function readIpPool () {
  return new Promise((resolve, reject) => {
    fs.readFile('./ip-pool/clash-node.txt', 'utf8', (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

//睡眠函数
function sleep(time){
  return new Promise(resolve => setTimeout(resolve,time))
}

module.exports = {
  readIpPool,
  getIpPool,
  sleep,
  selectNode: apis.selectNode
}

