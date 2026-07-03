import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, history, selectedScenario, customScenarios } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "原话内容不能为空" }, { status: 400 });
    }

    const apiKey = process.env.AGNES_API_KEY || "";

    // If API key is not configured, run in "Demo Mode" with highly realistic simulated responses.
    if (!apiKey) {
      return NextResponse.json(generateSimulatedResponse(message, selectedScenario, history));
    }

    const systemPrompt = `你是一个拥有极高情商、洞察人心且擅长人际沟通的【高情商回话助手】。
你的任务是根据用户输入的“对方原话”、对话历史上下文以及选定的场景，匹配最合适的场景并生成 3 种不同风格的回复：
1. 【温和 (gentle)】：字里行间充满理解、同理心、温柔与善意，适合拉近距离、缓和气氛或给予情绪价值。
2. 【高情商 (high_eq)】：幽默、睿智、得体，能化解尴尬、提升好感、展现格局或巧妙化解矛盾冲突。
3. 【简洁 (concise)】：言简意赅，礼貌、大方且高效，不拖泥带水。

你必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块（如 \`\`\`json 和 \`\`\`）、任何多余的解释说明性文字。
输出的 JSON 结构必须如下，字段名必须完全一致且为英文：
{
  "matched_scenario": "匹配到的场景名称",
  "gentle": "温和风格回复",
  "high_eq": "高情商风格回复",
  "concise": "简洁风格回复"
}`;

    let userPrompt = "";
    if (history && history.length > 0) {
      userPrompt += `对话历史上下文：\n`;
      history.forEach((turn: any, idx: number) => {
        const styleText = turn.style === "gentle" ? "温和" : turn.style === "high_eq" ? "高情商" : "简洁";
        userPrompt += `[回合 ${idx + 1}]\n对方说: "${turn.partner}"\n我选择以 [${styleText}] 风格回复: "${turn.reply}"\n`;
      });
      userPrompt += `\n`;
    }
    userPrompt += `当前对方最新发来的原话: "${message}"\n`;
    if (selectedScenario && selectedScenario !== "自动匹配") {
      userPrompt += `当前用户倾向/选定的场景: "${selectedScenario}"\n`;
    }
    if (customScenarios && customScenarios.length > 0) {
      userPrompt += `系统支持的额外自定义场景列表: ${JSON.stringify(customScenarios)}\n`;
    }
    userPrompt += `\n请根据以上信息进行场景匹配并生成 3 种不同风格回复。输出必须是一个合法的 JSON。`;

    // Fetch from Agnes AI endpoint
    const response = await fetch("https://apihub.agnes-ai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agnes AI API Error:", errorText);
      // Fallback to high-quality simulation if the API returns an error so that the app is always resilient
      return NextResponse.json(generateSimulatedResponse(message, selectedScenario, history));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON safely from response, cleaning up markdown backticks if present.
    try {
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        ...parsed,
        isDemo: false
      });
    } catch (parseError) {
      console.error("Failed to parse API JSON:", content, parseError);
      // Fallback to simulation if JSON parsing failed
      return NextResponse.json(generateSimulatedResponse(message, selectedScenario, history));
    }

  } catch (error: any) {
    console.error("API handler error:", error);
    return NextResponse.json({ error: error.message || "服务器内部错误" }, { status: 500 });
  }
}

/**
 * Generates high-quality fallback responses to guarantee flawless UX.
 */
function generateSimulatedResponse(message: string, selectedScenario: string, history: any[]) {
  const text = message.trim();
  
  // 1. Detect Scenario
  let matched = "日常聊天";
  if (selectedScenario && selectedScenario !== "自动匹配") {
    matched = selectedScenario;
  } else {
    // Basic heuristic matching
    if (text.includes("加班") || text.includes("下班") || text.includes("项目") || text.includes("方案") || text.includes("会议") || text.includes("请假") || text.includes("周报")) {
      matched = "职场";
    } else if (text.includes("分手") || text.includes("错") || text.includes("生气") || text.includes("随你便") || text.includes("不想说") || text.includes("吵架") || text.includes("讨厌")) {
      matched = "吵架缓和";
    } else if (text.includes("喜欢") || text.includes("表表") || text.includes("合适吗") || text.includes("心动") || text.includes("爱") || text.includes("情侣")) {
      matched = "表白";
    } else if (text.includes("难过") || text.includes("压力") || text.includes("哭") || text.includes("差劲") || text.includes("考砸") || text.includes("累")) {
      matched = "安慰";
    } else if (text.includes("胖") || text.includes("结婚") || text.includes("对象") || text.includes("多少钱") || text.includes("工资") || text.includes("认错")) {
      matched = "尴尬解围";
    } else if (text.includes("便宜") || text.includes("退款") || text.includes("发货") || text.includes("贵") || text.includes("不满意") || text.includes("产品")) {
      matched = "客户沟通";
    }
  }

  // 2. Respond based on message keywords
  let gentle = `我理解你的感受，这确实需要一些时间和耐心来面对。我们可以慢慢来。`;
  let high_eq = `生活总有一些不期而遇的起伏。听你这么说，我也深有感触，幸好还有机会让我们一起把事情变得更好。`;
  let concise = `收到，我们一起想想办法。`;

  if (matched === "日常聊天") {
    if (text.includes("干嘛") || text.includes("在吗")) {
      gentle = "在想一些有趣的事呢，比如什么时候能和你聊聊天呀。你今天过得怎么样？";
      high_eq = "正在接收你的脑电波召唤，这不，刚想着你，你就发消息过来了，真有默契！";
      concise = "在忙，怎么啦？";
    } else if (text.includes("好忙") || text.includes("累")) {
      gentle = "辛苦啦！忙完了记得泡杯热茶休息一下，身体最重要哦，随时可以找我吐槽。";
      high_eq = "看来能力越强责任越大呀！不过再忙也别忘了给自己充充电，今晚要不要奖励自己吃顿好的？";
      concise = "辛苦了，注意休息，忙完联系。";
    } else {
      gentle = "哈哈，听你这么说感觉很有意思。感觉你是一个特别热爱生活的人呢。";
      high_eq = "哈哈，你这个视角太独特了，一句话就让我今天的心情明亮了起来。";
      concise = "哈哈，确实是这样。";
    }
  } else if (matched === "职场") {
    if (text.includes("加班")) {
      gentle = "好的，没问题。为了项目的进度，我今天会把这部分内容跟进好。您也别太辛苦了。";
      high_eq = "收到！为了咱们项目的顺利推进，我全力以赴。不过领导，等项目圆满结束后，能申请给大家调休补个觉吗？";
      concise = "收到，保证按时保质完成任务。";
    } else if (text.includes("下班前必须交")) {
      gentle = "好的，我明白这个任务非常紧急。我这就优先处理，争取下班前把初稿同步给您。";
      high_eq = "收到您的催促，我立刻拉满生产力！不过为了保证核心数据不出错，我会在完成第一时间向您确认。";
      concise = "收到，下班前准时提交。";
    } else {
      gentle = "好的，感谢您的指导，我会按照这个方向继续细化，有进展随时向您汇报。";
      high_eq = "非常赞同您的思路，这帮我们规避了很多潜在风险。我在此基础上再补充一份执行细节，稍后呈报。";
      concise = "好的，收到，谢谢指正。";
    }
  } else if (matched === "吵架缓和") {
    if (text.includes("都是我的错") || text.includes("行了吧")) {
      gentle = "我不是想争个对错，只是因为我很在乎你，希望我们能把心里的话说清楚，你别生气了好吗？";
      high_eq = "好啦，我们都少说一句。既然错都归你了，那待会罚你请我吃冰淇淋，我们就算扯平啦，好不好？";
      concise = "我没有怪你的意思，我们都冷静一下。";
    } else if (text.includes("随你便") || text.includes("不想说")) {
      gentle = "我知道你现在心里不舒服，那我先给你一点安静的空间。等你心情好一点了，我们再聊。";
      high_eq = "感觉我们现在的沟通有点像打太极。那你先歇歇气，我把你想听的甜言蜜语准备好，随时等你理我。";
      concise = "好，那等你冷静下来，我们再沟通。";
    } else {
      gentle = "看到你难受，我也很不好受。我们深呼吸，一起找找问题的解决办法，好吗？";
      high_eq = "我知道这件事情让你很不愉快，这也是我没处理好的地方。我们是最好的队友，可不能内讧呀。";
      concise = "抱歉，这不是我的本意，我们好好谈。";
    }
  } else if (matched === "表表" || matched === "表白") {
    if (text.includes("喜欢")) {
      gentle = "其实……听到你这么说，我心里小鹿一直在乱撞。我也觉得，有你在身边的时间特别温柔。";
      high_eq = "好巧啊，我刚才也正在心里偷偷对你说了同一句话。原来这就是心有灵犀的感觉。";
      concise = "其实我也喜欢你很久了。";
    } else if (text.includes("合适吗") || text.includes("喜欢什么样的人")) {
      gentle = "我觉得两个人合不合适，在于愿不愿意一起走下去。而你，就是那个让我想要一起努力的人。";
      high_eq = "我以前对另一半有很多设定，直到遇见你，我发现你就是那个打破我所有设定、又让我完全心动的标杆。";
      concise = "我觉得我们挺合适的，你觉得呢？";
    } else {
      gentle = "谢谢你带给我这么多美好的瞬间。和你在一起，我觉得自己变得更好了。";
      high_eq = "和你相处的每一秒，都像是生活特意给我的彩蛋。我想一直拥有这个特权。";
      concise = "我也一样，希望以后能有更多时间一起度过。";
    }
  } else if (matched === "安慰") {
    if (text.includes("压力") || text.includes("想哭") || text.includes("累")) {
      gentle = "抱抱你，这段时间你真的太不容易了。想哭就哭出来吧，有我陪着你，肩膀随时借给你。";
      high_eq = "生活有时确实不讲道理，但别忘了你已经做得很棒了。今晚关掉电脑，我带你去吃最治愈的甜点，把压力都融化掉。";
      concise = "别硬撑，有我在，随时可以跟我倾诉。";
    } else if (text.includes("差劲") || text.includes("考砸")) {
      gentle = "一次的挫折说明不了什么的。在我眼里，你一直是一个特别努力、有闪光点的人，不要轻易否定自己。";
      high_eq = "这只是漫长跑道上的一个减速带而已，说明你需要稍微缓步呼吸。你的实力摆在那呢，这次失误不代表你的全部。";
      concise = "没关系，这只是一次检验，下次一定可以。";
    } else {
      gentle = "没事的，一切都会好起来的。不管发生什么，我都会在你身后支持你。";
      high_eq = "阴天总会过去，太阳虽然偶尔请假，但不会缺席。现在就放松心情，我们好好睡一觉，明天又是新的一天。";
      concise = "别太担心，事情会解决的。";
    }
  } else if (matched === "尴尬解围") {
    if (text.includes("胖") || text.includes("身材")) {
      gentle = "哈哈，最近生活过得比较滋润嘛，说明我幸福指数高呀。不过健康快乐最重要啦。";
      high_eq = "这不叫胖，这叫对生活的热爱溢出来了！而且我这叫圆满，多讨喜呀。";
      concise = "确实最近吃得有点好，正在健康运动中。";
    } else if (text.includes("结婚") || text.includes("对象")) {
      gentle = "谢谢关心呀，我也在期待那个能和我一起分享生活的人出现，一切都顺其自然。";
      high_eq = "哈哈，我正在精心挑选呢，毕竟像我这么优秀的人，肯定得找个旗鼓相当的，不能委屈了对方呀！";
      concise = "目前以工作和提升自己为主，有消息一定通知您。";
    } else {
      gentle = "哈哈，刚才那个气氛确实有点奇妙，不过没关系，大家说开了就好。";
      high_eq = "刚才这一下可把我幽默细胞都激发出来了。来，让我们把这一页翻过去，说说开心事。";
      concise = "没关系，只是个误会，不用在意。";
    }
  } else if (matched === "客户沟通") {
    if (text.includes("贵") || text.includes("便宜")) {
      gentle = "我非常理解您对预算的考虑。我们的价格确实反映了产品的高品质和售后保障，我们可以为您提供定制的优惠套餐。";
      high_eq = "感谢您的坦诚。好产品的成本确实比较高，但它能帮您省去后续许多维护的时间与成本。我可以帮您向总公司申请一份增值服务作为补偿。";
      concise = "感谢反馈，我们有针对新客户的阶梯优惠，稍后发送给您参考。";
    } else if (text.includes("退款") || text.includes("发货")) {
      gentle = "非常抱歉给您带来了不便。我已经催促仓库优先发出，并为您申请了加急派送。如果您需要退款，我们全力配合。";
      high_eq = "让您久等了，实在抱歉！由于近期爆单仓库有些拥堵，我已经亲自去帮您跟进。为了表达歉意，我给您附赠了一份实用小礼品。";
      concise = "抱歉延误，已为您加急处理派送，单号稍后同步。";
    } else {
      gentle = "感谢您的反馈，您的意见对我们非常重要。我们会认真评估并进行针对性改进。";
      high_eq = "非常感谢您中肯的建议，您指出的正是我们下一步要优化的核心。我会拉上技术团队为您专门做一次调整。";
      concise = "收到，已将您的建议提交相关部门进行改进，谢谢支持。";
    }
  }

  return {
    matched_scenario: matched,
    gentle,
    high_eq,
    concise,
    isDemo: true
  };
}
