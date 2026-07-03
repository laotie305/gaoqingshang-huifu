import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "场景名称不能为空" }, { status: 400 });
    }

    const apiKey = process.env.AGNES_API_KEY || "";

    // Fallback/Simulated responses if API is offline or not configured
    const simulatedPresets = getSimulatedPresets(name, description || "");

    if (!apiKey) {
      return NextResponse.json({
        presets: simulatedPresets,
        isDemo: true
      });
    }

    const systemPrompt = `你是一个高情商沟通专家。现在用户创建了一个自定义社交/回话场景，名称是："${name}"，说明是："${description || "无"} "。
请根据该场景，智能生成 3 到 4 个在聊天、人际沟通中，对方可能会发给用户的、非常具有沟通挑战性、或者极其常见典型的“对方原话”快捷话术。
这些快捷话术应当极其贴合该场景，让用户可以直接点击用来进行高情商回复生成测试。
注意：生成的应该是【对方发给我的话】，语气要符合场景（可能带有些许挑衅、尴尬、催促、或者普通的提问）。

你必须严格以 JSON 格式输出，不要包含任何 Markdown 代码块（如 \`\`\`json 和 \`\`\`）、任何多余的解释说明性文字。
输出的 JSON 结构必须如下，字段名必须完全一致且为英文：
{
  "presets": [
    "对方的原话1",
    "对方的原话2",
    "对方的原话3",
    "对方的原话4"
  ]
}`;

    const userPrompt = `场景名称："${name}"
场景描述："${description || "无说明"}"
请生成3-4条最适合该场景的典型快捷话术。`;

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
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agnes AI presets generation error:", errorText);
      return NextResponse.json({
        presets: simulatedPresets,
        isDemo: true
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.presets)) {
        return NextResponse.json({
          presets: parsed.presets,
          isDemo: false
        });
      }
      throw new Error("Invalid output structure");
    } catch (parseError) {
      console.error("Failed to parse API presets response:", content, parseError);
      return NextResponse.json({
        presets: simulatedPresets,
        isDemo: true
      });
    }

  } catch (error: any) {
    console.error("Preset API handler error:", error);
    return NextResponse.json({ error: error.message || "服务器内部错误" }, { status: 500 });
  }
}

function getSimulatedPresets(name: string, desc: string): string[] {
  const query = (name + " " + desc).toLowerCase();

  if (query.includes("相亲") || query.includes("催婚") || query.includes("恋爱") || query.includes("结婚") || query.includes("对象")) {
    return [
      "你多大了？买房买车了吗？平时喜欢干嘛？",
      "感觉你性格挺好的，但平时是不是太忙了，有时间顾家吗？",
      "我们接触也有两周了，你觉得我们合适继续发展下去吗？",
      "我家里人催我催得紧，你是怎么看待闪婚或者尽早定下来的？"
    ];
  }

  if (query.includes("面试") || query.includes("职场") || query.includes("工作") || query.includes("老板") || query.includes("离职")) {
    return [
      "你为什么会选择从上一家公司离职呢？",
      "你期望的薪资是多少？如果和我们能给的有差距，你接受吗？",
      "我们这个岗位可能偶尔需要配合项目的紧急进度加班，你个人怎么看？",
      "其实我觉得你之前的经验跟我们这个岗位不是100%匹配，你觉得你的核心优势在哪？"
    ];
  }

  if (query.includes("客户") || query.includes("沟通") || query.includes("价格") || query.includes("售后") || query.includes("产品")) {
    return [
      "别的商家跟我报价比你们低不少，你们这价格太贵了吧，能便宜点不？",
      "我这单都下单好几天了怎么还没发货？再不发我直接申请退款投诉了！",
      "你们的产品买回去跟描述的不太一样啊，感觉有点粗糙，能不能申请换货？",
      "如果后期使用中出了故障，你们能提供上门保修或者退换服务吗？"
    ];
  }

  if (query.includes("吵架") || query.includes("生气的") || query.includes("闹别扭") || query.includes("歉") || query.includes("分手")) {
    return [
      "你现在说这些有什么用？事情都发生了，你早干嘛去了？",
      "算了，随你便吧，我真的懒得跟你争了，挂了。",
      "行行行，都是我的错好吧，这样你满意了吗？",
      "我不是因为这件事生气，我是对你对待这件事的态度感到失望。"
    ];
  }

  if (query.includes("借钱") || query.includes("金钱") || query.includes("还钱") || query.includes("财务")) {
    return [
      "最近手头有点紧，能不能先借我五千周转一下？下个月发工资一定还你！",
      "之前问你借的那点钱，可能要再宽限我几天，实在不好意思哈。",
      "看你最近买新车了，手头肯定宽裕，怎么大家老朋友了连这点小忙都不肯帮？",
      "这次投资项目真的稳赚，要不要一起投点？错过了可就没有下次了。"
    ];
  }

  // General fallback tailored to the name
  return [
    `关于“${name}”，你是怎么看待我们目前的沟通状态的？`,
    `其实刚才聊到“${name}”，我心里觉得有点不自在，你是不是对我有看法？`,
    `你能跟我详细说说你对“${name}”这个事情的规划或者真实想法吗？`,
    `行了行了，在这件事（${name}）上大家各退一步，就当没发生过吧。`
  ];
}
