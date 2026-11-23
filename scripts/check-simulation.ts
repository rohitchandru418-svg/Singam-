/**
 * Invariant check for the live simulation script and the sign-in personas.
 *
 * Run with `npm run check:simulation`. It asserts the properties that keep the simulation
 * honest: it points at real routes, it names real actions, every step has an owner that is a
 * real persona, and the persona list keeps the two systems and the eleven sign-ins the brief
 * asks for. It is a fast, container-free guard so the script cannot drift from the app.
 */

import { PERSONAS, EXTERNAL_PERSONAS, INTERNAL_PERSONAS, PERSONA_BY_KEY } from "../src/lib/domain/personas";
import { SIM_STEPS, SIM_JOURNEYS, stepsFor } from "../src/lib/domain/simulation";
import { ACTION_CATALOG_MAP } from "../src/lib/server/action-registry";
import { WORKSPACES } from "../src/lib/domain/navigation";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const ROUTES = new Set<string>(["/", "/login"]);
for (const ws of WORKSPACES) for (const s of ws.screens) ROUTES.add(s.href);
// Routes the simulation uses that are nested under a workspace screen.
const EXTRA_ROUTES = ["/records", "/journeys", "/my-work"];

console.log("\nSign-in personas");
check("exactly eleven personas", PERSONAS.length === 11, String(PERSONAS.length));
check("two external personas (founder, investor)", EXTERNAL_PERSONAS.length === 2);
check("nine internal personas", INTERNAL_PERSONAS.length === 9, String(INTERNAL_PERSONAS.length));
check("no Master Brief persona", !PERSONAS.some((p) => /master/i.test(p.label)));
check(
  "every persona has a distinct seeded account",
  new Set(PERSONAS.map((p) => p.userId)).size === PERSONAS.length,
);
check(
  "every persona lands on a real route",
  PERSONAS.every((p) => p.href === "/" || ROUTES.has(p.href) || EXTRA_ROUTES.includes(p.href)),
  PERSONAS.filter((p) => !(p.href === "/" || ROUTES.has(p.href) || EXTRA_ROUTES.includes(p.href)))
    .map((p) => `${p.key}:${p.href}`)
    .join(", "),
);
check(
  "external personas name a portal",
  EXTERNAL_PERSONAS.every((p) => p.portal === "founder" || p.portal === "investor"),
);

console.log("\nSimulation script");
check("six journeys", SIM_JOURNEYS.length === 6, String(SIM_JOURNEYS.length));
check(
  "every journey has steps",
  SIM_JOURNEYS.every((j) => stepsFor(j.key).length > 0),
);
check(
  "every step points at a real route",
  SIM_STEPS.every((s) => ROUTES.has(s.route) || EXTRA_ROUTES.includes(s.route) || s.route.startsWith("/records")),
  SIM_STEPS.filter((s) => !(ROUTES.has(s.route) || EXTRA_ROUTES.includes(s.route) || s.route.startsWith("/records")))
    .map((s) => `${s.id}:${s.route}`)
    .join(", "),
);
check(
  "every action a step names is a real action",
  SIM_STEPS.filter((s) => s.action).every((s) => Boolean(ACTION_CATALOG_MAP[s.action as string])),
  SIM_STEPS.filter((s) => s.action && !ACTION_CATALOG_MAP[s.action as string])
    .map((s) => `${s.id}:${s.action}`)
    .join(", "),
);
check(
  "every step is owned by a real persona",
  SIM_STEPS.every((s) => Boolean(PERSONA_BY_KEY[s.owner])),
  SIM_STEPS.filter((s) => !PERSONA_BY_KEY[s.owner])
    .map((s) => `${s.id}:${s.owner}`)
    .join(", "),
);
check(
  "the person who owns a step may run that step's action",
  SIM_STEPS.filter((s) => s.action).every((s) => {
    const persona = PERSONA_BY_KEY[s.owner];
    const descriptor = ACTION_CATALOG_MAP[s.action as string];
    if (!persona || !descriptor) return false;
    if (persona.role === "admin" || persona.role === "management") return true;
    return descriptor.roles.includes(persona.role);
  }),
  SIM_STEPS.filter((s) => s.action)
    .filter((s) => {
      const persona = PERSONA_BY_KEY[s.owner];
      const descriptor = ACTION_CATALOG_MAP[s.action as string];
      if (!persona || !descriptor) return false;
      if (persona.role === "admin" || persona.role === "management") return false;
      return !descriptor.roles.includes(persona.role);
    })
    .map((s) => `${s.id}:${s.owner}/${s.action}`)
    .join(", "),
);
check("every step has a distinct id", new Set(SIM_STEPS.map((s) => s.id)).size === SIM_STEPS.length);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log(`\nAll checks passed (${SIM_STEPS.length} steps, ${PERSONAS.length} personas).\n`);
