module.exports = {
  proxy: {
    //代理服务器配置(pixiv国内ip禁止访问)
    host: '127.0.0.1', //代理服务器地址(必填)
    port: 7890, //代理服务器端口(必填)
  },
  runMode: {
    //有三种运行模式，
    //1.once为运行一次，获取当天排行
    //2.daily为每天运行,默认为此项
    //3.history为拉取历史数据，不会触发邮件逻辑
    mode: 'daily',
    //当mode为daily时生效，用于规定每日运行时间
    hour: 12,
    minute: 30,
    //当mode为history时生效
    startDay: '20220101',
    endDay: '20220131',
  },
  dataBase: {
    //数据库配置
    host: 'localhost', //数据库地址(必填)
    port: '3306', //数据库端口(必填)
    user: '', //数据库账号(必填)
    password: '', //数据库密码(必填)
    database: '', //数据库名(必填)
    table: 'pixiv_rank', //表名(使用create.sql文件创建的表默认为这个表名)
    connectTimeout: 5000, //连接超时时间
    multipleStatements: false, //是否允许一个query中包含多条sql语句
  },
  OSS: {
    //阿里云OSS设置
    uploadToOSSFlag: false, //是否在获取到排行榜后上传至阿里云oss
    accessKeyId: '', //阿里云账号
    accessKeySecret: '', //阿里云密码
    bucket: '', //bucket库
    region: '', //bucket地址
    baseUrl: '', //oss访问基地址
  },
  email: {
    //邮件选项
    emailFlag: false, //是否在每日抓取到数据后发送邮件到指定邮箱(在mode为history时不生效),默认关闭
    senderAddress: '', //发件邮箱
    senderHost: 'smtp.qq.com', //发件邮箱所属,默认使用QQ邮箱
    senderPort: 587, //发件邮箱使用端口,默认使用QQ邮箱
    senderPass: '', //发件邮箱授权码
    receiveAddress: [], //收件人邮箱
  },
}
