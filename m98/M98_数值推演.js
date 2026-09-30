/* 《代号M98》原型 v0.8 · 数值回归验证（直接读取原型脚本运行）
 * 1) 路线断言：每关"应过 / 应败"的配装（含"破盾芯片才过 1-2""破甲让护盾流失效"等设计意图）
 * 2) 推进路径：从开局逐关记账（改装件 / 躯体材料 / 槽位是否够用），验证真实可走通
 * 3) 部位重置：返还材料后总账应回到初始值
 * 4) 结算口径：伤害流向 / 承伤来源的分项之和必须与总量吻合
 * 5) 结构自检：槽位、经济、章节考点
 */
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "M98_原型.html"), "utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fake = () => ({textContent:"", innerHTML:"", style:{}, dataset:{}, className:"",
  classList:{contains:()=>false}, appendChild(){}, addEventListener(){}, remove(){},
  offsetHeight:0, clientWidth:660, closest:()=>null, querySelector:()=>null});
const doc = {getElementById:()=>fake(), createElement:()=>fake(), addEventListener(){},
  querySelector:()=>null, body:{appendChild(){}}};
let api;
try { api = new Function("document","ResizeObserver",
  code + "\n;return {simulateCfg, LEVELS, LEVEL_ORDER, PASSIVES, CHIP_ORDER, ACTIVES, ACT_UP_COST," +
         " ACT_MAX, PAS_MAX, DROPS, DROP_OVERRIDE, dropOf, hasDrop, PRICE, CAP0, PARTS, initialState, partRefund, confirmPending," +
         " chOpen, setState:s=>{state=s}};")(doc, undefined); }
catch(e){ console.log("✗ 原型脚本运行失败：", e.stack.split("\n").slice(0,3).join(" | ")); process.exit(1); }
const {simulateCfg, LEVELS, LEVEL_ORDER, PASSIVES, CHIP_ORDER, ACT_UP_COST,
       DROPS, DROP_OVERRIDE, dropOf, hasDrop, PRICE, CAP0, PARTS, initialState} = api;

const C = (punch, brace, chips) => ({punch, brace, chips});
const nm = c => [c.punch>1?"重拳"+c.punch:"", c.brace>1?"硬抗"+c.brace:"",
  ...Object.entries(c.chips).map(([i,l])=>PASSIVES[i].name+(l>1?"²":""))].filter(Boolean).join("+") || "默认";

/* ---------- 1. 路线断言 ----------
 * 候选配装都限制在"当时真实能开的槽位数"内：
 * 手臂 1 格（初始开放）/ 躯干 1 格 / 头脑 2 格；躯体材料只从精英关产出（每关 2 个） */
const ROWS = {
 "1-1":[[C(1,1,{}),1,"默认（此时还没有养成板块）"]],
 "1-2":[[C(1,1,{}),0,"默认"],[C(2,1,{}),0,"只强化重拳"],
        [C(1,1,{breaker:1}),1,"对症：破阵（破盾）"]],
 "1-E":[[C(1,1,{breaker:1}),0,"破阵 Lv.1"],[C(2,1,{}),0,"重拳 Lv.2"],[C(3,1,{}),0,"重拳 Lv.3"],
        [C(1,1,{breaker:2}),1,"对症：破阵²"],[C(2,1,{breaker:1}),1,"数值：重拳2+破阵"]],
 "2-1":[[C(1,1,{breaker:2}),0,"只带破阵²"],[C(1,1,{breaker:2,damper:1}),0,"破甲让缓冲失效"],
        [C(1,2,{breaker:2}),0,"硬抗2 对破甲无效"],[C(2,1,{breaker:2}),0,"重拳2"],
        [C(1,1,{breaker:2,regen:1}),1,"对症：生体再生"]],
 "2-2":[[C(1,1,{breaker:2,regen:1}),0,"再生 Lv.1 不够"],[C(1,1,{breaker:2,damper:2}),0,"缓冲² 仍无效"],
        [C(2,1,{breaker:2}),0,"纯堆伤害"],
        [C(1,1,{breaker:2,regen:2}),1,"对症：再生²"],[C(1,1,{breaker:2,thorn:1}),1,"对症：反应装甲克多段"]],
 "2-E":[[C(1,1,{breaker:2,regen:1}),0,"再生 Lv.1 不够"],[C(1,1,{breaker:2,thorn:2}),0,"反应² 顶不住重击"],
        [C(1,1,{breaker:2,regen:2}),1,"对症：再生²"],[C(2,1,{breaker:2,regen:2}),1,"再生²+重拳2"]],
 "3-1":[[C(1,1,{breaker:2,regen:2}),0,"第二章配装"],[C(1,1,{breaker:2,regen:2,focus:2}),0,"凝神² 也不行"],
        [C(2,1,{breaker:2,regen:2}),0,"重拳2（纯数值）"],
        [C(1,1,{breaker:2,regen:2,filter:1}),1,"对症：滤波"]],
 "3-2":[[C(1,1,{breaker:2,regen:2,filter:1}),0,"只带滤波"],[C(1,2,{breaker:2,regen:2,filter:1}),0,"硬抗2 半成品"],
        [C(1,1,{breaker:2,regen:2,filter:1,damper:1}),1,"对症：滤波+缓冲"]],
 "3-E":[[C(1,1,{breaker:2,regen:2,filter:1}),0,"缺缓冲"],[C(1,1,{breaker:2,regen:2,damper:1}),0,"缺滤波"],
        [C(1,1,{breaker:2,regen:2,filter:1,damper:1}),1,"对症：滤波+缓冲"],
        [C(1,1,{breaker:2,regen:2,filter:2,damper:2}),1,"滤波²+缓冲²"]]
};

let fails = 0;
console.log("■ 路线断言");
for (const k of LEVEL_ORDER){
  const L = LEVELS[k];
  console.log(`\n—— ${k} ${L.name}${L.elite?"【精英】":""}  HP ${L.hp}${L.shield?` 护盾 ${L.shield}/回合`:""} ——`);
  for (const [cfg, want, label] of ROWS[k]){
    const r = simulateCfg(k, cfg), ok = (r.win?1:0) === want;
    if (!ok) fails++;
    console.log(`${ok?"  ":"✗ "}${(want?"[应过]":"[应败]")} ${label.padEnd(20,"　")} ${(r.win?"WIN ":r.dead?"LOSE":"TIME")} R${String(r.round).padStart(2)} 剩HP${String(r.hpLeft).padStart(4)} 敌剩${String(r.enemyHpLeft).padStart(4)}   ${nm(cfg)}`);
  }
}

/* ---------- 2. 推进路径：逐关记账 ---------- */
function runPath(name, steps){
  const s0 = initialState();
  let mod = s0.res.mod, body = s0.res.body, ok = true;
  const cfg = {punch:1, brace:1, chips:{}}, cap = {...CAP0};
  console.log(`\n—— ${name} ——`);
  for (const [key, acts] of steps){
    for (const a of acts){
      const [op, x] = a.split(":");
      if (op==="unlock") mod -= PASSIVES[x].price;
      if (op==="equip") cfg.chips[x] = cfg.chips[x] || 1;
      if (op==="unequip") delete cfg.chips[x];
      if (op==="up"){ mod -= PRICE.upgradePas; cfg.chips[x] = 2; }
      if (op==="slot"){ body -= PRICE.costUp; cap[x]++; }
      if (op==="act"){ mod -= ACT_UP_COST[cfg[x]-1]; cfg[x]++; }
    }
    const used = {arm:0, torso:0, head:0};
    for (const id in cfg.chips) used[PASSIVES[id].part]++;
    const over = Object.keys(used).filter(p=>used[p] > cap[p]);
    const broke = mod < 0 || body < 0 || over.length;
    const r = simulateCfg(key, cfg);
    const bad = broke || !r.win;
    if (bad) ok = false;
    const note = [mod<0?"改装件超支":"", body<0?"躯体材料超支":"", over.length?over.join("/")+" 槽位不足":""].filter(Boolean).join(" ");
    console.log(`${bad?"✗ ":"  "}${key} ${r.win?"WIN ":"LOSE"} R${String(r.round).padStart(2)} 剩HP${String(r.hpLeft).padStart(4)}  余 改${mod} 躯${body}  槽 手${cap.arm}/躯${cap.torso}/头${cap.head}${note?"  ⚠"+note:""}   ${acts.join(" ")||"—"}`);
    if (r.win){ const d = dropOf(key); mod += d.mod; body += d.body; }
  }
  if (!ok) fails++;
}
console.log("\n■ 推进路径（开局 改3 躯0；普通首通 +1改；1-E +3改+2躯；2-E +3改+1躯；3-E 无奖励；无重复奖励）");
const TAIL = [["3-1",["unlock:filter","slot:head","equip:filter"]],
              ["3-2",["unlock:damper","slot:head","equip:damper"]], ["3-E",[]]];
runPath("路径A：破阵 → 生体再生 → 滤波 + 缓冲", [
  ["1-1",[]],
  ["1-2",["unlock:breaker","equip:breaker"]],
  ["1-E",["up:breaker"]],
  ["2-1",["unlock:regen","slot:torso","equip:regen"]],
  ["2-2",["up:regen"]],
  ["2-E",[]], ...TAIL]);
runPath("路径B：2-2 换反应装甲，2-E 再换回再生", [
  ["1-1",[]],
  ["1-2",["unlock:breaker","equip:breaker"]],
  ["1-E",["up:breaker"]],
  ["2-1",["unlock:regen","slot:torso","equip:regen"]],
  ["2-2",["unlock:thorn","unequip:regen","equip:thorn"]],
  ["2-E",["unequip:thorn","equip:regen","up:regen"]], ...TAIL]);

/* ---------- 3. 部位重置：返还后总账应回到初始 ---------- */
console.log("\n■ 部位重置返还（直接调用原型的 partRefund / confirmPending）");
{
  const {partRefund, confirmPending, setState} = api;
  const s = initialState(); setState(s);
  const spentMod = PASSIVES.breaker.price + PRICE.upgradePas + ACT_UP_COST[0] + ACT_UP_COST[1];
  s.res.mod = 20 - spentMod; s.res.body = 5;
  s.pasUnlocked.breaker = true; s.pasLv.breaker = 2;
  s.act.punch = 3; s.parts.arm.chips = [{id:"breaker"}];
  const rf = partRefund("arm");
  const ok1 = rf.mod === spentMod && rf.body === 0;
  console.log(`${ok1?"  ":"✗ "}手臂投入 改${spentMod} → partRefund 计得 改${rf.mod} 躯${rf.body}（手臂无扩槽）`);
  if (!ok1) fails++;
  s.pending = {kind:"reset", id:"arm"}; confirmPending();
  const ok2 = s.res.mod === 20 && s.res.body === 5 && s.act.punch === 1
              && s.pasUnlocked.breaker === false && s.pasLv.breaker === 1 && s.parts.arm.chips.length === 0;
  console.log(`${ok2?"  ":"✗ "}重置后：改${s.res.mod}/20 躯${s.res.body}/5、重拳Lv.${s.act.punch}、破阵已上锁、装备清空`);
  if (!ok2) fails++;
  /* 头脑：两张芯片 + 两次扩槽独立结算 */
  s.res.mod = 9; s.res.body = 4;
  s.pasUnlocked.filter = true; s.pasUnlocked.damper = true; s.pasLv.filter = 2;
  s.parts.head.bonus = 2; s.parts.head.chips = [{id:"filter"},{id:"damper"}];
  const rf2 = partRefund("head");
  const want2 = PASSIVES.filter.price + PASSIVES.damper.price + PRICE.upgradePas;
  const ok3 = rf2.mod === want2 && rf2.body === 2 * PRICE.costUp;
  console.log(`${ok3?"  ":"✗ "}头脑独立结算：返还 改${rf2.mod}（应 ${want2}） 躯${rf2.body}（应 2）`);
  if (!ok3) fails++;
  const armUntouched = s.parts.arm.chips.length === 0 && s.act.punch === 1;
  console.log(`${armUntouched?"  ":"✗ "}重置头脑不影响其它部位`);
  if (!armUntouched) fails++;
  setState(initialState());
}

/* ---------- 4. 结算口径：分项之和必须吻合 ---------- */
console.log("\n■ 结算口径");
{
  const cases = [["2-2", C(1,1,{breaker:2,damper:2})], ["3-1", C(1,1,{breaker:2,regen:2})],
                 ["1-2", C(1,1,{})], ["3-E", C(1,1,{breaker:2,regen:2,filter:1,damper:1})]];
  for (const [k, cfg] of cases){
    const r = simulateCfg(k, cfg), K = r.kpi;
    /* 输出去向：打在本体 + 被护盾吸收 应等于造成伤害总量（被干扰削减的部分从未打出） */
    const outOk = K.body + K.spentOnShield === K.total;
    /* 承伤来源：常规扣血 = 总扣血 − 破甲扣血，不能为负 */
    const inOk = K.taken - K.pierced >= 0;
    const ok = outOk && inOk;
    if (!ok) fails++;
    console.log(`${ok?"  ":"✗ "}${k} ${nm(cfg)}：本体${K.body}+破盾投入${K.spentOnShield}=造成${K.total}${outOk?"":" ✗"}；扣血${K.taken}含破甲${K.pierced}${inOk?"":" ✗"}`);
  }
}

/* ---------- 5. 结构自检 ---------- */
console.log("\n■ 结构自检");
const st0 = initialState();
const structs = [
  ["手臂 1 格 / 躯干 1 格 / 头脑 2 格", PARTS.arm.capMax===1 && PARTS.torso.capMax===1 && PARTS.head.capMax===2],
  ["初始仅手臂 1 格开放", CAP0.arm===1 && CAP0.torso===0 && CAP0.head===0],
  ["开局无躯体材料", st0.res.body===0],
  ["开局不解锁任何芯片", CHIP_ORDER.every(id=>!st0.pasUnlocked[id])],
  ["开局未装备任何芯片", ["arm","torso","head"].every(p=>st0.parts[p].chips.length===0)],
  ["芯片池为 7 张且已删除增压/预判", CHIP_ORDER.length===7 && !PASSIVES.boost && !PASSIVES.evade],
  ["破阵排在汲能之前", CHIP_ORDER.indexOf("breaker") < CHIP_ORDER.indexOf("leech")],
  ["缓冲模块归入头脑", PASSIVES.damper.part==="head"],
  ["破阵模块解锁价为 1", PASSIVES.breaker.price===1],
  ["普通关不产出躯体材料", DROPS.normal.body===0],
  ["1-E 产出 2 躯体材料", dropOf("1-E").body===2],
  ["2-E 只产出 1 躯体材料", dropOf("2-E").body===1 && dropOf("2-E").mod===3],
  ["3-E 不设任何奖励", !hasDrop("3-E") && dropOf("3-E").mod===0 && dropOf("3-E").body===0],
  ["全程躯体材料总量恰好等于待开槽位数",
    LEVEL_ORDER.reduce((a,k)=>a+dropOf(k).body,0) === (PARTS.torso.capMax-CAP0.torso)+(PARTS.head.capMax-CAP0.head)],
  ["第一章精英与第二章普通关均带护盾",
    !!LEVELS["1-E"].shield && !!LEVELS["2-1"].shield && !!LEVELS["2-2"].shield],
  ["第二章敌人具备破甲", ["2-1","2-2","2-E"].every(k=>LEVELS[k].pattern.some(p=>p.pierce))],
  ["第三章敌人以减益为主", ["3-1","3-2","3-E"].every(k=>LEVELS[k].pattern.some(p=>p.jam))],
  ["开局仅第一章开放", api.chOpen(1) && !api.chOpen(2) && !api.chOpen(3)]
];
for (const [label, ok] of structs){ if (!ok) fails++; console.log(`${ok?"  ":"✗ "}${label}`); }

console.log("\n" + (fails ? `✗ ${fails} 项与预期不符` : "✓ 全部符合预期"));
process.exit(fails ? 1 : 0);
