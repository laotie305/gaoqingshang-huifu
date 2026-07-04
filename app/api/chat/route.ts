import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      history, 
      selectedScenario, 
      customScenarios,
      background,
      partnerRoleType,
      partnerRoleName,
      myRoleName
    } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "原话内容不能为空" }, { status: 400 });
    }

    const apiKey = process.env.AGNES_API_KEY || "";

    // If API key is not configured, run in "Demo Mode" with highly realistic simulated responses.
    if (!apiKey) {
      return NextResponse.json(generateSimulatedResponse(
        message, 
        selectedScenario, 
        history, 
        background, 
        partnerRoleType, 
        partnerRoleName, 
        myRoleName
      ));
    }

    const systemPrompt = `你是一个拥有极高情商、洞察人心且擅长人际沟通的【高情商回话助手】。
你的任务是根据用户输入的“对方原话”、对话背景描述、双方的角色身份、对话历史上下文以及选定的场景，匹配最合适的场景并生成 3 种不同风格的回复：
1. 【温和 (gentle)】：字里行间充满理解、同理心、温柔与善意，适合拉近距离、缓和气氛或给予情绪价值。
2. 【高情商 (high_eq)】：幽默、睿智、得体，能化解尴尬、提升好感、展现格局或巧妙化解矛盾冲突。
3. 【简洁 (concise)】：言简意赅，礼貌、大方且高效，不拖泥带水。

请结合对话双方的角色和对话背景：
- “对方的角色/具体身份” 能够反映对话者的立场、辈分、心理预期等，请确保生成的回复完美契合该身份，比如对领导要尊重得体又不失主动，对长辈要温顺尊重又不被拿捏，对恋人要温柔体贴，对朋友要风趣幽默，对客户要专业公关。
- “对话背景描述” 决定了对话发生的具体情境与潜台词。请仔细分析其暗含的情绪和博弈，使生成的回复有极强的针对性，能切实解决该场景下的沟通困境。

你必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块（如 \`\`\`json 和 \`\`\`）、任何多余的解释说明性文字。
输出的 JSON 结构必须如下，字段名必须完全一致且为英文：
{
  "matched_scenario": "匹配到的场景名称",
  "gentle": "温和风格回复",
  "high_eq": "高情商风格回复",
  "concise": "简洁风格回复"
}`;

    let userPrompt = "";
    if (background && background.trim()) {
      userPrompt += `【对话背景描述】：${background.trim()}\n`;
    }
    if (partnerRoleName && partnerRoleName.trim()) {
      userPrompt += `【对方的角色/具体身份】：${partnerRoleName.trim()}${partnerRoleType ? ` (${partnerRoleType})` : ""}\n`;
    }
    if (myRoleName && myRoleName.trim()) {
      userPrompt += `【我的角色/具体身份】：${myRoleName.trim()}\n`;
    }

    if (history && history.length > 0) {
      userPrompt += `【对话历史上下文】：\n`;
      history.forEach((turn: any, idx: number) => {
        const styleText = turn.style === "gentle" ? "温和" : turn.style === "high_eq" ? "高情商" : "简洁";
        userPrompt += `[回合 ${idx + 1}]\n对方说: "${turn.partner}"\n我选择以 [${styleText}] 风格回复: "${turn.reply}"\n`;
      });
      userPrompt += `\n`;
    }
    userPrompt += `【当前对方最新发来的原话】: "${message}"\n`;
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
      return NextResponse.json(generateSimulatedResponse(
        message, 
        selectedScenario, 
        history, 
        background, 
        partnerRoleType, 
        partnerRoleName, 
        myRoleName
      ));
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
      return NextResponse.json(generateSimulatedResponse(
        message, 
        selectedScenario, 
        history, 
        background, 
        partnerRoleType, 
        partnerRoleName, 
        myRoleName
      ));
    }

  } catch (error: any) {
    console.error("API handler error:", error);
    return NextResponse.json({ error: error.message || "服务器内部错误" }, { status: 500 });
  }
}

/**
 * Generates high-quality fallback responses to guarantee flawless UX.
 */
function generateSimulatedResponse(
  message: string, 
  selectedScenario: string, 
  history: any[],
  background?: string,
  partnerRoleType?: string,
  partnerRoleName?: string,
  myRoleName?: string
) {
  const text = message.trim();
  const partner = partnerRoleName || "对方";
  const my = myRoleName || "我";
  
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

  // 2. Respond based on message keywords and roles
  let gentle = `我理解你的感受，这确实需要一些时间和耐心来面对。我们可以慢慢来。`;
  let high_eq = `生活总有一些不期而遇的起伏。听你这么说，我也深有感触，幸好还有机会让我们一起把事情变得更好。`;
  let concise = `收到，我们一起想想办法。`;

  if (partnerRoleType === "colleague" || matched === "职场" || partner.includes("领导") || partner.includes("老板") || partner.includes("同事")) {
    const pTitle = partnerRoleName || "领导";
    if (text.includes("加班")) {
      gentle = `好的，没问题。为了项目的进度，我今天会把这部分内容跟进好。${pTitle}您也别太辛苦了。`;
      high_eq = `收到！为了咱们项目的顺利推进，我全力以赴。不过${pTitle}，等项目圆满结束后，能申请给大家调休补个觉吗？`;
      concise = `收到，保证按时保质完成任务。`;
    } else if (text.includes("下班前必须交")) {
      gentle = `好的，我明白这个任务非常紧急。我这就优先处理，争取下班前把初稿同步给您。`;
      high_eq = `收到您的催促，我立刻拉满生产力！不过为了保证核心数据不出错，我会在完成第一时间向您确认。`;
      concise = `收到，下班前准时提交。`;
    } else {
      gentle = `好的，收到。这部分工作我会全力跟进，后续进展我会第一时间向${pTitle}汇报。`;
      high_eq = `您指出的这点非常关键，我正好也在思考如何优化这部分的流程。谢谢${pTitle}的提醒，我这就去办。`;
      concise = `收到，已在处理中。`;
    }
  } else if (partnerRoleType === "relative" || matched === "尴尬解围" || partner.includes("妈") || partner.includes("爸") || partner.includes("姨") || partner.includes("叔") || partner.includes("亲戚")) {
    const pTitle = partnerRoleName || "长辈";
    if (text.includes("结婚") || text.includes("对象") || text.includes("大龄")) {
      gentle = `${pTitle}，我知道您是真心关心我。不过感情这事急不来，等有好消息我一定会第一个告诉您的，您别太操心啦。`;
      high_eq = `哈哈，${pTitle}您眼光真好，每次跟您聊天我都觉得特别温暖。我也在精心挑选呢，毕竟像我这么优秀的人，肯定得找个旗鼓相当的，不能丢了您的脸！`;
      concise = `谢谢关心，目前正在以工作和提升自己为主，有消息一定通知您。`;
    } else if (text.includes("胖") || text.includes("脸圆")) {
      gentle = `哈哈，最近过得比较舒心，胃口也好了。谢谢${pTitle}关心，我会注意合理饮食和锻炼的。`;
      high_eq = `这不叫胖，这叫生活的热爱溢出来了！圆圆满满，多讨喜、多招财呀，您说是不是？`;
      concise = `确实最近吃得好，已经在进行健康管理了。`;
    } else {
      gentle = `谢谢${pTitle}的提醒，我会把您的话记在心里的，出门在外也会照顾好自己。`;
      high_eq = `哈哈，听君一席话，胜读十年书！您的经验之谈对我太有启发了，下次得多跟您讨教。`;
      concise = `收到，谢谢您的指点，我会注意的。`;
    }
  } else if (partnerRoleType === "partner" || matched === "吵架缓和" || matched === "表白" || partner.includes("宝贝") || partner.includes("老婆") || partner.includes("老公") || partner.includes("亲爱的")) {
    const pTitle = partnerRoleName || "亲爱的";
    if (text.includes("分手") || text.includes("随便你") || text.includes("不合适") || text.includes("不想说")) {
      gentle = `${pTitle}，看到你难过，我也觉得很难受。我不是想和你争个高低对错，我只是在乎你、在乎我们的关系，我们先冷静几分钟，等会抱抱你好吗？`;
      high_eq = `好啦，既然错都归我，那待会罚我请你吃最喜欢的大餐，我们算扯平了。我们两个是全世界最默契的队友，可不能闹内讧呀。`;
      concise = `我没有怪你的意思，我们都冷静一下，稍后再好好谈谈。`;
    } else if (text.includes("喜欢") || text.includes("心动")) {
      gentle = `其实……听到你这么说，我心里小鹿一直在乱撞。我也觉得，有你在身边的时间特别温柔。`;
      high_eq = `好巧啊，我刚才也正在心里偷偷对你说了同一句话。原来这就是心有灵犀的感觉。`;
      concise = `其实我也喜欢你很久了。`;
    } else {
      gentle = `我知道刚才我的情绪不好，让你受委屈了，对不起。我真的很在乎你。`;
      high_eq = `好啦，别不开心了，我把你想听的甜言蜜语准备好了，随时等你理我。我带你去兜兜风散散心？`;
      concise = `抱歉，刚才是我态度不好，我们好好聊聊。`;
    }
  } else if (partnerRoleType === "customer" || matched === "客户沟通" || partner.includes("客户") || partner.includes("买家")) {
    const pTitle = partnerRoleName || "客户";
    if (text.includes("贵") || text.includes("便宜")) {
      gentle = `非常理解您对预算的考虑。我们的价格确实反映了产品的高品质和售后保障，我们可以为您提供定制的优惠套餐。`;
      high_eq = `感谢您的坦诚反馈。好产品的成本确实比较高，但它能帮您省去后续许多维护的时间与成本。我可以帮您向总公司申请一份增值服务作为补偿。`;
      concise = `感谢反馈，我们有针对新客户的阶梯优惠，稍后发送给您参考。`;
    } else if (text.includes("退款") || text.includes("发货")) {
      gentle = `非常抱歉给您带来了不便。我已经催促仓库优先发出，并为您申请了加急派送。如果您需要退款，我们全力配合。`;
      high_eq = `让您久等了，实在抱歉！由于近期爆单仓库有些拥堵，我已经亲自去帮您跟进。为了表达歉意，我给您附赠了一份实用小礼品。`;
      concise = `抱歉延误，已为您加急处理派送，单号稍后同步。`;
    } else {
      gentle = `感谢您的反馈，您的意见对我们非常重要。我们会认真评估并进行针对性改进。`;
      high_eq = `非常感谢您中肯的建议，您指出的正是我们下一步要优化的核心。我会拉上技术团队为您专门做一次调整。`;
      concise = `收到，已将您的建议提交相关部门进行改进，谢谢支持。`;
    }
  } else {
    // Default friend/general
    const pTitle = partnerRoleName || "朋友";
    if (text.includes("干嘛") || text.includes("在吗")) {
      gentle = `在想一些有趣的事呢，比如什么时候能和你聊聊天呀。${pTitle}你今天过得怎么样？`;
      high_eq = `正在接收你的脑电波召唤，这不，刚想着你，你发消息过来了，真有默契！`;
      concise = `在的，怎么啦？`;
    } else if (text.includes("好忙") || text.includes("累")) {
      gentle = `辛苦啦！忙完了记得泡杯热茶休息一下，身体最重要哦，随时可以找我吐槽。`;
      high_eq = `看来能力越强责任越大呀！不过再忙也别忘了给自己充充电，今晚要不要奖励自己吃顿好的？`;
      concise = `辛苦了，注意休息，忙完联系。`;
    } else if (text.includes("难过") || text.includes("压力") || text.includes("失败")) {
      gentle = `抱抱你，这段时间你真的太不容易了。别硬撑着，有我陪着你，随时可以找我倾诉。`;
      high_eq = `生活有时确实不讲道理，但别忘了你已经做得很棒了。今晚关掉电脑，我带你去吃最治愈的甜点，把压力都融化掉。`;
      concise = `不要想太多，一次挫折代表不了什么，一切都会好起来的。`;
    } else {
      gentle = `哈哈，听你这么说感觉很有意思。感觉${pTitle}你是一个特别热爱生活的人呢。`;
      high_eq = `哈哈，你这个视角太独特了，一句话就让我今天的心情明亮了起来。`;
      concise = `哈哈，确实是这样。`;
    }
  }

  // Prepend background custom hints
  if (background && background.trim()) {
    const bg = background.trim();
    gentle = `【结合情境：${bg}】${gentle}`;
    high_eq = `【结合情境：${bg}】${high_eq}`;
    concise = `【结合情境：${bg}】${concise}`;
  }

  return {
    matched_scenario: matched,
    gentle,
    high_eq,
    concise,
    isDemo: true
  };
}
