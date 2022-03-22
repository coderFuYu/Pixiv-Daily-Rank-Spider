CREATE TABLE `pixiv_rank` (
  `id` varchar(16) NOT NULL,
  `date` varchar(8) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `rank` int(3) NOT NULL,
  `url` varchar(255) NOT NULL,
  `redirectUrl` varchar(255) DEFAULT NULL,
  `isNew` varchar(1) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '1为之前数据库中没有的，0为之前有上过榜的',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
