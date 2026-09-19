export const COMMIT = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const source = path => `https://github.com/deepseek-ai/deepseek-harness/blob/${COMMIT}/${path}`;
export const question = '这个项目的入口在哪里？请解释一次请求的处理流程。';
export const answer = '一次请求从 Web UI 进入 SessionController，由 AgentLoop 领取输入。\n\nSystemPrompt 组装提示与工具定义，Session 提供可重建的历史。LlmRuntime 通过 DeepSeek Adapter 调用模型。\n\n如果模型请求读取文件，ToolRuntime 先执行策略检查，再调用工具。结果写入会话，并进入下一次模型请求。\n\n最终，回答通过实时事件回到界面。Cordis 负责把这些可替换的插件连接起来。';
export const chapters = [
  {at:0, title:'提出问题', en:'THE INTERFACE', headline:'一切，从一个问题开始。', description:'在工作台提出问题。接下来，把这个熟悉的界面侧转，看看一次请求背后究竟发生了什么。', selected:'ui'},
  {at:.14, title:'进入系统', en:'BEYOND THE SURFACE', headline:'界面，只是入口。', description:'工作台折叠成一条横线。它保留为界面的入口，画面随后切入运行时环境，请求从这条线向下进入会话控制器。', selected:'gateway'},
  {at:.29, title:'展开架构', en:'EVERYTHING IS A PLUGIN', headline:'每一种能力，都有出处。', description:'中间是请求主线，两侧是上下文、会话与工具。节点直接显示职责，箭头标明调用与消息；需要时点开源码说明。', selected:'loop'},
  {at:.49, title:'工具往返', en:'THE AGENT LOOP', headline:'会调用工具，才走得更远。', description:'模型提出工具请求，运行时检查并执行，再将结果送回模型。一次 turn 可以包含多个 step。', selected:'tools'},
  {at:.68, title:'答案回流', en:'FROM MODEL TO MESSAGE', headline:'信息，开始向上流动。', description:'淡蓝粒子代表响应流，经适配器和运行时返回界面。0 / 1 是视觉隐喻，模型服务内部不在此拆解。', selected:'model'},
  {at:.86, title:'回到面板', en:'BACK TO THE WORKSPACE', headline:'复杂留在背后，答案回到眼前。', description:'面板恢复正面，回答逐段出现。这是可回放的教学演示；真实系统可以边生成边显示。', selected:'ui'},
];
export const modules = [
  {id:'ui', n:'01', name:'工作台', en:'Web UI', pkg:'client / Web application', description:'接收你的问题，呈现工具执行状态和回答。界面通过 Host 的会话控制与实时订阅工作，不直接读取模型内部。', event:'prompt → follow', path:'packages/api/session-controller/README.md', detail:'这里的工作台为教学重绘，保留产品职责，不是官方 UI 的逐像素复刻。'},
  {id:'gateway', n:'02', name:'会话入口', en:'SessionController', pkg:'api/session-controller', description:'管理会话、接收 prompt、提供历史和实时 follow。普通 Web 的单次调用走 HTTP POST，流式事件通过 Gateway 的 WebSocket mux 传输。', event:'RPC / live follow', path:'packages/api/session-controller/README.md', detail:'Desktop 有自己的承载连接方式，不能把浏览器传输方式套用到所有客户端。'},
  {id:'loop', n:'03', name:'执行循环', en:'AgentLoop', pkg:'core/agent-loop', description:'领取输入、开启 turn，按 step 组装请求、调用模型、处理工具结果。需要继续时再次请求模型，直到完成或停止。', event:'pre-step → request → step/end', path:'packages/core/agent-loop/src/agent.ts#L241-L321', detail:'循环本身也是 Cordis 插件，可以被其他 Agent 实现替换。'},
  {id:'context', n:'04', name:'提示与上下文', en:'SystemPrompt', pkg:'core/system-prompt', description:'按当前作用域组装提示片段、运行上下文和可见工具 schema。它是 AgentLoop 使用的能力，不是一道独立的远程服务器。', event:'systemPrompt.assemble()', path:'packages/core/agent-loop/src/agent.ts#L241-L255', detail:'Agent preset 决定 session 的能力组合；profile 决定应用启动组合，两者不同。'},
  {id:'session', n:'05', name:'会话记录', en:'Session', pkg:'core/session', description:'以 append-only 事件日志记录事实，再投影出模型历史和界面状态。工具结果、用户消息与最终回答都能从记录中重建。', event:'session.append() / deriveMessages()', path:'packages/core/session/README.md', detail:'日志不是全部发给模型。生命周期、遥测等事件和模型可见消息有明确区别。'},
  {id:'tools', n:'06', name:'工具运行时', en:'ToolRuntime', pkg:'core/tools', description:'接收模型的工具调用，经过策略和守卫检查，再调度文件、Shell 或搜索工具。结果写入会话，供下一步模型调用使用。', event:'pre-execute → execute → post-execute', path:'packages/core/tools/src/index.ts#L1461-L1490', detail:'工具可能被策略拦截。模型提出调用请求，不代表它可以直接任意执行。'},
  {id:'llm', n:'07', name:'模型适配', en:'LlmRuntime', pkg:'llm/llm + llm/llm-deepseek', description:'prepareCall 绑定模型适配器，处理请求配置并接收响应流。DeepSeek 的官方 provider 路由注册为 deepseek-official。', event:'prepareCall() → stream()', path:'packages/llm/llm-deepseek/src/index.ts#L53-L133', detail:'Harness 支持可替换模型适配器；这里选择 DeepSeek 这条路径，不固定未核实的默认模型型号。'},
  {id:'model', n:'08', name:'模型服务', en:'DeepSeek Model', pkg:'external model service', description:'根据输入生成回复或工具调用请求。它通过模型 API 与 Harness 交互；流程图将它标为外部服务。', event:'request → streamed response', path:'packages/llm/llm-deepseek/README.md', detail:'这里不展示或声称还原 DeepSeek 神经网络内部结构。二进制粒子是数据流的视觉表达。'},
  {id:'cordis', n:'00', name:'插件底座', en:'Cordis', pkg:'Cordis Context / services / events', description:'管理插件加载、依赖、服务、事件与可撤销的注册。会话、工具、模型适配和 Agent 循环都通过它组合起来。', event:'plugin → service / event → dispose', path:'docs/architecture.md#L9-L27', detail:'这是贯穿系统的组织方式，不是用户消息每次必须经过的一道串行处理层。'},
];
export const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth = (p,a,b)=>{ const t=clamp((p-a)/(b-a)); return t*t*(3-2*t); };
export function sample(progress) {
  const p=clamp(Number.isFinite(progress)?progress:0);
  const open=smooth(p,.14,.29)*(1-smooth(p,.84,.94));
  return {p,open, reveal:smooth(p,.27,.47)*(1-smooth(p,.83,.91)), sent:smooth(p,.025,.105), response:clamp((p-.94)/.06), returnFlow:smooth(p,.66,.70)*(1-smooth(p,.81,.855)), chapter:chapters.reduce((n,c,i)=>p>=c.at?i:n,0)};
}
