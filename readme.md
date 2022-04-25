# pixiv-daily-rank-spider
这是一个使用nodejs实现的pixiv排行榜图片爬虫,可以通过若干配置项实现一定的定制化

## 前置条件
- 因为pixiv无法使用国内ip进行访问需要进行科学上网请求接口,因此需要配置代理服务器和端口,项目需要使用clash for linux软件，如今增加了IP池解决Pixiv的反爬机制，必须打开远程管理功能，并将代理端口加入到系统环境中（我知道这个限制问题挺多的，先放着吧，现在主要是自己用，~~有人看到提issue了再改~~）
- 需要一个数据库进行每日数据存取,需要在config.js中配置数据库地址\账密,因能力有限,目前只支持mysql数据库,对应数据表可以使用create.sql文件创建
- 如需要转存图片,需要使用阿里云的OSS产品,在config.js中进行配置

## 如何使用
- 1.使用npm install安装项目依赖
- 2.使用create.sql创建符合的数据表
- 3.配置config.js文件,配置数据库,代理服务器或者OSS和邮件信息等
- 4.node index.js启动项目

## 各配置项说明:
- proxy:代理服务器配置(必填)
- dailyRun:单次运行/每日定时运行(可选)
- dataBase:数据库配置(必填)
- OSS:阿里云OSS配置,开启后可将图片转存至配置的OSS中,以后访问就不需要使用外网了(可选)
- email:邮件配置,可将获取到的排行图片发送至指定邮箱(可选)
