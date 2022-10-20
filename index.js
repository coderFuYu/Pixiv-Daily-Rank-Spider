const oss = require('ali-oss')
const moment = require('moment')
const mysql = require('mysql')
const schedule = require('node-schedule')
const {
  getPicArrayByDate,
  getPicArrayBuffer,
  getFilePath,
  insertRecord,
  sendEmail,
  queryRecord,
} = require('./utils.js')

const Config = require('./config-myself.js')
const client = Config.OSS.uploadToOSSFlag && oss(Config.OSS)

//主函数
async function main() {
  //初始化数据库
  const connection = mysql.createConnection(Config.dataBase)
  connection.connect()
  let dayMoment = Config.runMode.mode === 'history' ? moment(Config.runMode.startDay) : moment()
  do {
    //获取当天日期字符串
    let timeString = dayMoment.format('YYYYMMDD')
    console.log(timeString + '开始')

    //获取指定日期的排行榜图片列表
    let array = await getPicArrayByDate(timeString)

    //逐条判断排行榜中图片是否存在数据库中,如果存在只更新到数据库,如不存在则先上传到oss再更新至数据库
    for (let index in array) {
      //需要上传至oss
      if (Config.OSS.uploadToOSSFlag) {
        let sqlResult = await queryRecord(connection, array[index])
        //如果数据库中已有此图片则不重新上传,转至第一次上传时链接
        if (sqlResult.length > 0) {
          //过滤掉当天重复提交的情况
          if (!sqlResult.map((i) => i.date).includes(timeString)) {
            console.log(timeString + '第' + (+index + 1) + '张已跳过')
            await insertRecord(
              connection,
              timeString,
              index,
              array[index],
              sqlResult[0].redirectUrl,
              false,
            )
          } else {
            console.log(timeString + '第' + (+index + 1) + '张已存在')
          }
        }
        //如果此图为第一次上榜,则需上传至oss
        else {
          console.log(timeString + '第' + (+index + 1) + '张开始')
          let arraybuffer = await getPicArrayBuffer(array[index], timeString, +index + 1)
          let path = getFilePath(array[index], timeString, index)
          await client.put(`/${path}`, arraybuffer)
          await insertRecord(connection, timeString, index, array[index], path, true)
        }
      }
      //无需上传,只记录地址情况
      else {
        await insertRecord(connection, timeString, index, array[index], array[index], true)
      }
    }
    //发送今日的排行榜至指定邮箱,如配置中为false或执行方式为history则不执行
    if (Config.email.emailFlag && Config.runMode.mode !== 'history') {
      await sendEmail(connection, timeString)
    }
    dayMoment.add(1, 'day')
  } while (Config.runMode.mode === 'history' && dayMoment.isBefore(Config.runMode.endDay, 'day'))

  //关闭数据库连接
  connection.end()
}

if (['once', 'history'].includes(Config.runMode.mode)) {
  main()
} else {
  schedule.scheduleJob(`0 ${Config.dailyRun.minute} ${Config.dailyRun.hour} * * *`, async () => {
    await main()
  })
}
