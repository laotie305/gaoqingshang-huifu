export interface Scenario {
  id: string;
  name: string;
  icon: string; // mapped to Lucide icons
  description: string;
  presets: string[];
  isCustom?: boolean;
}

export const defaultScenarios: Scenario[] = [
  {
    id: "daily",
    name: "日常聊天",
    icon: "MessageCircle",
    description: "朋友闲聊、开启话题、打破沉默，让聊天自然又愉快。",
    presets: [
      "在干嘛呢？",
      "哈哈，你真有意思",
      "最近好忙啊，感觉快被榨干了",
      "明天周末，你有什么打算吗？"
    ]
  },
  {
    id: "workplace",
    name: "职场",
    icon: "Briefcase",
    description: "职场汇报、委婉请假、高情商拒绝额外加班或不合理要求。",
    presets: [
      "这个项目今天下班前必须交。",
      "小张，周末来加个班，大家都在呢。",
      "能顺便帮我把这个表也做一下吗？",
      "我觉得你这个方案写得太简单了。"
    ]
  },
  {
    id: "fight_mitigation",
    name: "吵架缓和",
    icon: "HeartCrack",
    description: "情侣或朋友争吵时，迅速给双方台阶，降温情绪，理性沟通。",
    presets: [
      "都是我的错行了吧！",
      "随你便，我不想说了，随便你怎么想。",
      "你怎么总是这样？一点都不体谅我！",
      "算了，我们不合适，分手吧。"
    ]
  },
  {
    id: "love",
    name: "表白",
    icon: "Heart",
    description: "暧昧期试探、真诚表白、高情商传递爱意，让心跳加速。",
    presets: [
      "我好像有点喜欢你。",
      "你觉得我们合适吗？",
      "你喜欢什么样性格的人？",
      "今天跟你在一起玩，我真的好开心呀。"
    ]
  },
  {
    id: "comfort",
    name: "安慰",
    icon: "Sparkles",
    description: "朋友失落、沮丧或承受压力时，给予温暖与切实的情绪支撑。",
    presets: [
      "我今天面试/考试又砸了，感觉自己好失败。",
      "工作压力真的好大，突然好想大哭一场。",
      "唉，觉得自己干什么都干不好，太差劲了。",
      "今天失恋了，感觉天都塌下来了。"
    ]
  },
  {
    id: "awkward",
    name: "尴尬解围",
    icon: "Smile",
    description: "遭遇催婚、被问隐私、身材调侃或认错人时的自嘲与高情商解围。",
    presets: [
      "你最近是不是胖了？脸圆了好多哦。",
      "你怎么还没结婚？再不结就是大龄剩男/剩女了。",
      "你一个月挣多少钱啊？买得起房吗？",
      "哎呀，不好意思，我认错人了，还拍了你肩膀。"
    ]
  },
  {
    id: "customer",
    name: "客户沟通",
    icon: "Users",
    description: "面对客户嫌贵、投诉、延迟发货或对方案不满意时的专业公关话术。",
    presets: [
      "这个价格太贵了，隔壁家比你们便宜一半呢！",
      "怎么还没发货？我要投诉退单！",
      "这个设计方案我不满意，全部推翻重做。",
      "你们的服务态度也太差了吧！"
    ]
  }
];
