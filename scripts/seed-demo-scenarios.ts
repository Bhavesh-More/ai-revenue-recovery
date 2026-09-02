import { db } from "@recovery/db";
import { DemoScenarioGenerator, DEMO_SCENARIOS } from "@recovery/case-lifecycle";

async function main() {
  console.log("=========================================");
  console.log("Seeding Demo Scenarios into Database");
  console.log("=========================================\n");

  const generator = new DemoScenarioGenerator(db);
  console.log(`Found ${DEMO_SCENARIOS.length} pre-configured scenarios:`);
  for (const s of DEMO_SCENARIOS) {
    console.log(`  - [${s.direction}] ${s.name}`);
  }

  console.log("\nExecuting seed sequence...");
  const result = await generator.seedAll();

  console.log(`\nSuccessfully seeded ${result.seededCount} scenarios!`);
  console.log("Seeded Cases:");
  for (const c of result.cases) {
    console.log(`  - Case ID: ${c.id} | Direction: ${c.direction} | State: ${c.currentState} | Risk: ${c.riskTier}`);
  }

  console.log("\n=========================================");
  console.log("DEMO SCENARIOS SEEDED SUCCESSFULLY");
  console.log("=========================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed demo scenarios:", err);
  process.exit(1);
});
