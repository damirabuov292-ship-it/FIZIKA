// Бастапқы контентті (JUZ40 «Физика. 2-ай 2-апта») supabase/seed.sql файлына айналдырады.
// Іске қосу: node scripts/gen-seed.mjs
// Әр сандық есептің жауабы екі тәуелсіз жолмен есептеліп, салыстырылады (solve() және answer_expr).
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { MODULES } from "../src/lib/sims/library.js";

const require = createRequire(import.meta.url);
const J = require("./content.cjs");

const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const j = (o) => q(JSON.stringify(o)) + "::jsonb";

// answer_expr — mathjs өрнегі; айнымалылар ASCII атаулармен
const EXPR = {
  p1: ["m*v", { m: 2, v: 5 }],
  p2: ["F*dt", { F: 50, dt: 0.2 }],
  p3: ["m*(v-v0)", { m: 0.5, v0: 4, v: 10 }],
  p4: ["2*m*v", { m: 0.2, v: 10 }],
  p5: ["m*v/dt", { m: 0.4, v: 20, dt: 0.02 }],
  p6: ["F*dt/m", { F: 10, dt: 3, m: 2 }],
  p7: ["m1*v1/(m1+m2)", { m1: 2, v1: 3, m2: 1 }],
  p8: ["(m1*v1-m2*v2)/(m1+m2)", { m1: 3, v1: 4, m2: 2, v2: 1 }],
  p9: ["v1", { v1: 6, v2: 0 }],
  p10: ["m*u/(M-m)", { M: 200, m: 20, u: 5 }],
  p11: ["v2*m/Mr", { Mr: 4000, m: 1000, v2: 2000 }],
  p12: ["F*s*cos(alpha*pi/180)", { F: 20, s: 5, alpha: 60 }],
  p13: ["m*g*(h1-h2)", { m: 2, h1: 10, h2: 4, g: 10 }],
  p14: ["-mu*m*g*s", { m: 5, s: 10, mu: 0.2, g: 10 }],
  p15: ["A/t", { A: 3000, t: 60 }],
  p16: ["F*v", { F: 500, v: 20 }],
  p17: ["Ap/At*100", { Ap: 300, At: 500 }],
  p18: ["m*g*h/(N*t)*100", { N: 1000, m: 100, t: 20, h: 10, g: 10 }],
  p19: ["m*g*v/(eta/100)", { m: 500, v: 0.4, eta: 80, g: 10 }],
  p20: ["F*s*cos(alpha*pi/180)", { F: 15, s: 8, alpha: 90 }],
};
// Тәуелсіз тексеру (JS арқылы, «deg» → радиан)
function jsEval(expr, vars) {
  const code = expr.replace(/cos\(/g, "Math.cos(").replace(/\bpi\b/g, "Math.PI");
  return Function(...Object.keys(vars), `return (${code});`)(...Object.values(vars));
}

const topicSlug = { impulse: "impulse", work: "work-power" };
const lines = ["-- Автоматты түрде жасалған: node scripts/gen-seed.mjs", "begin;"];
J.topics.forEach((t, i) =>
  lines.push(`insert into public.topics (slug, title, chapter, sort) values (${q(topicSlug[t.id])}, ${q(t.title)}, ${q(t.chapter)}, ${i}) on conflict (slug) do nothing;`)
);
const tid = (id) => `(select id from public.topics where slug = ${q(topicSlug[id])})`;

// HTML → платформаның мәтін форматы (**қалың**, $формула$)
function toBody(html) {
  return html
    .replace(/<i>([^<]+)<\/i><sub>([^<]+)<\/sub>/g, (_, a, b) => `$${a}_{${b}}$`)
    .replace(/<i>([^<]+)<\/i>/g, (_, a) => `$${a}$`)
    .replace(/<b>(.*?)<\/b>/g, "**$1**")
    .replace(/<sub>([^<]+)<\/sub>/g, "_$1")
    .replace(/<[^>]+>/g, "");
}
J.theory.forEach((t, i) =>
  lines.push(`insert into public.theory_sections (topic_id, num, title, body, formulas, sim_slug, status, sort) values (${tid(t.topic)}, ${q(t.num)}, ${q(t.title)}, ${q(t.body.map(toBody).join("\n\n"))}, ${j(t.formulas.map((f) => ({ tex: f.tex, note: f.note })))}, ${q(t.sim)}, 'published', ${i});`)
);

J.problems.forEach((p, i) => {
  const b = J.buildProblem(p);
  const [expr, vars] = EXPR[p.id];
  const v2 = Math.round(jsEval(expr, vars) * 1e9) / 1e9;
  if (Math.abs(v2 - p.solve(Object.fromEntries(p.given.map(([k, v]) => [k, v])))) > 1e-9) throw new Error("Сәйкессіздік: " + p.id);
  lines.push(`insert into public.questions (topic_id, kind, level, text, options, correct_index, explanation, solution, variables, answer_expr, answer_value, unit, status, sort) values (${tid(p.topic)}, 'numeric', ${q(p.level)}, ${q(p.text)}, ${j(b.options)}, 0, ${q(b.solution.formula)}, ${j(b.solution)}, ${j(vars)}, ${q(expr)}, ${v2}, ${q(p.unit)}, 'verified', ${i});`);
});
J.concepts.forEach((c, i) =>
  lines.push(`insert into public.questions (topic_id, kind, level, text, options, correct_index, explanation, status, sort) values (${tid(c.topic)}, 'concept', ${q(c.level)}, ${q(c.text)}, ${j(c.options)}, ${c.correct}, ${q(c.explain)}, 'verified', ${100 + i});`)
);
lines.push("update public.questions set status = 'published' where status = 'verified';");

const topicOfPair = (i) => (i < 2 || i === 7 || i === 8 || i === 11 ? "impulse" : "work");
J.trueFalse.forEach((t, i) => lines.push(`insert into public.game_items (game, data, topic_id, status) values ('true_false', ${j({ statement: t.s, value: t.v, explanation: t.e })}, ${tid(i < 6 || i === 15 ? "impulse" : "work")}, 'published');`));
J.pairs.forEach((p, i) => lines.push(`insert into public.game_items (game, data, topic_id, status) values ('pair', ${j({ left: p[0], right: p[1] })}, ${tid(topicOfPair(i))}, 'published');`));
J.formulaBattle.forEach((f) => lines.push(`insert into public.game_items (game, data, status) values ('formula_battle', ${j({ question: f.q, options: f.options, correct: f.correct })}, 'published');`));
J.fillFormula.forEach((f) => lines.push(`insert into public.game_items (game, data, status) values ('fill', ${j({ question: f.q, options: f.options, correct: f.correct })}, 'published');`));

const simTopic = { collisions: "impulse", dynamics: "work", incline: "work" };
MODULES.forEach((m, i) =>
  lines.push(`insert into public.simulators (slug, module_key, title, category, description, explanation, params, topic_ids, published, sort) values (${q(m.slug)}, ${q(m.slug)}, ${q(m.title)}, ${q(m.cat)}, ${q(m.desc)}, ${q(m.explain.join("\n\n"))}, '{}'::jsonb, ${simTopic[m.slug] ? `array[${tid(simTopic[m.slug])}]` : "'{}'"}, true, ${i}) on conflict (slug) do nothing;`)
);
lines.push("commit;");
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`seed.sql: ${lines.length} жол`);
