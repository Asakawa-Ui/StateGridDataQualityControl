'use strict';

/**
 * 全国 34 个省级行政区及其下辖地市级行政区监测装置与在线态势数据字典
 * 数据规则：
 * 1. 每个地级单位：total = online + abnormal + offline；rate = ((online + abnormal) / total * 100).toFixed(2)
 * 2. 每个省级单位：total = sum(cities.total)，online = sum(cities.online)，abnormal = sum(cities.abnormal)，offline = sum(cities.offline)
 * 3. 前 8 个核心省份与原始原型及重点异常事件（甘孜、余杭、滨海、望城、江夏、歙县等）严格对应闭环
 */
const CHINA_DIVISIONS = [
  {
    name: '四川省', short: '四川', total: 196, online: 189, abnormal: 1, offline: 6, rate: 96.43,
    cities: [
      { name: '成都', total: 28, online: 27, abnormal: 0, offline: 1, rate: 96.43 },
      { name: '绵阳', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宜宾', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '德阳', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南充', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '泸州', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '达州', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '甘孜', total: 10, online: 9, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '乐山', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '凉山', total: 9, online: 8, abnormal: 0, offline: 1, rate: 88.89 },
      { name: '广元', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '自贡', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '内江', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '遂宁', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '广安', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '眉山', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '雅安', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '资阳', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '巴中', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '攀枝花', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阿坝', total: 2, online: 1, abnormal: 0, offline: 1, rate: 50.00 }
    ]
  },
  {
    name: '广东省', short: '广东', total: 188, online: 185, abnormal: 1, offline: 2, rate: 98.94,
    cities: [
      { name: '广州', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '深圳', total: 24, online: 24, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '佛山', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '东莞', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '惠州', total: 14, online: 13, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '珠海', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '中山', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '江门', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '湛江', total: 8, online: 7, abnormal: 0, offline: 1, rate: 87.50 },
      { name: '茂名', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '汕头', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '肇庆', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '清远', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '韶关', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '揭阳', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '梅州', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '潮州', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '汕尾', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阳江', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '河源', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '云浮', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '浙江省', short: '浙江', total: 184, online: 181, abnormal: 1, offline: 2, rate: 98.37,
    cities: [
      { name: '杭州', total: 30, online: 29, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '宁波', total: 25, online: 24, abnormal: 0, offline: 1, rate: 96.00 },
      { name: '温州', total: 22, online: 22, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '嘉兴', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '绍兴', total: 17, online: 17, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '金华', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '台州', total: 15, online: 14, abnormal: 0, offline: 1, rate: 93.33 },
      { name: '湖州', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '衢州', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '丽水', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '舟山', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '江苏省', short: '江苏', total: 178, online: 174, abnormal: 1, offline: 3, rate: 97.75,
    cities: [
      { name: '苏州', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南京', total: 24, online: 23, abnormal: 0, offline: 1, rate: 95.83 },
      { name: '无锡', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南通', total: 17, online: 17, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '常州', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '徐州', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '盐城', total: 14, online: 13, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '扬州', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '泰州', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '镇江', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '淮安', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '连云港', total: 8, online: 7, abnormal: 0, offline: 1, rate: 87.50 },
      { name: '宿迁', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '山东省', short: '山东', total: 172, online: 168, abnormal: 1, offline: 3, rate: 98.26,
    cities: [
      { name: '济南', total: 24, online: 24, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '青岛', total: 22, online: 22, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '烟台', total: 17, online: 16, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '潍坊', total: 16, online: 15, abnormal: 0, offline: 1, rate: 93.75 },
      { name: '临沂', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '济宁', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '淄博', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '菏泽', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '德州', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '泰安', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '聊城', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '滨州', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '东营', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '威海', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '日照', total: 3, online: 2, abnormal: 0, offline: 1, rate: 66.67 },
      { name: '枣庄', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '湖南省', short: '湖南', total: 164, online: 158, abnormal: 1, offline: 5, rate: 96.34,
    cities: [
      { name: '长沙', total: 26, online: 24, abnormal: 1, offline: 1, rate: 96.15 },
      { name: '衡阳', total: 17, online: 17, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '株洲', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '岳阳', total: 15, online: 14, abnormal: 0, offline: 1, rate: 93.33 },
      { name: '常德', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '郴州', total: 13, online: 12, abnormal: 0, offline: 1, rate: 92.31 },
      { name: '湘潭', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '邵阳', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '永州', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '益阳', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '怀化', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '娄底', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '湘西', total: 4, online: 3, abnormal: 0, offline: 1, rate: 75.00 },
      { name: '张家界', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '河北省', short: '河北', total: 158, online: 154, abnormal: 1, offline: 3, rate: 98.10,
    cities: [
      { name: '石家庄', total: 26, online: 25, abnormal: 0, offline: 1, rate: 96.15 },
      { name: '唐山', total: 22, online: 22, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '保定', total: 20, online: 19, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '邯郸', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '沧州', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '廊坊', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '邢台', total: 11, online: 10, abnormal: 0, offline: 1, rate: 90.91 },
      { name: '秦皇岛', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '张家口', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '承德', total: 8, online: 7, abnormal: 0, offline: 1, rate: 87.50 },
      { name: '衡水', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '雄安', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '湖北省', short: '湖北', total: 156, online: 151, abnormal: 1, offline: 4, rate: 96.79,
    cities: [
      { name: '武汉', total: 28, online: 26, abnormal: 1, offline: 1, rate: 96.43 },
      { name: '襄阳', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宜昌', total: 16, online: 15, abnormal: 0, offline: 1, rate: 93.75 },
      { name: '荆州', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黄冈', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '孝感', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '十堰', total: 11, online: 10, abnormal: 0, offline: 1, rate: 90.91 },
      { name: '荆门', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黄石', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '咸宁', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '恩施', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '随州', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '鄂州', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '仙桃', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '潜江', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '天门', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '神农架', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '安徽省', short: '安徽', total: 148, online: 145, abnormal: 1, offline: 2, rate: 97.97,
    cities: [
      { name: '合肥', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '芜湖', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '滁州', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阜阳', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '安庆', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '蚌埠', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '马鞍山', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宿州', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '六安', total: 8, online: 7, abnormal: 0, offline: 1, rate: 87.50 },
      { name: '宣城', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黄山', total: 6, online: 5, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '亳州', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '淮南', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '淮北', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '铜陵', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '池州', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '福建省', short: '福建', total: 142, online: 139, abnormal: 1, offline: 2, rate: 98.59,
    cities: [
      { name: '福州', total: 28, online: 28, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '厦门', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '泉州', total: 24, online: 23, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '漳州', total: 17, online: 16, abnormal: 0, offline: 1, rate: 94.12 },
      { name: '宁德', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '莆田', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '龙岩', total: 9, online: 8, abnormal: 0, offline: 1, rate: 88.89 },
      { name: '三明', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南平', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '陕西省', short: '陕西', total: 136, online: 132, abnormal: 1, offline: 3, rate: 97.79,
    cities: [
      { name: '西安', total: 32, online: 31, abnormal: 0, offline: 1, rate: 96.88 },
      { name: '榆林', total: 20, online: 19, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '咸阳', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宝鸡', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '渭南', total: 14, online: 13, abnormal: 0, offline: 1, rate: 92.86 },
      { name: '延安', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '汉中', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '安康', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '商洛', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '铜川', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '河南省', short: '河南', total: 132, online: 129, abnormal: 0, offline: 3, rate: 97.73,
    cities: [
      { name: '郑州', total: 24, online: 23, abnormal: 0, offline: 1, rate: 95.83 },
      { name: '洛阳', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南阳', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '新乡', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '许昌', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '周口', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '商丘', total: 7, online: 6, abnormal: 0, offline: 1, rate: 85.71 },
      { name: '信阳', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '平顶山', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '开封', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '安阳', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '焦作', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '驻马店', total: 4, online: 3, abnormal: 0, offline: 1, rate: 75.00 },
      { name: '漯河', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '濮阳', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '三门峡', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '鹤壁', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '济源', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '江西省', short: '江西', total: 130, online: 127, abnormal: 1, offline: 2, rate: 98.46,
    cities: [
      { name: '南昌', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '赣州', total: 20, online: 19, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '九江', total: 17, online: 16, abnormal: 0, offline: 1, rate: 94.12 },
      { name: '上饶', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宜春', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '吉安', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '抚州', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '萍乡', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '新余', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '景德镇', total: 4, online: 3, abnormal: 0, offline: 1, rate: 75.00 },
      { name: '鹰潭', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '山西省', short: '山西', total: 122, online: 119, abnormal: 0, offline: 3, rate: 97.54,
    cities: [
      { name: '太原', total: 25, online: 24, abnormal: 0, offline: 1, rate: 96.00 },
      { name: '大同', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '运城', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '临汾', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '晋中', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '长治', total: 11, online: 11, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '晋城', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '忻州', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '吕梁', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '阳泉', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '朔州', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '辽宁省', short: '辽宁', total: 118, online: 115, abnormal: 1, offline: 2, rate: 98.31,
    cities: [
      { name: '沈阳', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '大连', total: 24, online: 23, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '鞍山', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '锦州', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '抚顺', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '营口', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '盘锦', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '朝阳', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '丹东', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '辽阳', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '本溪', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '铁岭', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '葫芦岛', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阜新', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '内蒙古自治区', short: '内蒙古', total: 115, online: 111, abnormal: 1, offline: 3, rate: 97.39,
    cities: [
      { name: '呼和浩特', total: 20, online: 20, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '包头', total: 18, online: 17, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '鄂尔多斯', total: 17, online: 16, abnormal: 0, offline: 1, rate: 94.12 },
      { name: '赤峰', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '通辽', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '呼伦贝尔', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '乌兰察布', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '巴彦淖尔', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '锡林郭勒', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '兴安盟', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '乌海', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阿拉善', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '云南省', short: '云南', total: 112, online: 108, abnormal: 1, offline: 3, rate: 97.32,
    cities: [
      { name: '昆明', total: 24, online: 24, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '曲靖', total: 15, online: 14, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '玉溪', total: 12, online: 12, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '红河', total: 11, online: 10, abnormal: 0, offline: 1, rate: 90.91 },
      { name: '大理', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '楚雄', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '昭通', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '文山', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '保山', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '普洱', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '临沧', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '丽江', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '西双版纳', total: 2, online: 1, abnormal: 0, offline: 1, rate: 50.00 },
      { name: '德宏', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '迪庆', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '怒江', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '广西壮族自治区', short: '广西', total: 108, online: 105, abnormal: 1, offline: 2, rate: 98.15,
    cities: [
      { name: '南宁', total: 24, online: 24, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '桂林', total: 18, online: 17, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '柳州', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '玉林', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '百色', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '钦州', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '贵港', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '梧州', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '河池', total: 3, online: 2, abnormal: 0, offline: 1, rate: 66.67 },
      { name: '北海', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '防城港', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '崇左', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '来宾', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '贺州', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '重庆市', short: '重庆', total: 98, online: 95, abnormal: 1, offline: 2, rate: 97.96,
    cities: [
      { name: '渝北', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '九龙坡', total: 13, online: 13, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '江北', total: 12, online: 11, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '万州', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '沙坪坝', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '南岸', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '涪陵', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '巴南', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '江津', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '永川', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '合川', total: 3, online: 2, abnormal: 0, offline: 1, rate: 66.67 },
      { name: '长寿', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黔江', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '开州', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '核心区', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '贵州省', short: '贵州', total: 92, online: 89, abnormal: 1, offline: 2, rate: 97.83,
    cities: [
      { name: '贵阳', total: 24, online: 24, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '遵义', total: 18, online: 17, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '毕节', total: 13, online: 12, abnormal: 0, offline: 1, rate: 92.31 },
      { name: '黔南', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黔东南', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '六盘水', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '安顺', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '铜仁', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黔西南', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '黑龙江省', short: '黑龙江', total: 86, online: 83, abnormal: 1, offline: 2, rate: 97.67,
    cities: [
      { name: '哈尔滨', total: 26, online: 26, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '大庆', total: 16, online: 15, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '齐齐哈尔', total: 12, online: 11, abnormal: 0, offline: 1, rate: 91.67 },
      { name: '牡丹江', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '佳木斯', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '绥化', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '鸡西', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '双鸭山', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '伊春', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '七台河', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '鹤岗', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黑河', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '大兴安岭', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '吉林省', short: '吉林', total: 82, online: 80, abnormal: 1, offline: 1, rate: 98.78,
    cities: [
      { name: '长春', total: 28, online: 28, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '吉林', total: 19, online: 18, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '延边', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '松原', total: 7, online: 6, abnormal: 0, offline: 1, rate: 85.71 },
      { name: '四平', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '通化', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '白城', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '辽源', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '白山', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '北京市', short: '北京', total: 80, online: 78, abnormal: 1, offline: 1, rate: 98.75,
    cities: [
      { name: '朝阳', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '海淀', total: 12, online: 11, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '昌平', total: 9, online: 9, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '大兴', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '通州', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '顺义', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '房山', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '丰台', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '怀柔', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '密云', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '延庆', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '平谷', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '门头沟', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '石景山', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '核心区', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '新疆维吾尔自治区', short: '新疆', total: 76, online: 73, abnormal: 1, offline: 2, rate: 97.37,
    cities: [
      { name: '乌鲁木齐', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '昌吉', total: 12, online: 11, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '伊犁', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '巴州', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阿克苏', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '喀什', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '克拉玛依', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '塔城', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '哈密', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '吐鲁番', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '博州', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '和田', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阿勒泰', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '克州', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '上海市', short: '上海', total: 72, online: 71, abnormal: 0, offline: 1, rate: 98.61,
    cities: [
      { name: '浦东', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '闵行', total: 10, online: 10, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宝山', total: 7, online: 6, abnormal: 0, offline: 1, rate: 85.71 },
      { name: '嘉定', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '松江', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '青浦', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '奉贤', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '金山', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '杨浦', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '徐汇', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '普陀', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '长宁', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '静安', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '虹口', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黄浦', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '崇明', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '甘肃省', short: '甘肃', total: 68, online: 66, abnormal: 1, offline: 1, rate: 98.53,
    cities: [
      { name: '兰州', total: 18, online: 18, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '酒泉', total: 10, online: 9, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '白银', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '天水', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '张掖', total: 5, online: 4, abnormal: 0, offline: 1, rate: 80.00 },
      { name: '庆阳', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '武威', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '定西', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '陇南', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '平凉', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '金昌', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '嘉峪关', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '临夏', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '甘南', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '天津市', short: '天津', total: 58, online: 57, abnormal: 0, offline: 1, rate: 98.28,
    cities: [
      { name: '滨海', total: 16, online: 16, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '西青', total: 8, online: 8, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '武清', total: 7, online: 6, abnormal: 0, offline: 1, rate: 85.71 },
      { name: '北辰', total: 6, online: 6, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '东丽', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '津南', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宝坻', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '静海', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '蓟州', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '宁河', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '中心城区', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '青海省', short: '青海', total: 52, online: 50, abnormal: 1, offline: 1, rate: 98.08,
    cities: [
      { name: '西宁', total: 20, online: 20, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '海东', total: 12, online: 11, abnormal: 1, offline: 0, rate: 100.00 },
      { name: '海西', total: 8, online: 7, abnormal: 0, offline: 1, rate: 87.50 },
      { name: '海北', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '海南', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '黄南', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '玉树', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '果洛', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '宁夏回族自治区', short: '宁夏', total: 46, online: 45, abnormal: 0, offline: 1, rate: 97.83,
    cities: [
      { name: '银川', total: 20, online: 20, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '吴忠', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '石嘴山', total: 7, online: 7, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '中卫', total: 5, online: 5, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '固原', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '海南省', short: '海南', total: 38, online: 37, abnormal: 0, offline: 1, rate: 97.37,
    cities: [
      { name: '海口', total: 15, online: 15, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '三亚', total: 10, online: 9, abnormal: 0, offline: 1, rate: 90.00 },
      { name: '儋州', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '琼海', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '文昌', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '万宁', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '东方', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '五指山', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  },
  {
    name: '西藏自治区', short: '西藏', total: 32, online: 31, abnormal: 0, offline: 1, rate: 96.88,
    cities: [
      { name: '拉萨', total: 14, online: 14, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '日喀则', total: 6, online: 5, abnormal: 0, offline: 1, rate: 83.33 },
      { name: '昌都', total: 4, online: 4, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '林芝', total: 3, online: 3, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '山南', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '那曲', total: 2, online: 2, abnormal: 0, offline: 0, rate: 100.00 },
      { name: '阿里', total: 1, online: 1, abnormal: 0, offline: 0, rate: 100.00 }
    ]
  }
];

// 辅助方法：快速按名称或简称查找省级单位
function findChinaDivision(nameOrShort) {
  if (!nameOrShort || nameOrShort === '全国') return null;
  return CHINA_DIVISIONS.find(p => p.name === nameOrShort || p.short === nameOrShort || nameOrShort.startsWith(p.short));
}
