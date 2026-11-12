(() => {
'use strict';
const M = Model;
const clamp = M.clamp;
const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 설정 ---------- */
const MEAL_HOURS = [7.5, 12.5, 18.5];
const SPEEDS = [{ v: 0.25, t: '15분' }, { v: 1, t: '1시간' }, { v: 6, t: '6시간' }, { v: 24, t: '1일' }];
const WINDOWS = [{ k: '24h', h: 24, t: '24시간' }, { k: '7d', h: 168, t: '7일' }, { k: '28d', h: 672, t: '28일' }];
const DIETS = { normal: '일반식', egg: '달걀 많은 식사', sfa: '버터·코코넛오일', lowfat: '초저지방식' };
const NODRUG = { statin: 0, eze: false, pcsk9: false, incl: false, bemp: false, fibrate: false, wl: false };
const DRUG_NUM = { statin: '①', eze: '②', pcsk9: '③', incl: '④', bemp: '⑤', fibrate: '⑥', wl: '⑦' };

const SCEN = {
  normal: {
    group: '생리 · 식사', title: '정상 상태', phys: {}, diet: 'normal', meals: true, speed: 1, win: '7d',
    sum: '간이 만든 콜레스테롤이 VLDL → IDL → LDL로 운반되고, 간의 LDL 수용체가 다시 회수합니다. 혈중 LDL-C는 생성·유입 속도와 제거 속도가 만나는 균형점입니다.',
    steps: [
      '간이 HMG-CoA 환원효소로 콜레스테롤을 만들어 중성지방(TG)과 함께 VLDL 트럭에 싣습니다.',
      '지방·근육 모세혈관의 LPL이 TG를 내리면 VLDL은 IDL을 거쳐 LDL로 작아집니다.',
      'LDL은 간의 LDL 수용체에 붙어 회수됩니다. 간 안 콜레스테롤이 줄면 SREBP-2가 수용체와 합성을 늘리고, 늘면 줄입니다.',
      'HDL은 말초 조직과 혈관벽의 남는 콜레스테롤을 간으로 되돌립니다(역콜레스테롤 수송).',
    ],
    pattern: ['LDL-C ≈ 100', '공복 TG < 150', 'HDL-C ≈ 50'],
    point: '하루 세 끼 일반식을 먹는 상태가 이 시뮬레이터의 <b>정상 기준</b>입니다. 다른 시나리오의 ▲▼ 값은 같은 시간, 같은 식사를 한 이 기준과의 차이입니다.',
    ref: '가이드 1.1 · 2.2절',
  },
  meal: {
    group: '생리 · 식사', title: '식사 후', phys: {}, diet: 'normal', meals: true, speed: 0.25, win: '24h',
    sum: '장에서 흡수한 지방은 가장 큰 트럭인 킬로미크론에 실려 혈액으로 들어옵니다. TG는 3~4시간 뒤 정점을 찍고 몇 시간에 걸쳐 돌아옵니다.',
    steps: [
      '소장에서 흡수한 지방과 콜레스테롤이 킬로미크론에 실려 림프를 거쳐 혈액으로 들어갑니다.',
      '인슐린이 올라 LPL을 켜고 지방세포의 지방분해(HSL)는 끕니다. 그래서 식후에는 간으로 가는 유리지방산이 줄어듭니다.',
      'TG를 내린 킬로미크론 잔여물은 간이 회수합니다. 음식 콜레스테롤은 이때 간에 도착합니다.',
      '간 콜레스테롤이 늘면 SREBP-2가 약해져 자체 합성이 줄어듭니다. 그래서 음식 콜레스테롤과 LDL-C는 1:1로 움직이지 않습니다.',
    ],
    pattern: ['TG 일시 상승', 'LDL-C 거의 그대로', '간 합성 일시 ↓', '인슐린 ↑'],
    point: '식사 종류를 바꿔 보세요. 달걀처럼 <b>콜레스테롤</b>이 많은 식사보다 버터·코코넛오일처럼 <b>포화지방</b>이 많은 식사를 계속할 때 LDL-C가 더 오릅니다(속도를 1일로 올려 확인).',
    ref: '가이드 2.1 · 2.3절, 부록 B',
  },
  sfa: {
    group: '생리 · 식사', title: '포화지방 과다', phys: {}, diet: 'sfa', meals: true, speed: 6, win: '28d',
    sum: '라우르산·미리스트산·팔미트산이 많은 식사를 계속하면 간의 LDL 회수 기능이 떨어져, LDL-C가 수 주에 걸쳐 새 평형까지 오릅니다.',
    steps: [
      '포화지방이 많은 식사가 반복되면 간세포 안 콜레스테롤의 에스터화·분배가 바뀌어 조절성 유리 콜레스테롤 풀이 늘어납니다(제안된 기전 중 하나).',
      'SREBP-2 신호가 약해져 LDL 수용체 발현이 줄어듭니다.',
      'LDL 제거율이 떨어져 같은 생산량에서도 LDL이 혈중에 더 오래 머뭅니다.',
      'LDL 입자가 며칠에 걸쳐 교체되므로 새 평형까지 2~3주가 걸립니다.',
    ],
    pattern: ['LDL-C ↑', 'apoB ↑', '식후 TG 조금 더 ↑'],
    point: '스테아르산(C18:0)은 비교적 중립적입니다. 근거가 일관된 것은 <b>포화지방을 불포화지방으로 바꾸면 LDL-C가 내려간다</b>는 점입니다.',
    ref: '가이드 2.3 · 3.1절',
  },
  obesity: {
    group: '콜레스테롤 대사 이상', title: '비만·인슐린 저항성', phys: { visceral: 1, ir: 0.7, lplMod: 0.8, cetp: 1.4 }, diet: 'normal', meals: true, speed: 6, win: '28d',
    sum: '인슐린이 지방분해를 충분히 막지 못해 간으로 유리지방산이 몰리고, VLDL 생산은 늘고 TG 처리는 느려집니다.',
    steps: [
      '인슐린 신호가 약해 지방세포의 지방분해 억제가 부족해지고, 내장지방의 유리지방산이 문맥을 통해 간으로 들어갑니다.',
      '간에서 TG 합성과 de novo lipogenesis(SREBP-1c, ChREBP)가 늘어 VLDL 분비가 증가합니다.',
      'ApoC-III 증가로 LPL 기능이 떨어져 VLDL·킬로미크론의 TG 제거가 느려집니다. 생산 증가와 제거 감소가 겹칩니다.',
      'TG가 많은 VLDL과 CETP 교환, 간리파아제 작용으로 LDL은 작고 밀도가 높아지고 HDL-C는 낮아집니다.',
    ],
    pattern: ['TG ↑', 'HDL-C ↓', 'apoB ↑', 'LDL-C는 정상 근처'],
    point: 'LDL-C가 정상에 가까워도 <b>트럭 수(apoB)</b>는 늘 수 있습니다. non-HDL-C와 apoB를 함께 봅니다. 속도를 15분으로 낮추면 식후 TG가 정상보다 크게, 오래 오르는 것도 보입니다.',
    ref: '가이드 3.2절',
  },
  meno: {
    group: '콜레스테롤 대사 이상', title: '폐경', phys: { ldlrMod: 0.94, pcsk9Mod: 1.1, visceral: 0.45, ir: 0.25 }, diet: 'normal', meals: true, speed: 6, win: '28d',
    sum: '에스트로겐 감소로 간의 LDL 제거가 줄고, 지방이 내장·간 쪽으로 재분포하면서 인슐린 저항성이 조금씩 나빠집니다.',
    steps: [
      '에스트로겐이 줄면 간 LDL 수용체 발현과 PCSK9 조절이 바뀌어 LDL 제거가 떨어집니다.',
      '엉덩이·허벅지 피하지방 중심에서 내장지방·간 지방이 늘어나기 쉽습니다.',
      '근육량 감소와 인슐린 저항성 악화로 유리지방산 유입과 VLDL 생산이 조금 늘어납니다.',
      '그 결과 LDL-C와 apoB가 오르고 일부에서는 TG도 오릅니다.',
    ],
    pattern: ['LDL-C ↑', 'apoB ↑', 'TG ↑ 가능', 'HDL-C 유지 가능'],
    point: 'HDL-C는 유지되거나 오르기도 하며, HDL의 양과 기능은 다릅니다. <b>지질 개선만을 목적으로 폐경 호르몬 치료를 시작하지 않습니다.</b>',
    ref: '가이드 3.4절',
  },
  hypo: {
    group: '콜레스테롤 대사 이상', title: '갑상선기능저하증', phys: { ldlrMod: 0.8, pcsk9Mod: 1.18, hmgcrMod: 0.85, bileMod: 0.7, lplMod: 0.85 }, diet: 'normal', meals: true, speed: 6, win: '28d',
    sum: 'T3가 부족하면 간의 LDL 수용체가 줄어 LDL 제거율이 크게 떨어집니다. 합성도 조금 줄지만 제거 감소가 더 커서 LDL-C가 오릅니다.',
    steps: [
      'T3가 간의 TRβ와 SREBP-2 경로를 덜 자극해 LDL 수용체 발현이 줄고, PCSK9 증가로 수용체 분해도 빨라집니다.',
      'HMG-CoA 환원효소 발현도 줄어 콜레스테롤 합성 자체는 조금 감소합니다.',
      'CYP7A1을 통한 담즙산 합성과 ABCG5/8을 통한 담즙 배출이 줄어듭니다.',
      'LPL 등 TG 대사에도 영향을 줘 TG는 정상이거나 조금 오릅니다.',
    ],
    pattern: ['LDL-C ↑', 'apoB ↑', 'TG 경도 ↑ 가능'],
    point: 'LDL-C가 설명되지 않게 높으면 <b>TSH와 필요 시 free T4</b>를 확인합니다. 명백한 갑상선기능저하증을 교정하면 LDL-C가 좋아질 수 있습니다.',
    ref: '가이드 3.3절',
  },
  ptA: {
    group: '이상지질혈증 환자 · 예시 A', title: '고LDL혈증', patient: true, sel: 'statin', plaque0: 12,
    phys: { ldlrMod: 0.5, pcsk9Mod: 1.1 }, drugs: {}, diet: 'normal', meals: true, speed: 6, win: '28d',
    target: { k: 'ldl', pct: 0.5, label: '기저치 대비 50% 이상 감소' },
    sum: 'LDL-C가 190 mg/dL 안팎이고 TG는 정상인 고LDL혈증 중심 환자입니다. 시뮬레이션에서는 간의 LDL 수용체 기능이 절반 정도로 떨어진 상태로 가정했습니다.',
    steps: [
      'LDL 수용체가 적어 LDL이 혈중에 오래 머뭅니다. 생산은 비슷해도 제거가 느려 LDL-C가 높게 유지됩니다.',
      'LDL-C ≥190이면 가족성 고콜레스테롤혈증(FH)과 가족력, TSH 등 이차성 원인을 먼저 평가합니다.',
      '위험은 농도 × 노출 기간에 비례하므로 고강도 스타틴으로 적극적으로 낮추고, 부족하면 에제티미브를 더합니다.',
    ],
    pattern: ['LDL-C ≥190', 'apoB ↑', 'TG 정상'],
    point: '가이드 상담 예시 A의 체크포인트는 <b>FH·가족력·TSH 등 이차성 원인 평가와 적극적 LDL 관리</b>입니다. 수용체 기능 자체가 약한 환자로 가정했기 때문에 이 모델에서는 스타틴 반응이 평균(50%)보다 작게 나옵니다.',
    ref: '가이드 5.1 · 7.1절 (예시 A)',
    actions: [{ t: '① 고강도 스타틴', d: { statin: 2 } }, { t: '② 에제티미브 추가', d: { eze: true } }],
  },
  ptB: {
    group: '이상지질혈증 환자 · 예시 B', title: '혼합형 (인슐린 저항성형)', patient: true, sel: 'wl', plaque0: 8,
    phys: { visceral: 1, ir: 0.8, lplMod: 0.72, cetp: 1.3, ldlrMod: 0.95 }, drugs: {}, diet: 'normal', meals: true, speed: 6, win: '28d',
    sum: 'LDL-C는 115 정도로 크게 높지 않지만 TG가 높고 HDL-C가 낮으며 복부비만이 있는 인슐린 저항성형 지질대사 이상입니다.',
    steps: [
      '내장지방과 인슐린 저항성 때문에 간으로 유리지방산이 몰려 VLDL 분비가 늘고, LPL 처리는 느려져 TG가 오릅니다.',
      'CETP 교환으로 LDL은 작고 밀도가 높아지고 HDL-C는 낮아집니다. LDL-C보다 트럭 수(apoB)와 non-HDL-C가 더 많이 늘어납니다.',
      'HbA1c, 복부비만, 식습관, 음주를 확인하고 ASCVD 위험을 평가합니다.',
      '생활요법(체중감량)이 기본이고, ASCVD 위험에 따라 스타틴을 씁니다.',
    ],
    pattern: ['TG ↑', 'HDL-C ↓', 'non-HDL-C·apoB ↑', 'LDL-C 경도 ↑'],
    point: '가이드 상담 예시 B의 체크포인트는 <b>HbA1c·복부비만·식습관·음주, non-HDL-C·apoB, ASCVD 위험 평가</b>입니다. ⑦ 체중감량은 TG를, ① 스타틴은 LDL-C·apoB를 주로 낮추는 차이를 비교해 보세요.',
    ref: '가이드 3.2 · 5.1 · 7.1절 (예시 B)',
    actions: [{ t: '⑦ 체중감량', d: { wl: true } }, { t: '① 중강도 스타틴', d: { statin: 1 } }, { t: '⑥ 피브레이트', d: { fibrate: true } }],
  },
  ptC: {
    group: '이상지질혈증 환자 · 예시 C', title: '고중성지방혈증 (TG 1,200)', patient: true, sel: 'fibrate', plaque0: 6,
    phys: { visceral: 1, ir: 0.85, lplMod: 0.3, cetp: 1.6 }, drugs: {}, diet: 'normal', meals: true, speed: 6, win: '28d',
    target: { k: 'tg', v: 500, label: '공복 TG < 500 (췌장염 위험 구간 아래)', fasting: true },
    sum: 'TG가 1,000 mg/dL를 넘어 킬로미크론과 VLDL이 쌓인 상태입니다. 이때는 심혈관 위험보다 급성 췌장염 위험 관리가 먼저입니다.',
    steps: [
      'LPL 처리 능력이 크게 떨어지고 VLDL 생산은 늘어, 식사 때마다 들어오는 킬로미크론이 제때 치워지지 않습니다.',
      '췌장 모세혈관 주변에서 TG가 분해되며 유리지방산이 국소적으로 과도하게 생겨 염증과 조직 손상을 일으킬 수 있습니다.',
      '금주, 초저지방 식사, 당뇨·약물 등 이차성 원인 교정이 우선이고, 빠른 TG 감소를 위해 피브레이트를 씁니다.',
      '복통·구토가 있으면 즉시 평가가 필요합니다.',
    ],
    pattern: ['TG ≥1,000', 'HDL-C ↓', '킬로미크론 축적'],
    point: '가이드 상담 예시 C의 체크포인트는 <b>금주·초저지방 식사·당뇨/약물 원인 교정, 복통·구토 시 즉시 평가</b>입니다. 초저지방식, ⑥ 피브레이트, ⑦ 체중감량을 차례로 더해 공복 TG가 500 아래로 내려가는지 보세요. 음주는 이 모델에 들어 있지 않습니다.',
    ref: '가이드 1.4 · 4.6 · 7.1절 (예시 C)',
    actions: [{ t: '초저지방식으로 바꾸기', diet: 'lowfat' }, { t: '⑥ 피브레이트', d: { fibrate: true } }, { t: '⑦ 체중감량', d: { wl: true } }],
  },
  ptD: {
    group: '이상지질혈증 환자 · 예시 D', title: '심근경색 후 이차예방', patient: true, sel: 'eze', plaque0: 24,
    phys: { ldlrMod: 0.66, pcsk9Mod: 1.1 }, drugs: { statin: 2 }, diet: 'normal', meals: true, speed: 6, win: '28d',
    target: { k: 'ldl', v: 55, label: 'LDL-C < 55 (매우 높은 위험 이차예방)' },
    sum: '심근경색 병력이 있어 고강도 스타틴을 복용 중이지만 LDL-C가 85 mg/dL 정도입니다. 매우 높은 위험군의 이차예방 목표(LDL-C <55)에 아직 못 미칩니다.',
    steps: [
      '먼저 복약순응도를 확인합니다. 실제로 꾸준히 먹지 않으면 수치가 목표에 못 미칠 수 있습니다.',
      '스타틴 용량을 2배로 올려도 추가 강하는 약 6%(Rule of 6)에 그치므로, 에제티미브를 더하는 것이 1순위 병용입니다.',
      '스타틴+에제티미브로도 목표에 못 미치면 PCSK9 억제제(항체 또는 인클리시란)를 더합니다.',
    ],
    pattern: ['LDL-C 85 (목표 미달)', '혈관벽 누적 병변'],
    point: '가이드 상담 예시 D의 체크포인트는 <b>복약순응도, 에제티미브 추가 및 PCSK9 억제제 고려</b>입니다. ② 에제티미브를 켜고 목표선(55)에 닿는지 본 뒤, ③ PCSK9 항체를 더하면 어떻게 되는지 비교해 보세요.',
    ref: '가이드 5.1 · 6.3 · 7.1절 (예시 D)',
    actions: [{ t: '② 에제티미브 추가', d: { eze: true } }, { t: '③ PCSK9 항체 추가', d: { pcsk9: true } }],
  },
};

const DRUGS = [
  { k: 'statin', name: '스타틴', site: '간 · HMG-CoA 환원효소', mode: 'block', seg: ['없음', '중강도', '고강도'],
    steps: [
      'HMG-CoA를 메발론산으로 바꾸는 속도제한효소(HMG-CoA 환원효소)를 경쟁적으로 억제합니다.',
      '간세포 안 콜레스테롤이 줄면 SREBP-2가 활성화되어 LDL 수용체 유전자 발현이 늘어납니다.',
      '간세포 표면 수용체가 늘어 혈중 LDL을 더 빨리 회수·분해합니다. 생산 억제와 제거 촉진이 함께 일어납니다.',
      'SREBP-2는 PCSK9 유전자도 함께 켜서 효과 일부를 상쇄합니다. PCSK9 억제제를 더하면 효과가 커지는 이유입니다.',
    ],
    effect: ['저강도 <30%↓', '중강도 30~49%↓', '고강도 ≥50%↓', 'TG 일부 ↓'],
    products: '아토르바스타틴(리피토) 10·20mg 중강도, 40·80mg 고강도 · 로수바스타틴(크레스토) 5·10mg 중강도, 20mg 고강도 · 피타바스타틴(리바로) 2·4mg 중강도',
    caution: '아토르바스타틴은 CYP3A4 저해제(클래리트로마이신, 이트라코나졸, 다량의 자몽 주스)와 주의. 로수바스타틴은 제산제와 2시간 간격. 피타바스타틴+사이클로스포린은 병용 금기. 용량을 2배로 올려도 추가 강하는 약 6%(Rule of 6).',
    model: '모델 가정: 합성 효소를 중강도 53%, 고강도 78% 억제.' },
  { k: 'eze', name: '에제티미브', site: '소장 · NPC1L1', mode: 'block',
    steps: [
      '소장 점막의 NPC1L1을 억제해 음식 콜레스테롤과 담즙으로 나온 콜레스테롤의 재흡수를 줄입니다.',
      '킬로미크론 잔여물을 통해 간에 들어오는 콜레스테롤이 줄어듭니다.',
      '간 콜레스테롤이 줄면 SREBP-2 → LDL 수용체가 늘어 LDL 제거가 빨라집니다.',
      '간은 줄어든 유입을 자체 합성으로 일부 메웁니다. 그래서 합성을 막는 스타틴과 함께 쓸 때 서로 보완합니다.',
    ],
    effect: ['단독 약 18%↓', '스타틴에 추가 시 15~20%p 추가↓', 'IMPROVE-IT HR 0.936'],
    products: '로수젯·크레젯(로수바스타틴+에제티미브), 아토젯·리피토플러스(아토르바스타틴+에제티미브), 리바로젯(피타바스타틴+에제티미브)',
    caution: 'CYP 대사와 무관해 상호작용이 적습니다. 콜레스티라민은 에제티미브 복용 2시간 전 또는 4시간 후에.',
    model: '모델 가정: 장 콜레스테롤 흡수 55% 감소.' },
  { k: 'pcsk9', name: 'PCSK9 항체', site: '혈액 · PCSK9 단백질', mode: 'block',
    steps: [
      'PCSK9가 LDL 수용체에 붙으면 수용체가 LDL과 함께 리소좀으로 들어가 분해됩니다.',
      '에볼로쿠맙·알리로쿠맙은 혈중 PCSK9에 결합해 수용체와 붙지 못하게 합니다.',
      '수용체가 분해되지 않고 세포 표면으로 재순환해, 같은 수용체가 LDL을 여러 번 회수합니다.',
    ],
    effect: ['LDL-C 약 45~64%↓', 'FOURIER 11.3% → 9.8% (HR 0.85)'],
    products: '레파타(에볼로쿠맙), 프랄런트(알리로쿠맙) · 피하주사',
    caution: '스타틴+에제티미브로도 초고위험군 목표에 못 미치거나 불내약성이 심할 때 2차로 추가합니다.',
    model: '모델 가정: PCSK9 작용 88% 차단.' },
  { k: 'incl', name: '인클리시란', site: '간 · PCSK9 mRNA (siRNA)', mode: 'block',
    steps: [
      'siRNA가 간세포 안에서 PCSK9 mRNA를 분해합니다.',
      'PCSK9 단백질이 만들어지지 않아 LDL 수용체 분해가 줄어듭니다.',
      '수용체가 늘어 LDL 회수가 빨라집니다. 혈중 PCSK9를 붙잡는 항체와 달리, 만들어지는 단계를 막습니다.',
    ],
    effect: ['LDL-C 약 48~52%↓', '심혈관 사건 확증 결과는 진행 중'],
    products: '렉비오(인클리시란)',
    caution: '가이드 기준 시점에 심혈관 사건 감소에 대한 확증적 결과는 진행 중이었습니다.',
    model: '모델 가정: PCSK9 생성 87% 감소.' },
  { k: 'bemp', name: '벰페도산', site: '간 · ATP-citrate lyase', mode: 'block',
    steps: [
      'HMG-CoA 환원효소보다 앞 단계인 ATP-citrate lyase(ACLY)를 억제합니다.',
      '콜레스테롤 합성 원료(아세틸-CoA) 공급이 줄어 간 합성이 감소합니다.',
      '간 콜레스테롤↓ → SREBP-2 → LDL 수용체↑로 LDL 제거가 늘어납니다.',
    ],
    effect: ['LDL-C 감소 (모델 약 20%)', 'CLEAR Outcomes 11.7% vs 13.3% (HR 약 0.87)'],
    products: '스타틴 관련 부작용으로 스타틴을 쓰기 어려운 환자 등에서 활용',
    caution: 'CLEAR Outcomes는 스타틴 불내성 환자 대상 시험입니다.',
    model: '모델 가정: 합성 경로 42% 억제.' },
  { k: 'fibrate', name: '피브레이트', site: '간 핵 PPAR-α → 모세혈관 LPL', mode: 'boost',
    steps: [
      'PPAR-α 핵수용체를 활성화해 지방산 β-산화를 늘립니다.',
      'ApoC-III 발현을 낮춰 LPL이 VLDL·킬로미크론의 TG를 더 잘 분해하게 합니다.',
      '간의 VLDL 분비도 줄어 TG가 내려가고 HDL-C는 조금 오릅니다.',
      'TG 감소가 곧 심혈관 사건 감소는 아닙니다(PROMINENT HR 1.03). 핵심 역할은 TG ≥500, 특히 ≥1,000에서 췌장염 위험 관리입니다.',
    ],
    effect: ['TG 약 25~50%↓', 'HDL-C 약 5~20%↑', 'LDL-C 변동 가능'],
    products: '페노피브레이트(리피딜 등), 베자피브레이트',
    caution: '스타틴과 함께 쓸 때는 젬피브로질보다 페노피브레이트를 선호합니다. 신기능(eGFR)에 따른 용량 조절, CPK·근육통 관찰.',
    model: '모델 가정: LPL 활성 1.3배, VLDL 분비 12% 감소.' },
  { k: 'wl', name: '체중감량', site: '지방조직 · 내장지방 (생활요법·GLP-1 RA)', mode: 'boost',
    steps: [
      '체중과 내장지방이 줄면 지방조직의 인슐린 감수성이 좋아져 유리지방산 유출이 줄어듭니다.',
      '간으로 들어오는 원료가 줄어 TG 합성과 VLDL 생산이 감소합니다.',
      'TG는 뚜렷이 내려가지만 LDL-C 감소는 작거나 일정하지 않습니다. 유전성 고LDL혈증은 약물치료가 따로 필요합니다.',
    ],
    effect: ['체중 5~10% 감량 시 TG 약 20~30%↓', 'SELECT 세마글루타이드 HR 0.80 (특정군)'],
    products: '식사·운동, GLP-1 수용체 작용제(세마글루타이드)',
    caution: 'GLP-1 수용체 작용제는 LDL 합성을 스타틴처럼 직접 막는 약이 아닙니다. 내장지방·인슐린 저항성이 없는 사람에게는 이 모델에서 변화가 거의 없습니다.',
    model: '모델 가정: 내장지방 50%, 인슐린 저항성 45% 감소.' },
];

const DIALS = [
  { k: 'ldlrMod', t: 'LDL 수용체 발현', h: 'T3·에스트로겐이 올림', min: 0.4, max: 1.5 },
  { k: 'pcsk9Mod', t: 'PCSK9 생성', h: '수용체 분해 촉진', min: 0.5, max: 2 },
  { k: 'hmgcrMod', t: '간 콜레스테롤 합성 능력', h: 'HMG-CoA 환원효소', min: 0.5, max: 1.5 },
  { k: 'bileMod', t: '담즙산 합성·담즙 배출', h: 'CYP7A1 · ABCG5/8', min: 0.4, max: 1.5 },
  { k: 'visceral', t: '내장지방', h: '문맥으로 간에 FFA 공급', min: 0, max: 1 },
  { k: 'ir', t: '인슐린 저항성', h: '지방분해 억제 실패', min: 0, max: 0.9 },
  { k: 'lplMod', t: 'LPL 활성', h: 'ApoC-III가 높을수록 ↓', min: 0.3, max: 1.5 },
  { k: 'cetp', t: 'CETP 교환', h: 'TG ↔ 콜레스테롤 에스터', min: 0.5, max: 2 },
];

const LIPIDS = [
  { k: 'ldl', name: 'LDL-C', sub: 'LDL 트럭에 실린 콜레스테롤', max: 250, higherBad: true,
    bands: [[0, 100, 'good', '적정'], [100, 130, 'ok', '정상'], [130, 160, 'warn', '경계'], [160, 190, 'bad', '높음'], [190, 1e9, 'bad', '매우 높음']] },
  { k: 'nonhdl', name: 'non-HDL-C', sub: '총콜레스테롤 − HDL-C', max: 280, higherBad: true,
    bands: [[0, 130, 'good', '적정'], [130, 160, 'ok', '정상'], [160, 190, 'warn', '경계'], [190, 220, 'bad', '높음'], [220, 1e9, 'bad', '매우 높음']] },
  { k: 'apob', name: 'apoB', sub: '죽상경화 유발 트럭 수', max: 200, higherBad: true,
    bands: [[0, 90, 'good', '적정'], [90, 130, 'warn', '증가'], [130, 1e9, 'bad', '높음']] },
  { k: 'hdl', name: 'HDL-C', sub: '회수 트럭에 실린 콜레스테롤', max: 100, higherBad: false,
    bands: [[0, 40, 'bad', '낮음'], [40, 60, 'ok', '보통'], [60, 1e9, 'good', '높음']] },
  { k: 'tg', name: 'TG', sub: '중성지방 (현재 혈중)', max: 600, higherBad: true,
    bands: [[0, 150, 'good', '정상'], [150, 500, 'warn', '높음'], [500, 1000, 'bad', '췌장염 위험↑'], [1000, 2000, 'bad', '췌장염 위험 큼'], [2000, 1e9, 'bad', '매우 높은 위험']] },
];

const GAUGES = [
  { k: 'hc', t: '간 조절성 콜레스테롤', f: (d, s) => s.Hc },
  { k: 'srebp', t: 'SREBP-2 신호', f: (d) => d.srebp },
  { k: 'syn', t: '콜레스테롤 합성 (HMGCR)', f: (d) => d.fin.syn },
  { k: 'ldlr', t: 'LDL 수용체 활성', f: (d) => d.Reff },
  { k: 'pcsk9', t: 'PCSK9 작용', f: (d) => d.pcsk9 * (1 - d.mAb) },
  { k: 'abs', t: '장 콜레스테롤 흡수', f: (d) => d.fin.abs },
  { k: 'ins', t: '인슐린', f: (d, s) => s.I },
  { k: 'ffa', t: '간으로 가는 유리지방산', f: (d) => d.ffa },
  { k: 'vldl', t: 'VLDL-TG 분비', f: (d) => d.SV },
  { k: 'lpl', t: 'LPL 처리 능력', f: (d) => d.Vmax },
];

/* ---------- 상태 ---------- */
const app = {
  scen: 'normal', phys: Object.assign({}, M.PHYS), drugs: Object.assign({}, NODRUG),
  diet: 'normal', meals: true, speed: 1, win: '7d', playing: !reduceMotion,
  s: null, tw: null, ref: null, refS: null, d: null, e: null,
  hist: [], marks: [], lastSample: -1, fastTG: null, fastTG0: null, plaque: 0, lastMeal: -99, custom: false,
  series: { ldl: true, hdl: true, tg: true, apob: false },
  sel: 'statin', baseline: null, proj: null, projDay: -1,
};
const scenDrugs = (id) => Object.assign({}, NODRUG, SCEN[id].drugs || {});

const hod = (t) => ((6 + t) % 24 + 24) % 24;
const crossed = (h0, h1, x) => (h1 >= h0 ? (h0 < x && x <= h1) : (x > h0 || x <= h1));
const fmtClock = (t) => { const a = 6 + t; const day = Math.floor(a / 24) + 1; const h = a - (day - 1) * 24; const hh = Math.floor(h); const mm = Math.floor((h - hh) * 60); return { day, txt: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` }; };

const warmCache = {};
function warmState(meals, key, ph, dr, diet, days) {
  key = (key || 'normal') + (meals ? '|m' : '|f');
  if (!warmCache[key]) {
    const s = M.init(); const dt = 0.05; const n = Math.round((days || 14) * 24 / dt);
    for (let i = 0; i < n; i++) {
      const h0 = hod(i * dt), h1 = hod((i + 1) * dt);
      if (meals) for (const mt of MEAL_HOURS) if (crossed(h0, h1, mt)) M.eat(s, diet || 'normal');
      M.step(s, ph || M.PHYS, dr || NODRUG, dt);
    }
    s.t = 0;
    warmCache[key] = s;
  }
  return JSON.parse(JSON.stringify(warmCache[key]));
}

function restart() {
  const sc = SCEN[app.scen];
  app.s = sc.patient ? warmState(app.meals, app.scen, Object.assign({}, M.PHYS, sc.phys), scenDrugs(app.scen), sc.diet, 30) : warmState(app.meals);
  app.tw = warmState(app.meals);
  app.refS = warmState(app.meals);
  app.ref = M.derive(app.refS, M.PHYS, NODRUG);
  app.hist = []; app.marks = []; app.lastSample = -1; app.plaque = sc.plaque0 || 0; app.lastMeal = -99;
  app.fastTG = app.s.V + app.s.C; app.fastTG0 = app.tw.V + app.tw.C;
  { const d0 = M.derive(app.s, app.phys, app.drugs); app.baseline = { ldl: d0.LDLC, tg: app.fastTG, hdl: d0.HDLC, nonhdl: d0.nonHDL, apob: d0.apoB }; }
  scheduleProj();
  sample();
  app.d = M.derive(app.s, app.phys, app.drugs); app.e = M.derive(app.tw, M.PHYS, NODRUG);
  viz.reset();
  chartDirty = true;
}

function eat(manual) {
  M.eat(app.s, app.diet); M.eat(app.tw, 'normal');
  app.marks.push({ t: app.s.t, kind: 'meal', diet: app.diet });
  app.lastMeal = app.s.t;
  viz.onMeal();
  if (manual) chartDirty = true;
}

function advance(H) {
  if (H <= 0) return;
  const n = Math.max(1, Math.ceil(H / 0.05)); const h = H / n;
  for (let i = 0; i < n; i++) {
    const t0 = app.s.t, h0 = hod(t0), h1 = hod(t0 + h);
    if (app.meals) for (const mt of MEAL_HOURS) if (crossed(h0, h1, mt)) eat(false);
    if (crossed(h0, h1, 7.4)) { app.fastTG = app.s.V + app.s.C; app.fastTG0 = app.tw.V + app.tw.C; }
    const d = M.step(app.s, app.phys, app.drugs, h);
    M.step(app.tw, M.PHYS, NODRUG, h);
    const r = d.apoB / app.ref.apoB;
    app.plaque = clamp(app.plaque + (h / 24) * (r * r - 1), 0, 60);
    if (app.s.t - app.lastSample >= 0.25 - 1e-9) sample();
  }
  chartDirty = true;
}

function sample() {
  const d = M.derive(app.s, app.phys, app.drugs), e = M.derive(app.tw, M.PHYS, NODRUG);
  app.hist.push({ t: app.s.t, ldl: d.LDLC, hdl: d.HDLC, tg: d.TG, apob: d.apoB, ldl0: e.LDLC, hdl0: e.HDLC, tg0: e.TG, apob0: e.apoB });
  app.lastSample = app.s.t;
  if (app.hist.length > 7000) app.hist.splice(0, app.hist.length - 7000);
}

/* ---------- 색 ---------- */
const COLOR_KEYS = ['bg', 'panel', 'panel-2', 'ink', 'ink-2', 'muted', 'line', 'accent', 'accent-soft', 'vessel', 'vessel-edge', 'vessel-line',
  'liver', 'liver-edge', 'gut', 'gut-edge', 'fat', 'fat-edge', 'tissue', 'tissue-edge', 'intima', 'intima-edge',
  'p-cm', 'p-core', 'p-vldl', 'p-idl', 'p-rem', 'p-ldl', 'p-ldl-ox', 'p-hdl', 'p-ffa', 'p-pcsk9', 'p-bile', 'p-stroke',
  'good', 'warn', 'warn-soft', 'bad', 'bad-soft'];
const C = {};
function readColors() { const cs = getComputedStyle(document.documentElement); for (const k of COLOR_KEYS) C[k] = cs.getPropertyValue('--' + k).trim(); }

/* ---------- 지도 시각화 ---------- */
const viz = (() => {
  const cv = $('#map'), box = $('#mapBox'), tip = $('#tip'), ctx = cv.getContext('2d');
  const LAYOUTS = {
    land: {
      W: 1000, H: 600, fs: 14, title: 18, big: 30, pr: 1, roadW: 36, lane: 11, speed: 84,
      loop: { x0: 255, y0: 132, x1: 785, y1: 466, r: 78 },
      box: {
        liver: { x: 18, y: 102, w: 206, h: 246 }, gut: { x: 18, y: 388, w: 206, h: 196 },
        fat: { x: 470, y: 10, w: 350, h: 92 }, tissue: { x: 824, y: 160, w: 160, h: 278 }, wall: { x: 296, y: 506, w: 448, h: 84 },
      },
      zone: { dock: { x: 220, y: 156, w: 70, h: 188 }, lpl: { x: 470, y: 104, w: 330, h: 60 }, tissue: { x: 752, y: 190, w: 70, h: 240 }, wall: { x: 330, y: 436, w: 380, h: 64 } },
      liverExit: [224, 130], liverExitRoad: [292, 133], lymphFrom: [224, 406], lymphRoad: [262, 446],
      ffa: [[470, 50], [121, 50], [121, 102]], bile: [[121, 348], [121, 388]],
      liverCore: [110, 250], center: [520, 300],
    },
    port: {
      W: 480, H: 700, fs: 14, title: 17, big: 28, pr: 1.05, roadW: 30, lane: 8, speed: 60,
      loop: { x0: 128, y0: 140, x1: 362, y1: 540, r: 50 },
      box: {
        liver: { x: 4, y: 110, w: 106, h: 236 }, gut: { x: 4, y: 384, w: 106, h: 178 },
        fat: { x: 136, y: 8, w: 336, h: 88 }, tissue: { x: 380, y: 160, w: 96, h: 330 }, wall: { x: 136, y: 576, w: 300, h: 116 },
      },
      zone: { dock: { x: 100, y: 186, w: 56, h: 152 }, lpl: { x: 170, y: 112, w: 200, h: 50 }, tissue: { x: 340, y: 200, w: 56, h: 300 }, wall: { x: 170, y: 510, w: 160, h: 60 } },
      liverExit: [110, 126], liverExitRoad: [150, 143], lymphFrom: [110, 400], lymphRoad: [135, 515],
      ffa: [[136, 50], [57, 50], [57, 110]], bile: [[57, 346], [57, 384]],
      liverCore: [57, 230], center: [245, 330],
    },
  };
  const INFO = {
    liver: ['간 · 콜레스테롤 물류센터', '콜레스테롤을 합성하고(HMG-CoA 환원효소) VLDL에 실어 내보내며, LDL 수용체로 LDL·IDL·잔여물을 회수합니다. 간 안 콜레스테롤이 줄면 SREBP-2가 켜져 수용체와 합성을 늘립니다.'],
    gut: ['소장', '음식 지방은 킬로미크론에 실려 림프로 나가고, 음식·담즙 콜레스테롤은 NPC1L1을 통해 흡수됩니다. 에제티미브가 막는 지점입니다.'],
    fat: ['지방·근육 모세혈관', 'LPL이 킬로미크론·VLDL의 TG를 분해해 지방산을 조직에 내립니다. 인슐린은 LPL을 켜고 지방세포의 지방분해(HSL)는 끕니다. 인슐린 저항성에서는 이 억제가 풀려 유리지방산이 간으로 몰립니다.'],
    tissue: ['말초 조직', '세포막, 스테로이드 호르몬, 비타민 D의 원료로 콜레스테롤을 씁니다. 남는 콜레스테롤은 HDL에 넘깁니다.'],
    wall: ['동맥 내막', 'LDL 입자가 많고 오래 머물수록 일부가 내막에 갇히고(retention) 변형·염증을 거쳐 거품세포가 됩니다. HDL은 일부를 되가져갑니다. 위험은 농도 × 노출 기간에 비례합니다.'],
    road: ['혈관 · 지단백 도로', '지단백 트럭이 다니는 도로입니다. 트럭 수(apoB)와 실린 화물(LDL-C)은 항상 같게 움직이지 않습니다.'],
  };

  let L = LAYOUTS.land, mode = 'land', scale = 1, dpr = 1, cssW = 0;
  let road = null, parts = [], dots = [], wallDots = [], hover = null, docks = [];
  let fx = { ffa: 0, bile: 0, food: 0, sp: {} };

  function buildRoad() {
    const { x0, y0, x1, y1, r } = L.loop;
    const a = x1 - x0 - 2 * r, b = y1 - y0 - 2 * r, q = Math.PI * r / 2;
    const P = 2 * a + 2 * b + 4 * q;
    const pts = [];
    const step = 2;
    for (let u = 0; u < P; u += step) {
      let x, y, nx, ny, v = u;
      if (v < a) { x = x0 + r + v; y = y0; nx = 0; ny = -1; }
      else if ((v -= a) < q) { const th = -Math.PI / 2 + v / r; x = x1 - r + r * Math.cos(th); y = y0 + r + r * Math.sin(th); nx = Math.cos(th); ny = Math.sin(th); }
      else if ((v -= q) < b) { x = x1; y = y0 + r + v; nx = 1; ny = 0; }
      else if ((v -= b) < q) { const th = v / r; x = x1 - r + r * Math.cos(th); y = y1 - r + r * Math.sin(th); nx = Math.cos(th); ny = Math.sin(th); }
      else if ((v -= q) < a) { x = x1 - r - v; y = y1; nx = 0; ny = 1; }
      else if ((v -= a) < q) { const th = Math.PI / 2 + v / r; x = x0 + r + r * Math.cos(th); y = y1 - r + r * Math.sin(th); nx = Math.cos(th); ny = Math.sin(th); }
      else if ((v -= q) < b) { x = x0; y = y1 - r - v; nx = -1; ny = 0; }
      else { v -= b; const th = Math.PI + v / r; x = x0 + r + r * Math.cos(th); y = y0 + r + r * Math.sin(th); nx = Math.cos(th); ny = Math.sin(th); }
      let zone = null;
      for (const k in L.zone) { const z = L.zone[k]; if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) { zone = k; break; } }
      pts.push({ x, y, nx, ny, zone });
    }
    road = { pts, len: pts.length * step, step };
    road.exitS = nearestS(L.liverExitRoad);
    road.lymphS = nearestS(L.lymphRoad);
    let lplEnd = 0; pts.forEach((p, i) => { if (p.zone === 'lpl') lplEnd = i; }); road.lplEndS = lplEnd * step;
  }
  function nearestS(pt) { let best = 0, bd = 1e9; road.pts.forEach((p, i) => { const d = (p.x - pt[0]) ** 2 + (p.y - pt[1]) ** 2; if (d < bd) { bd = d; best = i; } }); return best * road.step; }
  function at(s) { const n = road.pts.length; let i = Math.floor(s / road.step) % n; if (i < 0) i += n; return road.pts[i]; }
  function posOf(p) { const q = at(p.s); return [q.x + q.nx * p.lane, q.y + q.ny * p.lane]; }

  function resize() {
    const w = box.clientWidth; if (!w) return;
    const newMode = w < 600 ? 'port' : 'land';
    if (newMode !== mode || !road) { mode = newMode; L = LAYOUTS[mode]; buildRoad(); if (app.s) reset(); }
    cssW = w; scale = w / L.W; dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const cssH = Math.round(L.H * scale);
    cv.style.height = cssH + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(cssH * dpr);
  }

  /* --- 입자 --- */
  const R = (k) => ({ CM: 9.5, REM: 5, VLDL: 7, IDL: 4.8, LDL: 3.7, HDL: 2.5 }[k] * L.pr);
  function mk(type, s, extra) { return Object.assign({ type, s, lane: (Math.random() * 2 - 1) * L.lane, tg: 1, chol: 0.2, zone: null, conv: 0, state: 'road', a: 1 }, extra || {}); }
  function targets() {
    const s = app.s;
    return { VLDL: clamp(Math.round(s.V / 11), 1, 70), CM: clamp(Math.round(s.C / 6), 0, 40), LDL: clamp(Math.round(s.L / 2.6), 3, 95), HDL: clamp(Math.round(s.H / 3.2), 2, 40) };
  }
  function counts() { const c = { CM: 0, REM: 0, VLDL: 0, IDL: 0, LDL: 0, HDL: 0 }; for (const p of parts) if (p.state === 'road' || p.state === 'enter') c[p.type]++; return c; }
  function reset() {
    parts = []; dots = []; wallDots = [];
    if (!road || !app.s) return;
    const t = targets();
    const add = (type, n, ex) => { for (let i = 0; i < n; i++) parts.push(mk(type, Math.random() * road.len, typeof ex === 'function' ? ex() : ex)); };
    add('VLDL', t.VLDL, () => ({ tg: 0.45 + Math.random() * 0.55 }));
    add('LDL', t.LDL); add('HDL', t.HDL, () => ({ chol: 0.15 + Math.random() * 0.5 }));
    add('IDL', Math.round(t.VLDL * 0.4), { tg: 0.3 });
  }
  function onMeal() { fx.food = 1.2; }
  function animTo(p, pts, dur, onEnd, state) { p.state = state || 'anim'; p.anim = { pts, t: 0, dur, onEnd }; }
  function lerpPath(pts, u) {
    if (pts.length === 2) return [pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u];
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let d = u * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= seg[i]; }
    return pts[pts.length - 1];
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inBox = (b, pad = 14, top = 0) => [rnd(b.x + pad, b.x + b.w - pad), rnd(b.y + pad + top, b.y + b.h - pad)];
  function dot(kind, pts, dur, r, col, fade) { dots.push({ kind, pts, t: 0, dur, r: r * L.pr, col, fade: fade !== false }); }
  function dockPoint(p) { const [x, y] = posOf(p); let best = null, bd = 1e9; for (const d of docks) { const dd = Math.abs(d[1] - y); if (dd < bd) { bd = dd; best = d; } } return best ? [best[0], best[1]] : [x - 20, y]; }

  function spawnFrom(type, fromPt, roadS, extra) {
    const p = mk(type, (roadS + rnd(0, 26) + road.len) % road.len, extra);
    roadS = p.s;
    const q = at(roadS); const to = [q.x + q.nx * p.lane, q.y + q.ny * p.lane];
    p.state = 'enter'; p.anim = { pts: [fromPt, to], t: 0, dur: 0.9, onEnd: () => { p.state = 'road'; } };
    parts.push(p);
  }

  function update(dt) {
    if (!road || !app.s) return;
    const d = app.d, ref = app.ref, s = app.s;
    const t = targets(), c = counts();
    const ctrl = (k) => t[k] ? clamp(Math.pow((c[k] + 0.5) / (t[k] + 0.5), 1.5), 0.25, 4) : 4;
    const lplV = clamp(d.kfrac / ref.kfrac, 0.12, 3);
    const kC = (d.Vmax * 12 / (1200 + 5 * s.C + s.V)) / (ref.Vmax * 12 / (1200 + ref.V + 1e-9));
    const lplC = clamp(kC, 0.12, 3);
    const reffRel = d.Reff / ref.Reff;

    // 생성 (부족분 보충)
    const spawn = (k, def, rate, fn) => { const deficit = def; if (deficit > 0 && Math.random() < deficit * rate * dt) fn(); };
    spawn('VLDL', t.VLDL - c.VLDL, 0.9, () => spawnFrom('VLDL', L.liverExit, road.exitS, { tg: 1 }));
    spawn('CM', t.CM - c.CM, 1.4, () => spawnFrom('CM', L.lymphFrom, road.lymphS, { tg: 1 }));
    spawn('HDL', t.HDL - c.HDL, 0.6, () => spawnFrom('HDL', L.liverExit, road.exitS, { chol: 0.12 }));
    if (c.LDL < t.LDL * 0.85) spawn('LDL', t.LDL - c.LDL, 0.25, () => parts.push(mk('LDL', road.lplEndS)));

    const v = L.speed;
    for (const p of parts) {
      if (p.state === 'anim' || p.state === 'enter') {
        p.anim.t += dt / p.anim.dur;
        if (p.anim.t >= 1) { p.anim.t = 1; const f = p.anim.onEnd; p.anim.onEnd = null; if (f) f(); }
        continue;
      }
      if (p.state !== 'road') continue;
      p.s += v * dt * (p.type === 'CM' ? 0.9 : 1);
      if (p.s >= road.len) p.s -= road.len;
      const z = at(p.s).zone;
      if (z !== p.zone) { enterZone(p, z, { d, ctrl, reffRel }); p.zone = z; }
      if (p.state !== 'road') continue;
      if (z === 'lpl') {
        if (p.type === 'VLDL') {
          p.tg -= 0.3 * lplV * dt;
          if (Math.random() < 2.2 * lplV * dt) { const [x, y] = posOf(p); dot('ffa', [[x, y], inBox(L.box.fat, 12, 30)], 0.9, 1.6, C['p-ffa']); }
          if (p.tg <= 0.32) { p.type = 'IDL'; p.tg = 0.3; }
        } else if (p.type === 'CM') {
          p.tg -= 0.42 * lplC * dt;
          if (Math.random() < 4 * lplC * dt) { const [x, y] = posOf(p); dot('ffa', [[x, y], inBox(L.box.fat, 12, 30)], 0.9, 1.7, C['p-ffa']); }
          if (p.tg <= 0.22) { p.type = 'REM'; p.tg = 0.2; }
        } else if (p.type === 'IDL' && p.passedDock) {
          p.conv += dt * 1.4; if (p.conv >= 1) { p.type = 'LDL'; }
        }
      }
    }

    // 간으로 가는 유리지방산, 담즙, 음식
    fx.ffa += dt * 1.7 * clamp(d.ffa, 0, 4);
    while (fx.ffa >= 1) { fx.ffa -= 1; dot('ffa', L.ffa.map((q) => [q[0] + rnd(-3, 3), q[1] + rnd(-3, 3)]), 2.6, 1.7, C['p-ffa'], false); }
    const bileRel = (d.fout.bile + d.fout.biliary) / (ref.fout.bile + ref.fout.biliary);
    fx.bile += dt * 1.1 * bileRel;
    while (fx.bile >= 1) { fx.bile -= 1; dot('bile', L.bile.map((q) => [q[0] + rnd(-4, 4), q[1]]), 1.2, 1.8, C['p-bile'], false); }
    const gutLoad = s.gf1 + s.gf2;
    if (gutLoad > 0.05 && Math.random() < dt * 5 * Math.min(1.5, gutLoad)) {
      const g = L.box.gut; const y = rnd(g.y + g.h * 0.55, g.y + g.h - 16);
      dot('food', [[g.x + 6, y], [g.x + g.w * rnd(0.45, 0.85), y + rnd(-10, 10)]], 1.4, 2.2, app.diet === 'sfa' ? C['p-cm'] : app.diet === 'egg' ? C['p-core'] : C['p-rem']);
    }

    for (const q of dots) q.t += dt / q.dur;
    dots = dots.filter((q) => q.t < 1);
    for (const w of wallDots) { w.age += dt; if (!w.ox && Math.random() < 0.05 * dt) w.ox = true; if (w.ox && Math.random() < 0.04 * dt) w.gone = true; }
    wallDots = wallDots.filter((w) => !w.gone).slice(-45);
    parts = parts.filter((p) => !p.dead);
  }

  function enterZone(p, z, k) {
    const { d, ctrl, reffRel } = k;
    if (z === 'dock') {
      if (p.type === 'REM') { if (Math.random() < 0.85) capture(p); }
      else if (p.type === 'IDL') { if (!p.passedDock && Math.random() < (1 - d.fconv)) capture(p); p.passedDock = true; }
      else if (p.type === 'LDL') { if (Math.random() < clamp(0.12 * reffRel * ctrl('LDL'), 0, 0.95)) capture(p); }
      else if (p.type === 'HDL') {
        if (p.chol > 0.45) { const [x, y] = posOf(p); dot('hdlc', [[x, y], dockPoint(p), [L.liverCore[0] + rnd(-30, 30), L.liverCore[1] + rnd(-30, 30)]], 1.1, 1.7, C['p-hdl']); p.chol = 0.15; }
        if (Math.random() < 0.05 * ctrl('HDL')) capture(p);
      }
    } else if (z === 'tissue') {
      if (p.type === 'LDL' && Math.random() < 0.035) { const [x, y] = posOf(p); animTo(p, [[x, y], inBox(L.box.tissue, 16, 50)], 1.0, () => { p.dead = true; }); }
      if (p.type === 'HDL') p.chol = Math.min(1, p.chol + 0.28);
    } else if (z === 'wall') {
      if (p.type === 'LDL' && Math.random() < 0.05) {
        const [x, y] = posOf(p); const tgt = inBox(L.box.wall, 18, 36);
        animTo(p, [[x, y], tgt], 1.1, () => { p.dead = true; wallDots.push({ x: tgt[0], y: tgt[1], age: 0, ox: false }); });
      }
      if (p.type === 'HDL') {
        p.chol = Math.min(1, p.chol + 0.2);
        const live = wallDots.filter((w) => !w.gone);
        if (live.length && Math.random() < 0.3 * (app.s.H / app.ref.HDLC)) { const w = live[Math.floor(Math.random() * live.length)]; w.gone = true; const [x, y] = posOf(p); dot('efflux', [[w.x, w.y], [x, y]], 0.8, 1.6, C['p-hdl']); }
      }
    }
  }
  function capture(p) {
    const [x, y] = posOf(p);
    animTo(p, [[x, y], dockPoint(p), [L.liverCore[0] + rnd(-40, 40), L.liverCore[1] + rnd(-40, 40)]], 1.0, () => { p.dead = true; });
  }

  /* --- 그리기 --- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const font = (w, sz, fam) => `${w} ${sz}px ${fam === 'num' ? '"IBM Plex Mono", ui-monospace, monospace' : fam === 'disp' ? '"Hahmlet", "IBM Plex Sans KR", serif' : '"IBM Plex Sans KR", "Malgun Gothic", sans-serif'}`;
  function text(t, x, y, o) {
    o = o || {}; ctx.font = font(o.w || 500, o.sz || L.fs, o.fam); ctx.fillStyle = o.c || C.ink; ctx.textAlign = o.al || 'left'; ctx.textBaseline = o.bl || 'alphabetic';
    ctx.fillText(t, x, y);
  }
  function fitText(t, maxW, sz, w) { let s = sz; ctx.font = font(w || 500, s); while (s > 9 && ctx.measureText(t).width > maxW) { s -= 0.5; ctx.font = font(w || 500, s); } return s; }
  function wrap(t, x, y, maxW, lh, o) {
    o = o || {}; ctx.font = font(o.w || 400, o.sz || L.fs - 1); const words = t.split(' '); let line = '', yy = y;
    for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW && line) { text(line, x, yy, o); line = wd; yy += lh; } else line = test; }
    if (line) text(line, x, yy, o); return yy;
  }
  function station(k, label, sub, fill, edge) {
    const b = L.box[k]; rr(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = hover === k ? 2.4 : 1.3; ctx.strokeStyle = edge; ctx.stroke();
    const tsz = fitText(label, b.w - 20, L.title, 700);
    text(label, b.x + 11, b.y + 10 + tsz, { fam: 'disp', w: 700, sz: tsz });
    if (sub) { const ssz = fitText(sub, b.w - 20, L.fs - 2, 500); text(sub, b.x + 11, b.y + 14 + tsz + ssz + 2, { sz: ssz, c: C.muted }); }
  }
  function meter(x, y, w, label, v, opts) {
    opts = opts || {};
    const sz = L.fs - 2.5;
    text(label, x, y, { sz, c: C['ink-2'], w: 500 });
    ctx.font = font(500, sz, 'num'); const vs = Math.round(v * 100) + '%';
    text(vs, x + w, y, { sz, al: 'right', fam: 'num', c: C['ink-2'] });
    const ty = y + 5, th = 5 * L.pr;
    rr(x, ty, w, th, th / 2); ctx.fillStyle = C['panel-2']; ctx.fill();
    const lv = clamp(Math.log2(Math.max(v, 0.01)), -2, 2); const mid = x + w / 2; const px = mid + (lv / 2) * (w / 2);
    ctx.fillStyle = v < 0.92 ? C.warn : C.accent;
    ctx.fillRect(Math.min(mid, px), ty, Math.max(1.5, Math.abs(px - mid)), th);
    ctx.fillStyle = C.muted; ctx.fillRect(mid - 0.75, ty - 2, 1.5, th + 4);
    return ty + th;
  }
  function badges(list, x, y, maxW) {
    let cx = x, cy = y; const h = (L.fs + 7);
    for (const [t, kind] of list) {
      const sz = L.fs - 2.5; ctx.font = font(600, sz); const tw = Math.min(ctx.measureText(t).width, maxW - 14) + 14;
      if (cx + tw > x + maxW && cx > x) { cx = x; cy += h + 4; }
      rr(cx, cy, tw, h, h / 2);
      ctx.fillStyle = kind === 'drug' ? C['accent-soft'] : kind === 'issue' ? C['warn-soft'] : C['panel-2']; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = kind === 'drug' ? C.accent : kind === 'issue' ? C.warn : C.line; ctx.stroke();
      const fs2 = fitText(t, tw - 12, sz, 600);
      text(t, cx + 7, cy + h / 2 + 0.5, { sz: fs2, w: 600, bl: 'middle', c: kind === 'drug' ? C.accent : kind === 'issue' ? C.warn : C['ink-2'] });
      cx += tw + 5;
    }
    return cy + h;
  }
  function badgeSets() {
    const ph = app.phys, dr = app.drugs, b = { liver: [], gut: [], fat: [], road: [] };
    if (app.scen === 'hypo' && !app.custom) b.liver.push(['T3 ↓', 'issue']);
    if (app.scen === 'meno' && !app.custom) b.liver.push(['에스트로겐 ↓', 'issue']);
    if (ph.ldlrMod < 0.97) b.liver.push(['LDLR 발현 ↓', 'issue']); else if (ph.ldlrMod > 1.03) b.liver.push(['LDLR 발현 ↑', 'state']);
    if (ph.pcsk9Mod > 1.03) b.liver.push(['PCSK9 ↑', 'issue']); else if (ph.pcsk9Mod < 0.97) b.liver.push(['PCSK9 ↓', 'state']);
    if (ph.hmgcrMod < 0.97) b.liver.push(['합성 능력 ↓', 'state']); else if (ph.hmgcrMod > 1.03) b.liver.push(['합성 능력 ↑', 'issue']);
    if (ph.bileMod < 0.97) b.liver.push(['담즙산 ↓', 'issue']);
    if (app.s && app.s.sfa > 0.5) b.liver.push(['포화지방 부하', 'issue']);
    if (dr.statin) b.liver.push([`① 스타틴 ${dr.statin === 2 ? '고강도' : '중강도'}`, 'drug']);
    if (dr.pcsk9) b.liver.push(['③ PCSK9 항체', 'drug']);
    if (dr.incl) b.liver.push(['④ 인클리시란', 'drug']);
    if (dr.bemp) b.liver.push(['⑤ 벰페도산', 'drug']);
    if (dr.eze) b.gut.push(['② 에제티미브 ✕ NPC1L1', 'drug']);
    if (ph.ir > 0.05) b.fat.push(['인슐린 저항성', 'issue']);
    if (ph.visceral > 0.05) b.fat.push(['내장지방 ↑', 'issue']);
    if (ph.lplMod < 0.97) b.fat.push(['ApoC-III ↑ · LPL ↓', 'issue']);
    if (dr.fibrate) b.fat.push(['⑥ 피브레이트 → LPL ↑', 'drug']);
    if (dr.wl) b.fat.push(['⑦ 체중감량', 'drug']);
    if (ph.cetp > 1.05) b.road.push(['CETP 교환 ↑ → 작은 LDL', 'issue']);
    return b;
  }

  function drawParticle(p, x, y, alpha) {
    let r = R(p.type), col;
    const sd = app.d ? app.d.sd : 0;
    switch (p.type) {
      case 'CM': r = (4.5 + 5 * p.tg) * L.pr; col = C['p-cm']; break;
      case 'REM': col = C['p-rem']; break;
      case 'VLDL': r = (3.8 + 3.4 * p.tg) * L.pr; col = C['p-vldl']; break;
      case 'IDL': col = C['p-idl']; break;
      case 'LDL': r = R('LDL') * (1 - 0.25 * sd); col = C['p-ldl']; break;
      case 'HDL': r = (2.2 + 1.5 * p.chol) * L.pr; col = C['p-hdl']; break;
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 0.9; ctx.strokeStyle = C['p-stroke']; ctx.stroke();
    if (p.type === 'CM' || p.type === 'VLDL') { ctx.beginPath(); ctx.arc(x, y, r * 0.62 * Math.max(0.15, p.tg), 0, Math.PI * 2); ctx.fillStyle = C['p-core']; ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!road || !app.d) return;
    const d = app.d, ref = app.ref, s = app.s;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);
    ctx.fillStyle = C['panel-2']; ctx.fillRect(0, 0, L.W, L.H);
    // 격자
    ctx.fillStyle = C.line; for (let gx = 20; gx < L.W; gx += 40) for (let gy = 20; gy < L.H; gy += 40) ctx.fillRect(gx, gy, 1.2, 1.2);

    const bs = badgeSets();
    // 연결 경로
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5 + 1.6 * clamp(d.ffa, 0, 3); ctx.strokeStyle = C['p-ffa']; ctx.globalAlpha = 0.55;
    ctx.beginPath(); L.ffa.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = C['p-bile']; ctx.beginPath(); ctx.moveTo(L.bile[0][0], L.bile[0][1]); ctx.lineTo(L.bile[1][0], L.bile[1][1]); ctx.stroke();
    ctx.strokeStyle = C['p-cm']; ctx.beginPath(); ctx.moveTo(L.lymphFrom[0], L.lymphFrom[1]); ctx.lineTo(L.lymphRoad[0], L.lymphRoad[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L.liverExit[0], L.liverExit[1]); ctx.strokeStyle = C['p-vldl']; ctx.lineTo(L.liverExitRoad[0], L.liverExitRoad[1]); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    const ffaLbl = mode === 'land' ? '유리지방산 → 간 (문맥)' : 'FFA → 간';
    text(ffaLbl, L.ffa[1][0] + 10, L.ffa[0][1] - 8, { sz: L.fs - 2.5, c: C.muted, w: 600 });
    text('담즙', L.bile[0][0] + 9, (L.bile[0][1] + L.bile[1][1]) / 2 + 4, { sz: L.fs - 2.5, c: C.muted, w: 600 });

    // 정거장
    station('liver', '간', mode === 'land' ? '콜레스테롤 물류센터' : '물류센터', C.liver, C['liver-edge']);
    station('gut', '소장', mode === 'land' ? '지방·콜레스테롤 흡수' : '흡수', C.gut, C['gut-edge']);
    station('fat', '지방·근육 모세혈관', 'LPL이 TG를 내리는 하역장', C.fat, C['fat-edge']);
    station('tissue', '말초 조직', '', C.tissue, C['tissue-edge']);
    station('wall', '동맥 내막', '', C.intima, C['intima-edge']);

    // 간 계기
    {
      const land = mode === 'land';
      const b = L.box.liver, x = b.x + (land ? 11 : 8), w = b.w - (land ? 22 : 16); let y = b.y + (land ? 74 : 66);
      y = meter(x, y, w, land ? '합성 (HMGCR)' : '합성', d.fin.syn / ref.fin.syn) + 20;
      y = meter(x, y, w, 'LDL 수용체', d.Reff / ref.Reff) + (land ? 20 : 10);
      if (land) y = meter(x, y, w, '간 안 콜레스테롤', s.Hc / app.refS.Hc) + 10;
      badges(bs.liver, x, y, w);
    }
    // 소장
    {
      const b = L.box.gut, x = b.x + (mode === 'land' ? 11 : 8), w = b.w - (mode === 'land' ? 22 : 16); let y = b.y + (mode === 'land' ? 74 : 66);
      y = meter(x, y, w, mode === 'land' ? '콜레스테롤 흡수 (NPC1L1)' : 'NPC1L1', d.fin.abs / ref.fin.abs) + 18;
      const dig = s.gf1 + s.gf2 > 0.05;
      const st = dig ? `소화 중 · ${DIETS[app.diet]}` : '공복';
      const ssz = fitText(st, w, L.fs - 1.5, 600);
      text(st, x, y, { sz: ssz, w: 600, c: dig ? C.warn : C.muted });
      badges(bs.gut, x, y + 10, w);
    }
    // 지방·근육
    {
      const b = L.box.fat;
      if (mode === 'land') {
        const x = b.x + 190, w = b.w - 202;
        meter(x, b.y + 24, w, 'LPL 처리', d.Vmax / ref.Vmax);
        meter(x, b.y + 56, w, '지방분해 → FFA', d.ffa / ref.ffa);
        badges(bs.fat, b.x + 11, b.y + 58, 172);
      } else {
        const x = b.x + 186, w = b.w - 196;
        meter(x, b.y + 26, w, 'LPL 처리', d.Vmax / ref.Vmax);
        meter(x, b.y + 60, w, '지방분해→FFA', d.ffa / ref.ffa);
        badges(bs.fat, b.x + 10, b.y + 58, 170);
      }
    }
    // 말초
    {
      const b = L.box.tissue;
      wrap(mode === 'land' ? '세포막 · 스테로이드 호르몬 · 비타민 D 원료' : '세포막 · 호르몬 원료', b.x + 11, b.y + 52, b.w - 22, L.fs + 3, { sz: L.fs - 2, c: C['ink-2'] });
      wrap('남는 콜레스테롤 → HDL', b.x + 11, b.y + b.h - (mode === 'land' ? 34 : 40), b.w - 22, L.fs + 3, { sz: L.fs - 2, c: C['p-hdl'], w: 600 });
    }
    // 혈관벽
    {
      const b = L.box.wall; const inf = d.apoB / ref.apoB;
      const lbl = `LDL 유입 ×${inf.toFixed(2)}`;
      text(lbl, b.x + b.w - 11, b.y + 10 + L.title, { sz: L.fs - 1, al: 'right', fam: 'num', w: 600, c: inf > 1.1 ? C.bad : C['ink-2'] });
      text(mode === 'land' ? '잔류 LDL → 거품세포 · 거품세포는 누적 노출 표시' : '잔류 LDL → 거품세포', b.x + 11, b.y + 30 + L.title, { sz: L.fs - 2.5, c: C.muted });
      const nFoam = clamp(Math.floor(app.plaque / 3), 0, 7);
      for (let i = 0; i < nFoam; i++) {
        const fx0 = b.x + 30 + i * ((b.w - 60) / 7) + 14, fy0 = b.y + b.h - 22; const fr = (7 + Math.min(5, app.plaque / 8)) * L.pr;
        ctx.beginPath(); ctx.arc(fx0, fy0, fr, 0, Math.PI * 2); ctx.fillStyle = C['p-core']; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C['intima-edge']; ctx.stroke();
        ctx.fillStyle = C['p-ldl-ox']; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(fx0 + Math.cos(j * 1.7 + i) * fr * 0.45, fy0 + Math.sin(j * 1.7 + i) * fr * 0.45, 1.6 * L.pr, 0, Math.PI * 2); ctx.fill(); }
      }
      for (const w of wallDots) { ctx.beginPath(); ctx.arc(w.x, w.y, 2.8 * L.pr, 0, Math.PI * 2); ctx.fillStyle = w.ox ? C['p-ldl-ox'] : C['p-ldl']; ctx.globalAlpha = Math.min(1, w.age * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }

    // 도로
    const { x0, y0, x1, y1, r } = L.loop;
    const loopPath = () => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath(); };
    loopPath(); ctx.lineWidth = L.roadW + 4; ctx.strokeStyle = C['vessel-edge']; ctx.stroke();
    loopPath(); ctx.lineWidth = L.roadW; ctx.strokeStyle = C.vessel; ctx.stroke();
    loopPath(); ctx.lineWidth = 1.2; ctx.strokeStyle = C['vessel-line']; ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([]);
    // 구역 강조
    const zoneGlow = (k, col, a) => { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = L.roadW + 10; ctx.lineCap = 'round'; ctx.beginPath(); let on = false; for (const p of road.pts) { if (p.zone === k) { if (!on) { ctx.moveTo(p.x, p.y); on = true; } else ctx.lineTo(p.x, p.y); } else on = false; } ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; };
    zoneGlow('lpl', C['p-cm'], clamp(0.12 + 0.18 * (d.Vmax / ref.Vmax), 0.08, 0.5));
    // 방향 화살표
    ctx.fillStyle = C['vessel-edge'];
    for (let k = 0; k < 10; k++) { const p = at((k + 0.5) * road.len / 10); const ang = Math.atan2(p.nx, -p.ny); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }

    // LDL 수용체(도크)
    {
      const z = L.zone.dock; const n = clamp(Math.round(9 * d.Reff / ref.Reff), 2, 24);
      const pcskShare = clamp(0.22 * (d.pcsk9 * (1 - d.mAb)) / (ref.pcsk9 + 1e-9), 0, 0.85);
      const dx = x0 - L.roadW / 2 - 6; const ya = z.y + 6, yb = z.y + z.h - 6; docks = [];
      for (let i = 0; i < n; i++) {
        const y = ya + (yb - ya) * (n === 1 ? 0.5 : i / (n - 1)); docks.push([dx, y]);
        ctx.lineWidth = 2; ctx.strokeStyle = C['liver-edge'];
        ctx.beginPath(); ctx.moveTo(dx - 7, y); ctx.lineTo(dx - 1, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(dx + 2, y, 3.5 * L.pr, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        if ((i * 0.618) % 1 < pcskShare) { ctx.beginPath(); ctx.arc(dx - 4, y - 4, 2.6 * L.pr, 0, Math.PI * 2); ctx.fillStyle = C['p-pcsk9']; ctx.fill(); }
      }
    }

    // 입자
    const order = { CM: 0, VLDL: 1, REM: 2, IDL: 3, HDL: 4, LDL: 5 };
    const sorted = parts.slice().sort((a, b) => order[a.type] - order[b.type]);
    for (const p of sorted) {
      let x, y, a = 1;
      if (p.state === 'road') { [x, y] = posOf(p); }
      else if (p.anim) {
        const u = p.anim.t; [x, y] = lerpPath(p.anim.pts, p.state === 'enter' ? u : u * u * (3 - 2 * u));
        if (p.state === 'anim') a = 1 - Math.max(0, (u - 0.6) / 0.4);
        if (p.state === 'enter') a = Math.min(1, u * 2);
      } else continue;
      drawParticle(p, x, y, a);
    }
    for (const q of dots) {
      const [x, y] = lerpPath(q.pts, q.t);
      ctx.globalAlpha = q.fade ? 1 - q.t * 0.7 : (q.t > 0.85 ? (1 - q.t) / 0.15 : 1);
      ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.fillStyle = q.col; ctx.fill(); ctx.globalAlpha = 1;
    }

    // 중앙 계기
    {
      const [cx, cy] = L.center; const ck = fmtClock(s.t);
      text(`${ck.day}일째`, cx, cy - L.big - 6, { sz: L.fs, al: 'center', c: C.muted, w: 600 });
      text(ck.txt, cx, cy, { sz: L.big + 6, al: 'center', fam: 'num', w: 600 });
      const since = s.t - app.lastMeal; const dig = s.gf1 + s.gf2 > 0.05 || s.C > 8;
      const st = dig && since < 12 ? `식후 ${since.toFixed(1)}시간` : app.meals ? `공복 · 다음 식사 ${nextMeal(s.t)}` : '공복 유지';
      text(st, cx, cy + L.fs + 10, { sz: L.fs, al: 'center', c: dig ? C.warn : C['ink-2'], w: 600 });
      text(`인슐린 ×${(s.I / app.refS.I).toFixed(1)}   ·   1초 = ${SPEEDS.find((q) => q.v === app.speed).t}${app.playing ? '' : ' (정지)'}`, cx, cy + 2 * L.fs + 20, { sz: L.fs - 1.5, al: 'center', c: C.muted, fam: 'num' });
      if (bs.road.length) { ctx.font = font(600, L.fs - 2.5); const tw = ctx.measureText(bs.road[0][0]).width + 14; badges(bs.road, cx - tw / 2, cy + 3 * L.fs + 34, tw + 2); }
      if (d.sd > 0.3) text('작고 밀도 높은 LDL 증가', cx, cy + 3 * L.fs + (bs.road.length ? 72 : 40), { sz: L.fs - 2, al: 'center', c: C['p-ldl'], w: 600 });
    }
  }
  function nextMeal(t) { const h = hod(t); const nm = MEAL_HOURS.find((m) => m > h) ?? MEAL_HOURS[0]; const hh = Math.floor(nm); return `${String(hh).padStart(2, '0')}:${nm % 1 ? '30' : '00'}`; }

  /* --- 툴팁 --- */
  function hit(px, py) {
    for (const k of ['liver', 'gut', 'fat', 'tissue', 'wall']) { const b = L.box[k]; if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return k; }
    const { x0, y0, x1, y1 } = L.loop; const hw = L.roadW / 2 + 4;
    const inOuter = px >= x0 - hw && px <= x1 + hw && py >= y0 - hw && py <= y1 + hw; const inInner = px > x0 + hw && px < x1 - hw && py > y0 + hw && py < y1 - hw;
    return inOuter && !inInner ? 'road' : null;
  }
  function showTip(ev) {
    const rc = cv.getBoundingClientRect(); const px = (ev.clientX - rc.left) / scale, py = (ev.clientY - rc.top) / scale;
    const k = hit(px, py); hover = k === 'road' ? null : k;
    if (!k) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${INFO[k][0]}</b>${INFO[k][1]}`; tip.hidden = false;
    const bw = box.clientWidth, tw = Math.min(280, bw - 16); tip.style.maxWidth = tw + 'px';
    let lx = ev.clientX - rc.left + 14, ly = ev.clientY - rc.top + 14;
    if (lx + tw > bw - 8) lx = Math.max(8, ev.clientX - rc.left - tw - 14);
    const th = tip.offsetHeight; if (ly + th > box.clientHeight - 8) ly = Math.max(8, ev.clientY - rc.top - th - 14);
    tip.style.left = lx + 'px'; tip.style.top = ly + 'px';
  }
  cv.addEventListener('pointermove', showTip);
  cv.addEventListener('pointerdown', showTip);
  cv.addEventListener('pointerleave', () => { tip.hidden = true; hover = null; });

  new ResizeObserver(() => resize()).observe(box);
  return { resize, reset, update, draw, onMeal, counts: () => counts(), mode: () => mode };
})();

/* ---------- 차트 ---------- */
let chartDirty = true;
const chart = (() => {
  const cv = $('#chart'), ctx = cv.getContext('2d');
  const SER = [
    { k: 'ldl', t: 'LDL-C', c: 'p-ldl' }, { k: 'hdl', t: 'HDL-C', c: 'p-hdl' }, { k: 'tg', t: 'TG', c: 'p-vldl' }, { k: 'apob', t: 'apoB', c: 'p-pcsk9' },
  ];
  function draw() {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const m = { l: 46, r: 14, t: 12, b: 28 }; const pw = w - m.l - m.r, ph = h - m.t - m.b;
    const W = WINDOWS.find((q) => q.k === app.win).h; const tNow = app.s.t;
    const ta = Math.max(0, tNow - W), tb = Math.max(W, tNow);
    const vis = app.hist.filter((q) => q.t >= ta - 0.3);
    let ymax = 50;
    for (const sr of SER) if (app.series[sr.k]) for (const q of vis) ymax = Math.max(ymax, q[sr.k], q[sr.k + '0']);
    const tgI = targetInfo(); const showT = tgI && app.series[tgI.k];
    if (showT) ymax = Math.max(ymax, tgI.v * 1.15);
    ymax = Math.min(ymax * 1.08, 2500);
    const stepY = ymax > 1000 ? 250 : ymax > 500 ? 100 : ymax > 200 ? 50 : 25; ymax = Math.ceil(ymax / stepY) * stepY;
    const X = (t) => m.l + (t - ta) / (tb - ta) * pw, Y = (v) => m.t + ph - v / ymax * ph;
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= ymax + 1e-6; v += stepY) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.globalAlpha = v === 0 ? 1 : 0.6; ctx.beginPath(); ctx.moveTo(m.l, Y(v) + 0.5); ctx.lineTo(w - m.r, Y(v) + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), m.l - 8, Y(v));
    }
    ctx.save(); ctx.translate(12, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.font = '11px "IBM Plex Sans KR", sans-serif'; ctx.fillText('mg/dL', 0, 0); ctx.restore();
    // x축
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    if (W <= 24) {
      for (let t = Math.ceil((ta + 6) / 3) * 3 - 6; t <= tb + 1e-6; t += 3) { const x = X(t); ctx.fillStyle = C.line; ctx.fillRect(x, m.t + ph, 1, 4); ctx.fillStyle = C.muted; ctx.fillText(`${String(Math.round(hod(t))).padStart(2, '0')}시`, x, m.t + ph + 7); }
    } else {
      const every = W > 200 ? 7 : 1;
      for (let k = 0; ; k++) { const t = 18 + 24 * k; if (t > tb) break; if (t < ta) continue; const x = X(t); const day = k + 2; ctx.fillStyle = C.line; ctx.fillRect(x, m.t + ph, 1, 4); if ((day - 1) % every === 0 || every === 1) { ctx.fillStyle = C.muted; ctx.fillText(`${day}일`, x, m.t + ph + 7); } }
    }
    // 치료 목표선
    if (showT) {
      const y = Y(tgI.v) + 0.5; ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(w - m.r, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 11px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const lt = `목표 ${tgI.k === 'tg' ? '공복 TG' : 'LDL-C'} ${Math.round(tgI.v)}`; const lw = ctx.measureText(lt).width + 10;
      ctx.fillStyle = C.panel; ctx.fillRect(m.l + 6, y - 9, lw, 18); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.strokeRect(m.l + 6.5, y - 8.5, lw - 1, 17);
      ctx.fillStyle = C.accent; ctx.fillText(lt, m.l + 11, y + 0.5);
    }
    // 표시: 약물·식사
    const labelX = [];
    for (const mk of app.marks) {
      if (mk.t < ta || mk.t > tb) continue; const x = X(mk.t);
      if (mk.kind === 'meal' && W <= 168) { ctx.fillStyle = C['p-cm']; ctx.beginPath(); ctx.moveTo(x, m.t + ph - 1); ctx.lineTo(x - 3.5, m.t + ph - 7); ctx.lineTo(x + 3.5, m.t + ph - 7); ctx.closePath(); ctx.fill(); }
      if (mk.kind === 'drug' || mk.kind === 'dial') {
        ctx.strokeStyle = mk.kind === 'drug' ? C.accent : C.warn; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x + 0.5, m.t); ctx.lineTo(x + 0.5, m.t + ph); ctx.stroke(); ctx.setLineDash([]);
        let row = 0; while (labelX.some((q) => q.row === row && Math.abs(q.x - x) < 130)) row++; labelX.push({ x, row });
        ctx.fillStyle = mk.kind === 'drug' ? C.accent : C.warn; ctx.textAlign = x > w - 140 ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.font = '600 11px "IBM Plex Sans KR", sans-serif'; ctx.fillText(mk.label, x + (x > w - 140 ? -4 : 4), m.t + 2 + row * 14);
      }
    }
    // 선
    for (const sr of SER) {
      if (!app.series[sr.k]) continue; const col = C[sr.c];
      for (const twin of [true, false]) {
        const key = twin ? sr.k + '0' : sr.k;
        ctx.strokeStyle = col; ctx.lineWidth = twin ? 1.4 : 2.1; ctx.globalAlpha = twin ? 0.5 : 1; ctx.setLineDash(twin ? [5, 4] : []);
        ctx.beginPath(); let started = false;
        for (const q of vis) { const x = X(q.t), y = Y(Math.min(q[key], ymax)); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      const lq = vis[vis.length - 1]; if (lq) { ctx.beginPath(); ctx.arc(X(lq.t), Y(Math.min(lq[sr.k], ymax)), 3.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.panel; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    chartDirty = false;
  }
  function buildSeriesUI() {
    const el = $('#series'); el.innerHTML = '';
    for (const sr of SER) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ser'; b.id = 'ser-' + sr.k; b.style.setProperty('--c', `var(--${sr.c})`);
      b.innerHTML = `<i></i>${sr.t}`; b.setAttribute('aria-pressed', String(app.series[sr.k]));
      b.addEventListener('click', () => { app.series[sr.k] = !app.series[sr.k]; b.setAttribute('aria-pressed', String(app.series[sr.k])); chartDirty = true; });
      el.appendChild(b);
    }
  }
  return { draw, buildSeriesUI };
})();

/* ---------- UI ---------- */
function segButtons(el, items, cur, onPick, idPrefix) {
  el.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = it.t; b.id = idPrefix + i;
    b.setAttribute('aria-pressed', String(it.v === cur)); b.addEventListener('click', () => onPick(it.v)); el.appendChild(b);
  });
}
function syncSeg(el, items, cur) { [...el.children].forEach((b, i) => b.setAttribute('aria-pressed', String(items[i].v === cur))); }
const speedItems = SPEEDS.map((q) => ({ v: q.v, t: q.t }));
const winItems = WINDOWS.map((q) => ({ v: q.k, t: q.t }));

function buildUI() {
  segButtons($('#speed'), speedItems, app.speed, (v) => { app.speed = v; syncSeg($('#speed'), speedItems, v); }, 'spd');
  segButtons($('#win'), winItems, app.win, (v) => { app.win = v; syncSeg($('#win'), winItems, v); chartDirty = true; }, 'win');
  chart.buildSeriesUI();

  // 지질 행
  const lr = $('#lrows'); lr.innerHTML = '';
  for (const L of LIPIDS) {
    const row = document.createElement('div'); row.className = 'lrow'; row.dataset.k = L.k;
    const bands = L.bands.map(([a, b, cls]) => { const x0 = Math.min(a, L.max) / L.max * 100, x1 = Math.min(b, L.max) / L.max * 100; return x1 > x0 ? `<i class="band ${cls}" style="left:${x0}%;width:${x1 - x0}%"></i>` : ''; }).join('');
    row.innerHTML = `<div class="lname">${L.name}</div><div class="lval"><span class="num" data-v>–</span><small>mg/dL</small></div><span class="pill" data-p>–</span>
      <div class="lsub" data-s>${L.sub}</div><div class="ldelta" data-d></div>
      <div class="lbar">${bands}<b class="gh" data-g></b><b class="tk" data-tk hidden></b><b class="mk" data-m></b></div>
      <div class="ltgt" data-tg hidden></div>`;
    lr.appendChild(row);
  }
  // 계기
  const g = $('#gauges'); g.innerHTML = '';
  for (const G of GAUGES) { const r = document.createElement('div'); r.className = 'gauge'; r.dataset.k = G.k; r.innerHTML = `<span class="gl">${G.t}</span><span class="gt"><i class="gf"></i></span><span class="gv">100%</span>`; g.appendChild(r); }
  // 약물 목록
  const dg = $('#rxList'); dg.innerHTML = '';
  for (const D of DRUGS) {
    const el = document.createElement('div'); el.className = 'rx-row'; el.dataset.k = D.k;
    let ctl;
    if (D.seg) ctl = `<div class="seg" role="group" aria-label="${D.name} 강도">${D.seg.map((t, i) => `<button type="button" id="statin${i}" data-i="${i}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>`;
    else ctl = `<button type="button" class="toggle" id="drug-${D.k}" aria-pressed="false" aria-label="${D.name} 사용"><span class="tr"></span></button>`;
    el.innerHTML = `<button type="button" class="rx-pick" id="pick-${D.k}" aria-pressed="false"><span class="rx-num">${DRUGS.indexOf(D) + 1}</span><span class="rx-name">${D.name}<small>${D.site}</small></span></button>${ctl}`;
    dg.appendChild(el);
    el.querySelector('.rx-pick').addEventListener('click', () => selectDrug(D.k));
    if (D.seg) el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { selectDrug('statin'); setDrug('statin', +b.dataset.i); }));
    else el.querySelector('.toggle').addEventListener('click', () => { selectDrug(D.k); setDrug(D.k, !app.drugs[D.k]); });
  }
  document.querySelectorAll('#rxSvg .pin').forEach((p) => {
    const go = () => selectDrug(p.dataset.drug);
    p.addEventListener('click', go);
    p.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  });
  $('#rxDetail').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-apply]'); if (!b) return;
    const k = app.sel; if (k === 'statin') setDrug('statin', app.drugs.statin ? 0 : 2); else setDrug(k, !app.drugs[k]);
  });
  $('#mechActs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = SCEN[app.scen].actions[+b.dataset.act];
    if (a.diet) { const on = app.diet === a.diet; app.diet = on ? SCEN[app.scen].diet : a.diet; $('#diet').value = app.diet; app.marks.push({ t: app.s.t, kind: 'drug', label: on ? '식사 원래대로' : DIETS[a.diet] + ' 시작' }); chartDirty = true; scheduleProj(); syncDrugs(); return; }
    for (const k in a.d) { const v = a.d[k]; const on = k === 'statin' ? app.drugs.statin === v : app.drugs[k] === v; selectDrug(k); setDrug(k, on ? (k === 'statin' ? 0 : false) : v); }
  });
  // 다이얼
  const dl = $('#dials'); dl.innerHTML = '';
  for (const D of DIALS) {
    const el = document.createElement('div'); el.className = 'dial';
    el.innerHTML = `<div class="dial-top"><label class="dial-name" for="dial-${D.k}">${D.t}<small>${D.h}</small></label><output id="out-${D.k}"></output></div>
      <input type="range" id="dial-${D.k}" min="${D.min}" max="${D.max}" step="0.01">`;
    dl.appendChild(el);
    el.querySelector('input').addEventListener('input', (ev) => {
      app.phys[D.k] = +ev.target.value; app.custom = !samePhys(); syncDials(); renderMech(); scheduleProj();
      const last = app.marks[app.marks.length - 1];
      if (!(last && last.kind === 'dial' && app.s.t - last.t < 2)) app.marks.push({ t: app.s.t, kind: 'dial', label: '다이얼 조정' });
      chartDirty = true;
    });
  }

  document.querySelectorAll('.scn').forEach((b) => b.addEventListener('click', () => applyScenario(b.dataset.scn)));
  $('#play').addEventListener('click', () => { app.playing = !app.playing; syncPlay(); });
  $('#restart').addEventListener('click', () => { app.drugs = scenDrugs(app.scen); app.diet = SCEN[app.scen].diet; $('#diet').value = app.diet; syncDrugs(); restart(); });
  $('#skip').addEventListener('click', () => { advance(336); viz.reset(); scheduleProj(); });
  $('#eatNow').addEventListener('click', () => eat(true));
  $('#diet').addEventListener('change', (ev) => { app.diet = ev.target.value; scheduleProj(); syncDrugs(); });
  $('#autoMeal').addEventListener('change', (ev) => { app.meals = ev.target.checked; scheduleProj(); });
  $('#resetDials').addEventListener('click', () => { app.phys = Object.assign({}, M.PHYS, SCEN[app.scen].phys); app.custom = false; syncDials(); renderMech(); scheduleProj(); app.marks.push({ t: app.s.t, kind: 'dial', label: '시나리오 값' }); });
}

/* ---------- 약물 작용 지점 ---------- */
function targetInfo() {
  const sc = SCEN[app.scen]; const t = sc && sc.target; if (!t || !app.baseline) return null;
  const v = t.pct ? app.baseline[t.k] * (1 - t.pct) : t.v;
  return { k: t.k, v, label: t.label, fasting: !!t.fasting };
}
function selectDrug(k) { app.sel = k; syncDrugs(); renderRxDetail(); scheduleProj(); }
function project(drugs, days) {
  const s = JSON.parse(JSON.stringify(app.s)); const dt = 0.1; const n = Math.round((days || 28) * 24 / dt); let fast = null;
  for (let i = 0; i < n; i++) {
    const h0 = hod(s.t), h1 = hod(s.t + dt);
    if (app.meals) for (const mt of MEAL_HOURS) if (crossed(h0, h1, mt)) M.eat(s, app.diet);
    if (crossed(h0, h1, 7.4)) fast = s.V + s.C;
    M.step(s, app.phys, drugs, dt);
  }
  const d = M.derive(s, app.phys, drugs);
  return { ldl: d.LDLC, tg: app.meals && fast != null ? fast : d.TG, hdl: d.HDLC, apob: d.apoB };
}
let projTimer = 0;
function scheduleProj() {
  clearTimeout(projTimer);
  projTimer = setTimeout(() => {
    if (!app.s) return;
    const k = app.sel, cur = Object.assign({}, app.drugs);
    const alt = Object.assign({}, cur); if (k === 'statin') alt.statin = cur.statin ? 0 : 2; else alt[k] = !cur[k];
    app.proj = { none: project(NODRUG), cur: project(cur), alt: project(alt), k, adding: k === 'statin' ? !cur.statin : !cur[k] };
    app.projDay = Math.floor(app.s.t / 24);
    renderRxProj();
  }, 180);
}
function fmtD(v, base, lowerGood) {
  const p = (v - base) / base * 100; if (Math.abs(p) < 0.5) return '<span class="dd">±0%</span>';
  const good = lowerGood ? p < 0 : p > 0;
  return `<span class="dd ${good ? 'good' : 'bad'}">${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(0)}%</span>`;
}
function renderRxProj() {
  const el = document.getElementById('rxProj'); const P = app.proj; if (!el || !P || P.k !== app.sel) return;
  const D = DRUGS.find((q) => q.k === P.k);
  const row = (name, r, ref, cls) => `<tr class="${cls || ''}"><td>${name}</td><td>${Math.round(r.ldl)}${ref ? fmtD(r.ldl, ref.ldl, true) : ''}</td><td>${Math.round(r.tg)}${ref ? fmtD(r.tg, ref.tg, true) : ''}</td><td>${Math.round(r.hdl)}${ref ? fmtD(r.hdl, ref.hdl, false) : ''}</td></tr>`;
  const altName = P.k === 'statin' ? (P.adding ? '+ 고강도 스타틴' : '− 스타틴 중단') : `${P.adding ? '+' : '−'} ${D.name} ${P.adding ? '추가' : '중단'}`;
  const tg = targetInfo(); let tgtLine = '';
  if (tg) { const curV = tg.k === 'ldl' ? P.cur.ldl : P.cur.tg; const altV = tg.k === 'ldl' ? P.alt.ldl : P.alt.tg; tgtLine = `<p class="rx-meta"><b>목표</b>${tg.label.split(' (')[0]} — 지금 조합 ${curV < tg.v ? '도달' : '미달'}, ${altName.replace(/^[+−] /, '')} 시 ${altV < tg.v ? '도달' : '미달'}</p>`; }
  el.innerHTML = `<p class="eyebrow">4주 뒤 예상 · 지금 상태에서 출발 (공복 TG)</p>
    <div style="overflow-x:auto"><table><thead><tr><th></th><th>LDL-C</th><th>TG</th><th>HDL-C</th></tr></thead><tbody>
    ${row('약 없이', P.none)}${row('지금 조합', P.cur, P.none, 'cur')}${row(altName, P.alt, P.cur)}</tbody></table></div>${tgtLine}`;
}
function renderRxDetail() {
  const D = DRUGS.find((q) => q.k === app.sel); const on = D.k === 'statin' ? app.drugs.statin > 0 : app.drugs[D.k];
  const idx = DRUGS.indexOf(D) + 1;
  $('#rxDetail').innerHTML = `<div><p class="eyebrow">${idx} · ${D.site} · ${D.mode === 'block' ? '막는 약' : '강화하는 개입'}</p><h3>${D.name}</h3></div>
    <ol class="steps">${D.steps.map((t) => `<li><span>${t}</span></li>`).join('')}</ol>
    <div class="chips"><span class="hint" style="align-self:center">가이드 효과</span>${D.effect.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
    <div class="rx-proj" id="rxProj"><p class="eyebrow">4주 뒤 예상 계산 중…</p></div>
    <button class="btn ${on ? '' : 'btn-primary'}" type="button" data-apply>${on ? '이 약 끄기' : D.k === 'statin' ? '고강도 스타틴 켜기' : '이 약 켜기'}</button>
    <p class="rx-meta"><b>대표 약물</b>${D.products}</p>
    <p class="rx-meta"><b>주의</b>${D.caution}</p>
    <p class="rx-model">${D.model}</p>`;
  renderRxProj();
}
let ldlrN = -1;
function svgUpdate() {
  const d = app.d, ref = app.ref, s = app.s; if (!d) return;
  const r = (a, b) => (b ? a / b : 1);
  const pct = (v) => Math.round(v * 100) + '%';
  const syn = r(d.fin.syn, ref.fin.syn), abs = r(d.fin.abs, ref.fin.abs), ffa = r(d.ffa, ref.ffa), lpl = r(d.Vmax, ref.Vmax), sv = r(d.SV, ref.SV);
  const pc = r(d.pcsk9 * (1 - d.mAb), ref.pcsk9), ldlr = r(d.Reff, ref.Reff), hc = r(s.Hc, app.refS.Hc), sre = r(d.srebp, ref.srebp);
  const set = (id, attr, v) => { const e = document.getElementById(id); if (e) e.setAttribute(attr, v); };
  const txt = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  set('sv-synArrow', 'stroke-width', (1.2 + 3 * clamp(syn, 0, 2)).toFixed(2)); txt('sv-synTxt', '합성 ' + pct(syn));
  set('sv-absArrow', 'stroke-width', (1.2 + 3 * clamp(abs, 0, 2)).toFixed(2)); set('sv-remArrow', 'stroke-width', (1.2 + 3 * clamp(abs, 0, 2)).toFixed(2)); txt('sv-absTxt', '장 흡수 ' + pct(abs));
  set('sv-ffaArrow', 'stroke-width', (1.2 + 2.5 * clamp(ffa, 0, 3)).toFixed(2)); txt('sv-ffaTxt', '간으로 가는 유리지방산 ' + pct(ffa));
  txt('sv-irTxt', `인슐린 저항성 ${Math.round(d.irEff * 100)}% · 내장지방 ${Math.round(d.visEff * 100)}%`);
  set('sv-vldlArrow', 'stroke-width', (1.2 + 2.5 * clamp(sv, 0, 3)).toFixed(2));
  txt('sv-lplTxt', 'TG 분해 능력 ' + pct(lpl)); txt('sv-lplNote', app.drugs.fibrate ? '⑥ ApoC-III ↓ → LPL ↑' : app.phys.lplMod < 0.97 ? 'ApoC-III ↑가 LPL을 억제' : 'ApoC-III가 LPL을 조절');
  set('sv-degArrow', 'stroke-width', (0.8 + 2.4 * clamp(pc, 0, 2.5)).toFixed(2)); txt('sv-pcskTxt', 'PCSK9 작용 ' + pct(pc));
  set('sv-poolFill', 'width', (140 * clamp(hc / 2, 0.02, 1)).toFixed(1)); txt('sv-poolTxt', pct(hc));
  set('sv-srebp', 'fill-opacity', clamp(0.25 + 0.4 * sre, 0.2, 1).toFixed(2)); txt('sv-srebpTxt', '활성 ' + pct(sre));
  txt('sv-ldlrTxt', '수용체 ' + pct(ldlr)); txt('sv-ldlc', 'LDL-C ' + Math.round(d.LDLC));
  const n = clamp(Math.round(6 * ldlr), 2, 16);
  if (n !== ldlrN) {
    ldlrN = n; const g = document.getElementById('sv-ldlr'); let h = ''; const ya = 70, yb = 214;
    for (let i = 0; i < n; i++) { const y = n === 1 ? (ya + yb) / 2 : ya + (yb - ya) * i / (n - 1); h += `<path class="rcp" d="M596 ${y.toFixed(1)} L604 ${y.toFixed(1)} M604 ${y.toFixed(1)} L610 ${(y - 5).toFixed(1)} M604 ${y.toFixed(1)} L610 ${(y + 5).toFixed(1)}"></path>`; }
    g.innerHTML = h;
  }
}
function syncDrugs() {
  const isOn = (k) => (k === 'statin' ? app.drugs.statin > 0 : !!app.drugs[k]);
  document.querySelectorAll('.rx-row').forEach((el) => {
    const k = el.dataset.k; el.classList.toggle('on', isOn(k)); el.classList.toggle('sel', k === app.sel);
    el.querySelector('.rx-pick').setAttribute('aria-pressed', String(k === app.sel));
    if (k === 'statin') el.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === app.drugs.statin)));
    else el.querySelector('.toggle').setAttribute('aria-pressed', String(!!app.drugs[k]));
  });
  document.querySelectorAll('#rxSvg .pin').forEach((p) => { const k = p.dataset.drug; p.classList.toggle('on', isOn(k)); p.classList.toggle('sel', k === app.sel); });
  for (const k of ['statin', 'bemp', 'eze', 'incl', 'pcsk9']) { const x = document.getElementById('x-' + k); if (x) x.toggleAttribute('hidden', !isOn(k)); }
  const tgt = { statin: '#sv-hmgcr', bemp: '#sv-acly', eze: '#sv-npc', incl: '#sv-mrna', pcsk9: '#sv-pcsk9' };
  for (const k in tgt) { const e = document.querySelector(tgt[k]); if (e) e.classList.toggle('blocked', isOn(k)); }
  document.getElementById('sv-ppar').classList.toggle('boost', isOn('fibrate'));
  document.getElementById('sv-lplBox').classList.toggle('boost', isOn('fibrate'));
  document.getElementById('sv-fat').classList.toggle('boost', isOn('wl'));
  document.getElementById('sv-ab').toggleAttribute('hidden', !isOn('pcsk9'));
  const acts = SCEN[app.scen].actions || [];
  document.querySelectorAll('#mechActs [data-act]').forEach((b) => {
    const a = acts[+b.dataset.act]; if (!a) return;
    const on = a.diet ? app.diet === a.diet : Object.keys(a.d).every((k) => (k === 'statin' ? app.drugs.statin === a.d[k] : app.drugs[k] === a.d[k]));
    b.setAttribute('aria-pressed', String(on));
  });
  if (document.getElementById('rxDetail').firstChild) { const D = DRUGS.find((q) => q.k === app.sel); const b = document.querySelector('#rxDetail [data-apply]'); if (b) { const on = isOn(D.k); b.textContent = on ? '이 약 끄기' : D.k === 'statin' ? '고강도 스타틴 켜기' : '이 약 켜기'; b.classList.toggle('btn-primary', !on); } }
}
function samePhys() { const p = Object.assign({}, M.PHYS, SCEN[app.scen].phys); return Object.keys(p).every((k) => Math.abs(p[k] - app.phys[k]) < 0.005); }
function setDrug(k, v) {
  if ((k === 'statin' ? app.drugs.statin : !!app.drugs[k]) === v) return;
  app.drugs[k] = v; syncDrugs();
  const label = k === 'statin' ? (v ? `① 스타틴 ${v === 2 ? '고강도' : '중강도'}` : '① 스타틴 중단') : `${DRUG_NUM[k]} ${DRUGS.find((q) => q.k === k).name} ${v ? '시작' : '중단'}`;
  app.marks.push({ t: app.s.t, kind: 'drug', label }); chartDirty = true;
  scheduleProj();
}
function syncDials() {
  const base = Object.assign({}, M.PHYS, SCEN[app.scen].phys);
  for (const D of DIALS) {
    const inp = $('#dial-' + D.k), out = $('#out-' + D.k); inp.value = app.phys[D.k];
    out.textContent = Math.round(app.phys[D.k] * 100) + '%';
    out.classList.toggle('moved', Math.abs(app.phys[D.k] - base[D.k]) > 0.005);
  }
}
function syncPlay() { $('#play').textContent = app.playing ? '일시정지' : '재생'; }
function renderMech() {
  const sc = SCEN[app.scen];
  $('#mechGroup').textContent = sc.group; $('#mechTitle').textContent = sc.title; $('#mechSum').textContent = sc.sum;
  $('#mechSteps').innerHTML = sc.steps.map((t) => `<li><span>${t}</span></li>`).join('');
  $('#mechPattern').innerHTML = `<span class="hint" style="align-self:center">전형적 변화</span>` + sc.pattern.map((t) => `<span class="chip">${t}</span>`).join('');
  $('#mechPoint').innerHTML = sc.point; $('#mechRef').textContent = '출처: ' + sc.ref;
  $('#customNote').hidden = !app.custom;
  const acts = $('#mechActs');
  if (sc.actions) { acts.hidden = false; acts.innerHTML = `<span class="hint">가이드가 제시한 다음 단계를 바로 적용해 보세요 (다시 누르면 해제)</span>` + sc.actions.map((a, i) => `<button type="button" class="btn act" data-act="${i}" aria-pressed="false">${a.t}</button>`).join(''); }
  else { acts.hidden = true; acts.innerHTML = ''; }
}
function applyScenario(id) {
  const sc = SCEN[id]; app.scen = id;
  app.phys = Object.assign({}, M.PHYS, sc.phys); app.diet = sc.diet; app.meals = sc.meals; app.speed = sc.speed; app.win = sc.win;
  app.drugs = scenDrugs(id); app.custom = false;
  if (sc.sel) app.sel = sc.sel;
  document.querySelectorAll('.scn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scn === id)));
  $('#diet').value = app.diet; $('#autoMeal').checked = app.meals;
  syncSeg($('#speed'), speedItems, app.speed); syncSeg($('#win'), winItems, app.win);
  syncDials(); renderMech(); syncDrugs(); renderRxDetail();
  restart();
  try { localStorage.setItem('chol-sim-scen', id); } catch (e) { /* 저장소 없음 */ }
}

const statusOf = (L, v) => L.bands.find(([a, b]) => v >= a && v < b) || L.bands[L.bands.length - 1];
function updatePanels() {
  const d = app.d, e = app.e, s = app.s;
  const vals = { ldl: d.LDLC, nonhdl: d.nonHDL, apob: d.apoB, hdl: d.HDLC, tg: d.TG };
  const base = { ldl: e.LDLC, nonhdl: e.nonHDL, apob: e.apoB, hdl: e.HDLC, tg: e.TG };
  for (const L of LIPIDS) {
    const row = document.querySelector(`.lrow[data-k="${L.k}"]`); const v = vals[L.k], b0 = base[L.k];
    row.querySelector('[data-v]').textContent = Math.round(v);
    const st = statusOf(L, v); const pill = row.querySelector('[data-p]'); pill.className = 'pill ' + st[2]; pill.textContent = st[3];
    const diff = Math.round(v - b0); const cls = diff === 0 ? '' : ((diff > 0) === L.higherBad ? 'up' : 'down');
    row.querySelector('[data-d]').innerHTML = `정상 기준 ${Math.round(b0)} · <b class="${cls}">${diff > 0 ? '▲' : diff < 0 ? '▼' : '±'}${Math.abs(diff)}</b>`;
    row.querySelector('[data-m]').style.left = clamp(v / L.max * 100, 0, 100) + '%';
    row.querySelector('[data-g]').style.left = clamp(b0 / L.max * 100, 0, 100) + '%';
    if (L.k === 'tg') row.querySelector('[data-s]').textContent = app.meals ? `공복 TG ${Math.round(app.fastTG)} (정상 기준 ${Math.round(app.fastTG0)})` : '중성지방 (공복 유지)';
    const ti = targetInfo(); const tk = row.querySelector('[data-tk]'), tl = row.querySelector('[data-tg]');
    if (ti && ti.k === L.k) {
      const cmp = ti.fasting && app.meals ? app.fastTG : v; const okT = cmp < ti.v;
      row.classList.add('has-tgt'); tk.hidden = false; tk.style.left = clamp(ti.v / L.max * 100, 0, 100) + '%';
      tl.hidden = false; tl.classList.toggle('ok', okT);
      tl.textContent = `목표 ${ti.label} → ${Math.round(ti.v)} 미만 · ${okT ? '도달' : `미달 (${Math.round(cmp - ti.v + 1)} 더 낮춰야 함)`}`;
    } else { row.classList.remove('has-tgt'); tk.hidden = true; tl.hidden = true; }
  }
  const al = $('#alert'); let msg = '';
  if (d.TG >= 1000) msg = 'TG 1,000 mg/dL 이상: 급성 췌장염 위험이 크게 오르는 구간입니다. 빠른 TG 감소가 우선입니다(가이드 1.4절).';
  else if (d.TG >= 500) msg = 'TG 500 mg/dL 이상: 췌장염 위험이 커지는 구간입니다. 음주·식이·이차성 원인 교정과 약물을 고려합니다(가이드 1.4절).';
  else if (d.LDLC >= 190) msg = 'LDL-C 190 mg/dL 이상: 가족성 고콜레스테롤혈증과 이차성 원인을 평가하고 적극적인 약물치료를 검토합니다(가이드 5.1절).';
  al.hidden = !msg; al.textContent = msg;
  const ck = fmtClock(s.t); $('#clockSide').textContent = `${ck.day}일째 ${ck.txt}`;

  for (const G of GAUGES) {
    const r = document.querySelector(`.gauge[data-k="${G.k}"]`); const v = G.f(d, s) / (G.f(app.ref, app.refS) || 1);
    const lv = clamp(Math.log2(Math.max(v, 0.01)), -2, 2); const pos = 50 + lv * 25;
    const f = r.querySelector('.gf'); f.style.left = Math.min(50, pos) + '%'; f.style.width = Math.max(0.8, Math.abs(pos - 50)) + '%'; f.classList.toggle('lo', v < 0.97);
    r.querySelector('.gv').textContent = Math.round(v * 100) + '%';
  }
  const c = viz.counts(); const sd = d.sd > 0.3;
  $('#legend').innerHTML = [
    ['킬로미크론', 'p-cm', c.CM, 13], ['VLDL', 'p-vldl', c.VLDL, 11], ['IDL', 'p-idl', c.IDL, 9], ['잔여물', 'p-rem', c.REM, 9],
    [sd ? 'LDL (작은 입자↑)' : 'LDL', 'p-ldl', c.LDL, 8], ['HDL', 'p-hdl', c.HDL, 7], ['PCSK9', 'p-pcsk9', null, 7], ['유리지방산', 'p-ffa', null, 5],
  ].map(([t, col, n, sz]) => `<span class="lg"><i style="--c:var(--${col});--s:${sz}px"></i>${t}${n === null ? '' : `<b>${n}</b>`}</span>`).join('');
}

/* ---------- 루프 ---------- */
let last = performance.now(), lastPanel = 0;
function frame(now) {
  const rdt = Math.min(0.1, (now - last) / 1000); last = now;
  if (app.playing) advance(app.speed * rdt);
  app.d = M.derive(app.s, app.phys, app.drugs); app.e = M.derive(app.tw, M.PHYS, NODRUG);
  if (app.playing) viz.update(rdt);
  viz.draw();
  if (now - lastPanel > 120) {
    updatePanels(); svgUpdate(); if (chartDirty) chart.draw(); lastPanel = now;
    if (Math.floor(app.s.t / 24) !== app.projDay && app.projDay >= 0) { app.projDay = Math.floor(app.s.t / 24); scheduleProj(); }
  }
  requestAnimationFrame(frame);
}

function init() {
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const recolor = () => { readColors(); chartDirty = true; };
  mq.addEventListener ? mq.addEventListener('change', recolor) : mq.addListener(recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  buildUI();
  viz.resize();
  let start = 'normal';
  try { const v = localStorage.getItem('chol-sim-scen'); if (v && SCEN[v]) start = v; } catch (e) { /* 저장소 없음 */ }
  applyScenario(start);
  syncPlay();
  if (!app.playing) { viz.update(0); }
  new ResizeObserver(() => { chartDirty = true; }).observe($('#chart'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { chartDirty = true; });
  requestAnimationFrame(frame);
}
init();
})();
