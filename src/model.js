/* ===== 콜레스테롤·지단백 구획 모델 (교육용 근사) =====
   단위: 혈중 농도 mg/dL, 시간 h. 간 내부 값은 정상=1로 정규화. */
const Model = (() => {
  const PHYS = { ldlrMod: 1, pcsk9Mod: 1, hmgcrMod: 1, bileMod: 1, visceral: 0, ir: 0, lplMod: 1, cetp: 1 };
  const MEALS = {
    normal: { fat: 1.0, chol: 0.34, sfa: 0.3, carb: 1.0 },
    egg:    { fat: 1.0, chol: 0.75, sfa: 0.3, carb: 0.8 },
    sfa:    { fat: 1.4, chol: 0.55, sfa: 1.0, carb: 0.9 },
    lowfat: { fat: 0.3, chol: 0.2, sfa: 0.1, carb: 1.1 },
  };
  const FAT_SCALE = 1600;   // 식사 1회 지방 → 킬로미크론 TG(mg/dL 상당)
  const KA = 0.45;         // 지방·콜레스테롤 흡수 속도
  const KC = 1.2;          // 탄수화물 흡수 속도
  const STATIN_INH = [0, 0.53, 0.78];

  function init() {
    return { t: 0, C: 0, V: 100, Pv: 10, L: 80, H: 55, Hc: 1, Rx: 1, I: 1, TGs: 100, sfa: 0,
      gf1: 0, gf2: 0, gc1: 0, gc2: 0, gs1: 0, gs2: 0, gk1: 0, gk2: 0 };
  }

  function eat(s, type) {
    const m = MEALS[type] || MEALS.normal;
    s.gf1 += m.fat; s.gc1 += m.chol; s.gs1 += m.sfa; s.gk1 += m.carb;
  }

  // 체중감량: 내장지방·인슐린 저항성을 줄인 유효 생리값
  function eff(ph, dr) { return dr.wl ? Object.assign({}, ph, { visceral: ph.visceral * 0.5, ir: ph.ir * 0.55 }) : ph; }

  // 현재 상태에서 모든 유도량·플럭스 계산
  function derive(s, ph0, dr) {
    const ph = eff(ph0, dr);
    const ir = ph.ir, statInh = STATIN_INH[dr.statin || 0];
    const npc = dr.eze ? 0.45 : 1;
    const mAb = dr.pcsk9 ? 0.88 : 0;
    const fib = !!dr.fibrate;

    const I0 = 1 + 1.6 * ir;
    const sig = s.I * (1 - ir);
    const ffa = (1 + 0.6 * ph.visceral) * clamp(1.45 - 0.45 * sig, 0.45, 3);
    const dnl = 0.7 + 0.3 * s.I;
    const SV = 31.5 * (fib ? 0.88 : 1) * (0.25 + 0.5 * ffa + 0.25 * dnl);
    const sp = Math.pow(SV / 30, 0.6);

    const lplEnz = ph.lplMod * (fib ? 1.3 : 1);
    const Vmax = 390 * lplEnz * (1 + 0.25 * clamp(sig - 1, -0.6, 2));
    const D = 1200 + 5 * s.C + s.V;
    const fluxC = Vmax * 12 * s.C / D;
    const fluxV = Vmax * s.V / D;
    const kfrac = fluxV / Math.max(s.V, 1);

    const srebp = clamp(Math.exp(-3.5 * (s.Hc - 1)), 0.2, 5);
    const pcsk9 = ph.pcsk9Mod * Math.pow(srebp, 0.3) * (dr.incl ? 0.13 : 1);
    const w = 1.0;
    const Reff = s.Rx * (1 + w) / (1 + w * pcsk9 * (1 - mAb));
    const RxT = ph.ldlrMod * Math.pow(srebp, 0.9) * (1 - 0.12 * (s.sfa - 0.29));
    const fconv = 0.5 * Math.sqrt(2 / (1 + Reff));
    const idl = kfrac * s.Pv;
    const ldlProd = idl * fconv;
    const ldlClear = (0.01406 * Reff + 0.00469) * s.L;

    // 간 콜레스테롤 수지 (정상 공복 = 유입 1.0 / 유출 1.0 per h)
    const bemp = dr.bemp ? 0.42 : 0;
    const hmgcr = ph.hmgcrMod * (1 - statInh) * (1 - bemp) * Math.pow(srebp, 0.8);
    const dietChol = KA * s.gc2 * npc;
    const fin = {
      syn: 0.32 * hmgcr,
      ldl: 0.22 * Reff * s.L / 80,
      idl: 0.08 * idl * (1 - fconv) / 1.5,
      abs: 0.2375 * npc + dietChol,
      hdl: 0.10 * s.H / 55,
    };
    const acat = 1 - 0.4 * (s.sfa - 0.29);
    const fout = {
      vldl: 0.25 * sp,
      bile: 0.30 * ph.bileMod * s.Hc,
      biliary: 0.20 * ph.bileMod * s.Hc,
      ester: 0.25 * acat * s.Hc,
    };

    const apoA = 1 + 0.05 * (s.sfa - 0.29);
    const PH = 0.66 * apoA * (0.85 + 0.15 * Math.min(lplEnz, 1.6));
    const kH = 0.012 * (0.8 + 0.2 * ph.cetp * Math.pow(Math.max(s.TGs, 20) / 100, 0.7)) * (1 + 0.1 * ir);

    const sd = clamp(((s.TGs - 150) / 250) * (0.6 + 0.4 * ph.cetp), 0, 1);
    const LDLC = s.L * 1.28 * (1 - 0.2 * sd);
    const TG = s.V + s.C;
    const nonHDL = LDLC + s.V / 5 + s.C / 10;
    const apoB = s.L + s.Pv;

    return { I0, sig, ffa, dnl, SV, sp, lplEnz, Vmax, fluxC, fluxV, kfrac, srebp, pcsk9, Reff, RxT, fconv, idl,
      ldlProd, ldlClear, hmgcr, dietChol, fin, fout, acat, PH, kH, sd, LDLC, TG, nonHDL, apoB,
      HDLC: s.H, TC: nonHDL + s.H, npc, mAb, statInh, bemp, irEff: ph.ir, visEff: ph.visceral };
  }

  function step(s, ph0, dr, dt) {
    const d = derive(s, ph0, dr);
    const ph = eff(ph0, dr);
    // 장 흡수 구획 (감마-2 지연)
    const af = KA * s.gf2, ac = KA * s.gc2, as = KA * s.gs2, ak = KC * s.gk2;
    s.gf1 -= KA * s.gf1 * dt; s.gf2 += (KA * s.gf1 - af) * dt;
    s.gc1 -= KA * s.gc1 * dt; s.gc2 += (KA * s.gc1 - ac) * dt;
    s.gs1 -= KA * s.gs1 * dt; s.gs2 += (KA * s.gs1 - as) * dt;
    s.gk1 -= KC * s.gk1 * dt; s.gk2 += (KC * s.gk1 - ak) * dt;

    const IT = d.I0 + 6 * ak * (1 + 1.5 * ph.ir);
    s.I += (IT - s.I) / 0.4 * dt;
    s.C += (af * FAT_SCALE - d.fluxC - 0.3 * s.C) * dt;
    s.V += (d.SV - d.fluxV - 0.015 * s.V) * dt;
    if (s.V > 6000) s.V = 6000;
    s.Pv += (d.sp * 3.0 - d.idl) * dt;
    s.L += (d.ldlProd - d.ldlClear) * dt;
    s.H += (d.PH - d.kH * s.H) * dt;
    const In = d.fin.syn + d.fin.ldl + d.fin.idl + d.fin.abs + d.fin.hdl;
    const Out = d.fout.vldl + d.fout.bile + d.fout.biliary + d.fout.ester;
    s.Hc += (In - Out) / 12 * dt;
    s.Rx += (d.RxT - s.Rx) / 10 * dt;
    s.TGs += ((s.V + s.C) - s.TGs) / 24 * dt;
    s.sfa += (as * 8 - s.sfa) / 72 * dt;
    if (s.C < 0) s.C = 0;
    s.t += dt;
    return d;
  }

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  return { PHYS, MEALS, init, eat, derive, step, clamp };
})();
if (typeof module !== 'undefined') module.exports = Model;
