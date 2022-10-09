const axios = require('axios');
const oss = require('ali-oss');
const moment = require('moment');
const mysql = require('mysql');
const schedule = require("node-schedule")
const nodemailer = require("nodemailer")

const Config = require('./config')
const client = Config.OSS.uploadToOSSFlag && oss(Config.OSS);


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

//睡眠函数
function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

//主函数
async function main () {
  //获取当天日期字符串
  let timeString = moment().format('YYYYMMDD')
  console.log(timeString)
  //初始化数据库
  let connection = mysql.createConnection(Config.dataBase);
  connection.connect();

  let res = null
  while (!res) {
    res = await axios.get('https://www.pixiv.net/ranking.php?mode=daily', {
      proxy: Config.proxy
    }).catch(async (err) => {
      console.log(err)
      await sleep(5000)
    })
  }
  let html = res
  //匹配排行榜链接
  let array = html.match(/https:\/\/i\.pximg\.net\/c\/.+?\.(png|jpg)/g)
  array = array.map(i => i.replace('c/240x480', ''))
  //逐条判断排行榜中图片是否存在数据库中,如果存在只更新到数据库,如不存在则先上传到oss再更新至数据库
  for (let index in array) {
    let errTimes = 0
    //需要上传至oss
    if (Config.OSS.uploadToOSSFlag) {
      let sqlResult = await asyncSql(`SELECT *
                                      FROM ${Config.dataBase.table}
                                      WHERE url = "${array[index]}"`)
      //如果数据库中已有此图片则不重新上传,转至第一次上传时链接
      if (sqlResult.length > 0) {
        //过滤掉当天重复提交的情况
        if (sqlResult[sqlResult.length - 1].date !== timeString) {
          await asyncSql(`INSERT INTO ${Config.dataBase.table}
                          VALUES ("${Date.now()}", "${timeString}", ${+index + 1}, "${array[index]}",
                                  "${sqlResult[0].redirectUrl}", "0")`)
        }
      }
      //如果此图为第一次上榜,则需上传至oss
      else {
        console.log('第' + (+index + 1) + '张开始')
        res = null
        while (!res) {
          res = await axios.get(array[index], {
            headers: {
              Referer: 'https://www.pixiv.net/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.42'
            },
            proxy: Config.proxy,
            responseType: 'arraybuffer'
          }).catch(async (err) => {
            console.log(err)
            errTimes++
            await sleep(5000)
            return Promise.resolve()
          })
          if (errTimes > 10) break
        }
        let arraybuffer = res
        let temp = array[index].split('.')
        let Extension = temp[temp.length - 1]
        let path = `${timeString + String(+index + 1).padStart(2, '0')}.${Extension}`
        await client.put(`/PixivRank/${path}`, arraybuffer)
        await asyncSql(`INSERT INTO ${Config.dataBase.table}
                        VALUES ("${Date.now()}", "${timeString}", ${+index + 1}, "${array[index]}",
                                "${Config.OSS.baseUrl + 'PixivRank/' + path}", "1")`)
      }
    }
    //无需上传,只记录地址情况
    else {
      await asyncSql(`INSERT INTO ${Config.dataBase.table}
                      VALUES ("${Date.now()}", "${timeString}", ${+index + 1}, "${array[index]}",
                              "${array[index]}", "1")`)
    }
  }
  //发送今日的排行榜至指定邮箱,如配置中为false则不执行
  if (Config.email.emailFlag) {
    const transporter = nodemailer.createTransport({
      host: Config.email.senderHost,
      port: Config.email.senderPort,
      secure: false,
      auth: {
        user: Config.email.senderAddress, // 用户账号
        pass: Config.email.senderPass, //授权码,通过QQ获取
      },
    });
    let imgs = await asyncSql(`SELECT *
                               from ${Config.dataBase.table}
                               WHERE date = ${timeString}`)
    let emailHtml = ''
    imgs.forEach(i => emailHtml += `<h2>No.${+i.rank}</h2><img src="${i.redirectUrl}" alt="图片"/>\n`)
    await transporter.sendMail({
      from: `今日pixiv排行榜鉴赏<${Config.email.senderAddress}>`, // sender address
      to: Config.email.receiveAddress, // list of receivers
      subject: `这是今日pixiv前50排行榜`, // Subject line
      html: emailHtml
    });
  }
  //关闭数据库连接
  connection.end();

  function asyncSql (sql) {
    return new Promise(resolve => {
      connection.query(sql, (err, result) => {
        if (err) throw err
        resolve(result)
      })
    })
  }
}


if (Config.dailyRun.dailyFlag) {
  schedule.scheduleJob(`0 ${Config.dailyRun.minute} ${Config.dailyRun.hour} * * *`, async () => {
    await main()
  })
} else {
  main()
}
