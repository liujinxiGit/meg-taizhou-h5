window.MEG_CONFIG = {
  assetVersion: "20260806-2",
  brandName: "MEG FITNESS",
  storeName: "MEG FITNESS 泰州路店",
  brandProof: "10年专业健身品牌｜第3家门店",
  heroTitle: "家门口新开的\n600㎡专业健身空间",
  subtitle: "可以自己练，也可以跟专业教练练",
  serviceTags: ["自由训练", "塑形私教", "器械普拉提", "拳击训练"],
  businessHours: "每日7:00—23:00",
  address: ["上海市静安区", "泰州路与余姚路交界", "余姚路派出所对面二楼"],
  subwayDistance: "武宁路地铁站步行约250m",
  findTip: "抬头即可看到整墙 MEG FITNESS 大型招牌。",
  deadline: "2026-09-30T23:00:00+08:00",
  deadlineText: "2026年9月30日23:00",
  redemptionDays: 14,
  showRemaining: false,
  accentColor: "#b8ff3d",
  brandLogos: {
    horizontal: "assets/meg-logo-horizontal.png?v=20260806-2",
    vertical: "assets/meg-logo-vertical.png?v=20260806-2"
  },
  heroImage: "assets/hero.webp?v=20260806-2",
  gallery: [
    { src: "assets/elevator.webp?v=20260806-2", label: "电梯厅" },
    { src: "assets/corridor.webp?v=20260806-2", label: "入店走廊" },
    { src: "assets/gym-1.webp?v=20260806-2", label: "自由训练区" },
    { src: "assets/gym-2.webp?v=20260806-2", label: "力量器械区" },
    { src: "assets/gym-3.webp?v=20260806-2", label: "综合训练区" },
    { src: "assets/pilates-1.webp?v=20260806-2", label: "器械普拉提教室" },
    { src: "assets/pilates-2.webp?v=20260806-2", label: "普拉提设备" },
    { src: "assets/changing-room.webp?v=20260806-2", label: "更衣与储物空间" },
    { src: "assets/shower.webp?v=20260806-2", label: "淋浴空间" }
  ],
  experiences: [
    {
      id: "free_training", event: "select_free_training", icon: "01", name: "自由训练体验周卡", quota: 50, remaining: 50,
      button: "我要领取自由训练周卡",
      benefits: ["首次到店开通后连续7个自然日有效", "每天不限进入次数", "可使用7:00—23:00全部开放时段", "首次开通需要提前预约"],
      message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想领取自由训练体验周卡。"
    },
    {
      id: "personal_training", event: "select_personal_training", icon: "02", name: "塑形私教体验课", quota: 20, remaining: 20,
      button: "我要预约塑形私教体验",
      benefits: ["50分钟一对一私教体验", "包含目标沟通和针对性体验训练", "适合减脂塑形、体态改善和科学训练指导"],
      message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想预约塑形私教体验。"
    },
    {
      id: "pilates", event: "select_pilates", icon: "03", name: "器械普拉提体验课", quota: 20, remaining: 20,
      button: "我要预约器械普拉提体验",
      benefits: ["50分钟一对一器械普拉提体验", "适合塑形、体态改善、核心控制和产后体能恢复", "与朋友共同预约时，可以自愿选择一对二体验"],
      message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想预约器械普拉提体验。"
    },
    {
      id: "boxing", event: "select_boxing", icon: "04", name: "拳击体验课", quota: 20, remaining: 20,
      button: "我要预约拳击体验课",
      benefits: ["预约制一对一拳击体验", "基础拳法、步法与协调练习", "适合想了解拳击训练或提升体能的新手"],
      message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想预约拳击体验课。"
    }
  ],
  trainingPrograms: [
    { id: "posture", enabled: true, name: "体态纠正", englishName: "Posture Training" },
    { id: "physical-reconditioning", enabled: true, name: "运动功能重建", englishName: "Movement Rehabilitation" },
    { id: "weightlifting", enabled: true },
    { id: "functional", enabled: true },
    { id: "mobility-recovery", enabled: true },
    { id: "sports-performance", enabled: true },
    { id: "youth-fitness", enabled: true },
    { id: "boxing", enabled: true },
    { id: "group-classes", enabled: true }
  ],
  goalRecommendations: {
    independent: "open-gym",
    "body-shaping": "personal-training",
    posture: "personal-training",
    discomfort: "physical-reconditioning",
    strength: "personal-training",
    weightlifting: "olympic-weightlifting",
    "sports-performance": "sports-performance",
    boxing: "boxing-training",
    "youth-fitness": "youth-fitness",
    pilates: "pilates",
    "group-classes": "group-classes",
    recovery: "mobility-recovery"
  },
  coachImages: {
    primary: "assets/coach-xu.webp?v=20260806-2",
    training: "assets/coach-xu-training.webp?v=20260806-2"
  },
  showCoachSection: true,
  coaches: [
    {
      id: "manager",
      enabled: true,
      active: true,
      name: "许教练",
      englishName: "Coach Xu",
      role: "MEG FITNESS 泰州路店店长",
      photo: "assets/coach-xu.webp?v=20260806-2",
      specialties: ["功能性训练", "塑形减脂", "举重训练"],
      yearsOfExperience: 10,
      education: "社会体育指导与管理专业",
      certifications: ["NSCA-CSCS", "SNC国际运动营养咨询师"],
      brandRole: "MEG内训课程总监",
      clients: "300+",
      sessions: "12,000+"
    }
  ],
  showLocationsSection: true,
  showTimeline: true,
  locationImages: {
    pac: "assets/location-pac.webp?v=20260806-2",
    pacGallery: [
      "assets/location-pac-storefront.webp?v=20260806-2",
      "assets/location-pac-strength.webp?v=20260806-2",
      "assets/location-pac-rack.webp?v=20260806-2",
      "assets/location-pac-cardio.webp?v=20260806-2",
      "assets/location-pac-rower.webp?v=20260806-2",
      "assets/location-pac-boxing.webp?v=20260806-2",
      "assets/location-pac-refreshments.webp?v=20260806-2",
      "assets/location-pac-wash.webp?v=20260806-2"
    ],
    wuding: "assets/location-wuding.webp?v=20260806-2",
    wudingGallery: [
      "assets/location-wuding-cardio.webp?v=20260806-2",
      "assets/location-wuding-dumbbells.webp?v=20260806-2",
      "assets/location-wuding-strength.webp?v=20260806-2",
      "assets/location-wuding-conditioning.webp?v=20260806-2",
      "assets/location-wuding-changing.webp?v=20260806-2"
    ],
    taizhou: "assets/hero.webp?v=20260806-2"
  },
  locations: [
    {
      id: "pac",
      enabled: true,
      name: "MEG FITNESS PAC店",
      englishName: "MEG FITNESS PAC",
      photo: "assets/location-pac.webp?v=20260806-2",
      dianpingUrl: "https://m.dianping.com/shopshare/k6PeI2SIFHsajQTS?msource=Appshare2021&utm_source=shop_share&shoptype=45&shopcategoryid=33845&isoversea=0&shareid=B08OqUO8aj_1786274199",
      openingYear: 2016,
      area: "上海市静安区PAC购物中心1号楼",
      positioning: "高端商场私教工作室",
      services: ["塑形减脂", "拳击训练", "体态纠正"]
    },
    {
      id: "wuding",
      enabled: true,
      name: "MEG FITNESS 武定路店",
      englishName: "MEG FITNESS Wuding Road",
      photo: "assets/location-wuding.webp?v=20260806-2",
      dianpingUrl: "https://m.dianping.com/shopshare/G69Up4uaqNdQcfyG?msource=Appshare2021&utm_source=shop_share&shoptype=45&shopcategoryid=33845&isoversea=0&shareid=IKSe2wRTk5_1786274221",
      openingYear: 2021,
      area: "上海市静安区武定路1102号怡甸公寓一楼",
      positioning: "高端塑形私教工作室",
      services: ["塑形减脂", "增肌", "器械普拉提"]
    },
    {
      id: "taizhou",
      enabled: true,
      name: "MEG FITNESS 泰州路店",
      englishName: "MEG FITNESS Taizhou Road",
      photo: "assets/hero.webp?v=20260806-2",
      dianpingUrl: "https://m.dianping.com/shopshare/k8qHwlGa6at3jQcM?msource=Appshare2021&utm_source=shop_share&shoptype=45&shopcategoryid=33844&isoversea=0&shareid=aGiS8T3twx_1786274299",
      openingYear: 2026,
      area: "上海市静安区泰州路与余姚路交界",
      positioning: "自由训练、私教与器械普拉提综合训练空间",
      services: ["约300㎡自由训练区", "塑形私教", "器械普拉提"],
      status: "NEW"
    }
  ]
};
