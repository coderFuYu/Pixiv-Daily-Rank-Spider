const moment = require('moment')
const nodemailer = require('nodemailer')
const Config = require('./config-myself.js')
const axios = require('./request.js')

/**
 * 延时函数
 * @param time {number} 延时时长(ms)
 * @returns {Promise<unknown>}
 */
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * 数据库操作
 * @param connection {Connection} 数据库连接
 * @param sql {String} SQL语句
 * @returns {Promise<*>} 查询结果
 */
function asyncSql(connection, sql) {
  return new Promise((resolve) => {
    connection.query(sql, (err, result) => {
      if (err) throw err
      resolve(result)
    })
  })
}

/**
 * 查询图片在数据库中是否存在
 * @param connection {Connection} 数据库连接
 * @param src {String} 图片URL
 * @returns {Promise<*>} 数据库中匹配的记录
 */
async function queryRecord(connection, src) {
  return await asyncSql(connection, `SELECT * FROM ${Config.dataBase.table} WHERE url = "${src}"`)
}

/**
 * 向数据库插入新纪录
 * @param connection {Connection} 数据库连接
 * @param date {String} 日期
 * @param index {Number} 图片索引
 * @param src {String} 图片原始链接
 * @param path {String} 图片OSS链接
 * @param isNew {Boolean} 是否是新图片
 */
async function insertRecord(connection, date, index, src, path, isNew) {
  await asyncSql(
    connection,
    `INSERT INTO ${Config.dataBase.table} VALUES ("${Date.now()}", "${date}", ${
      +index + 1
    }, "${src}","${isNew ? Config.OSS.baseUrl + path : path}", ${isNew ? '1' : '0'})`,
  )
}

/**
 * 获取指定日期的HTML文件
 * @param date {String} 日期
 * @returns {Promise<String>} 排行榜HTML字符串
 */
async function getPixivRankHtmlByDate(date) {
  let res = null
  let url =
    'https://www.pixiv.net/ranking.php?mode=daily' +
    (moment().isSame(date, 'day') ? '' : '&date=' + date)
  let errTimes = 0
  while (!res) {
    res = await axios
      .get(url, {
        proxy: Config.proxy,
      })
      .catch(async () => {
        errTimes++
        console.log(`${date}获取HTML第${errTimes}失败`)
        await sleep(5000)
      })
  }
  return res
}

/**
 * 获取指定日期的图片列表
 * @param date {String} 日期
 * @returns {Promise<string[]>} 图片链接数组
 */
async function getPicArrayByDate(date) {
  const html = await getPixivRankHtmlByDate(date)
  let array = html.match(/https:\/\/i\.pximg\.net\/c\/.+?\.(png|jpg)/g)
  array = array.map((i) => i.replace('c/240x480', ''))
  return array
}

/**
 * 获取图片的arraybuffer
 * @param src {String} 图片原始链接
 * @param date {String} 日期
 * @param index {Number} 图片索引
 * @returns {Promise<ArrayBuffer>} 图片文件
 */
async function getPicArrayBuffer(src, date, index) {
  let errTimes = 0
  let res = null
  while (!res) {
    res = await axios
      .get(src, {
        headers: {
          Referer: 'https://www.pixiv.net/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42',
        },
        proxy: Config.proxy,
        responseType: 'arraybuffer',
      })
      .catch(async () => {
        errTimes++
        console.log(`${date}第${index}张第${errTimes}次尝试失败`)
        await sleep(5000)
        return Promise.resolve()
      })
    if (errTimes > 10) break
  }
  if (errTimes) console.log(`${date}第${index}张第${errTimes + 1}次已成功`)
  return res
}

/**
 * 生成要上传的文件路径
 * @param src {String} 文件原始路径
 * @param date {String} 日期
 * @param index {Number} 文件索引
 * @returns {string} 目标文件路径
 */
function getFilePath(src, date, index) {
  //获取文件扩展名
  let temp = src.split('.')
  let Extension = temp[temp.length - 1]
  return `PixivRank/${date + String(+index + 1).padStart(2, '0')}.${Extension}`
}

/**
 * 发送邮件
 * @param connection {Connection} 数据库连接
 * @param date {String} 日期
 */
async function sendEmail(connection, date) {
  const transporter = nodemailer.createTransport({
    host: Config.email.senderHost,
    port: Config.email.senderPort,
    secure: false,
    auth: {
      user: Config.email.senderAddress, // 用户账号
      pass: Config.email.senderPass, //授权码,通过QQ获取
    },
  })
  let imgs = await asyncSql(
    connection,
    `SELECT * from ${Config.dataBase.table} WHERE date = ${date}`,
  )
  let emailHtml = ''
  imgs.forEach(
    (i) => (emailHtml += `<h2>No.${+i.rank}</h2><img src="${i.redirectUrl}" alt="图片"/>\n`),
  )
  for (const mailAddress of Config.email.receiveAddress) {
    await transporter.sendMail({
      from: `今日pixiv排行榜鉴赏<${Config.email.senderAddress}>`, // sender address
      to: mailAddress, // list of receivers
      subject: `这是今日pixiv前50排行榜`, // Subject line
      html: emailHtml,
    })
  }
}

module.exports = {
  sleep,
  queryRecord,
  insertRecord,
  getPicArrayByDate,
  getPicArrayBuffer,
  getFilePath,
  sendEmail,
}
