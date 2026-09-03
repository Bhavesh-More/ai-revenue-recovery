import http from "node:http";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function request(
  serverUrl: string,
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const payload = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (payload) {
      reqHeaders["Content-Length"] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          let json: any = {};
          try {
            json = JSON.parse(responseData);
          } catch {
            json = { raw: responseData };
          }
          resolve({ status: res.statusCode || 500, body: json });
        });
      },
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function testAllApis() {
  const baseUrl = "http://127.0.0.1:4000";
  console.log("=========================================");
  console.log(`Testing All Platform APIs against ${baseUrl}`);
  console.log("=========================================\n");

  // 1. Healthcheck
  console.log("1. GET /health");
  const resHealth = await request(baseUrl, "GET", "/health");
  console.log(`   Status: ${resHealth.status}, DB: ${resHealth.body.data?.db}, Uptime: ${resHealth.body.data?.uptimeSeconds}s`);
  assert(resHealth.status === 200, "Health should return 200");

  // 2. Seed Demo Scenarios
  console.log("\n2. POST /api/v1/scenarios/seed");
  const resSeed = await request(baseUrl, "POST", "/api/v1/scenarios/seed");
  console.log(`   Status: ${resSeed.status}, Seeded: ${resSeed.body.data?.seededCount} cases`);
  assert(resSeed.status === 200 || resSeed.status === 201, "Seeding should succeed");

  // 3. Get Scenarios Catalog
  console.log("\n3. GET /api/v1/scenarios");
  const resScenarios = await request(baseUrl, "GET", "/api/v1/scenarios");
  console.log(`   Status: ${resScenarios.status}, Catalog items: ${resScenarios.body.data?.scenarios?.length}`);
  assert(resScenarios.body.data?.scenarios?.length >= 7, "Catalog should have at least 7 scenarios");

  // 4. List Recovery Cases
  console.log("\n4. GET /api/v1/cases");
  const resCases = await request(baseUrl, "GET", "/api/v1/cases");
  console.log(`   Status: ${resCases.status}, Total Cases: ${resCases.body.data?.length}`);
  assert(resCases.status === 200, "Cases list should return 200");
  const sampleCase = resCases.body.data?.[0];
  assert(Boolean(sampleCase), "Should have at least one recovery case");
  const caseId = sampleCase.id;
  console.log(`   Selected Sample Case ID: ${caseId}`);

  // 5. Get Single Case Detail
  console.log(`\n5. GET /api/v1/cases/${caseId}`);
  const resCaseDetail = await request(baseUrl, "GET", `/api/v1/cases/${caseId}`);
  console.log(`   Status: ${resCaseDetail.status}, State: ${resCaseDetail.body.data?.currentState}`);
  assert(resCaseDetail.status === 200, "Case detail should return 200");

  // 6. Trigger Agent AI Diagnosis
  console.log(`\n6. POST /api/v1/recovery-cases/${caseId}/analyze`);
  const resAnalyze = await request(baseUrl, "POST", `/api/v1/recovery-cases/${caseId}/analyze`, {
    mode: "autonomous",
  });
  console.log(`   Status: ${resAnalyze.status}, Decision: ${resAnalyze.body.data?.decision?.rationale?.substring(0, 60)}...`);
  assert(resAnalyze.status === 202, "Agent diagnosis should return 202 ACCEPTED");

  // 7. Policy Management
  console.log("\n7. GET /api/v1/policies");
  const resPolicies = await request(baseUrl, "GET", "/api/v1/policies");
  console.log(`   Status: ${resPolicies.status}, Policies count: ${resPolicies.body.data?.length}`);
  assert(resPolicies.status === 200, "Policies should return 200");

  // 8. Recovery Metrics
  console.log("\n8. GET /api/v1/metrics");
  const resMetrics = await request(baseUrl, "GET", "/api/v1/metrics");
  console.log(`   Status: ${resMetrics.status}, Revenue at Risk: ₹${resMetrics.body.data?.revenueAtRiskMinor / 100}, Recovery Rate: ${(resMetrics.body.data?.recoveryRate * 100).toFixed(1)}%`);
  assert(resMetrics.status === 200, "Metrics should return 200");

  // 9. Batches List & Management
  console.log("\n9. GET /api/v1/batches");
  const resBatches = await request(baseUrl, "GET", "/api/v1/batches");
  console.log(`   Status: ${resBatches.status}, Batches count: ${resBatches.body.data?.length}`);
  assert(resBatches.status === 200, "Batches should return 200");

  // 10. Audit Log Lineage
  console.log("\n10. GET /api/v1/audit-events");
  const resAudit = await request(baseUrl, "GET", "/api/v1/audit-events");
  console.log(`   Status: ${resAudit.status}, Audit events: ${resAudit.body.data?.length}`);
  assert(resAudit.status === 200, "Audit log should return 200");

  // 11. Razorpay Webhook Simulation
  console.log("\n11. POST /webhooks/razorpay (Settlement Simulation)");
  const resWebhook = await request(baseUrl, "POST", "/webhooks/razorpay", {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_webhook_${Date.now()}`,
          amount: 499900,
          currency: "INR",
          description: caseId,
        },
      },
    },
  });
  console.log(`   Status: ${resWebhook.status}, Event: ${resWebhook.body.data?.event}, Handled Case: ${resWebhook.body.data?.processedCaseId}`);
  assert(resWebhook.status === 200, "Webhook should return 200");

  console.log("\n=========================================");
  console.log("ALL REST APIS AND WORKFLOWS VERIFIED 100%!");
  console.log("=========================================\n");
}

testAllApis().catch((err) => {
  console.error("API Testing Failed:", err);
  process.exit(1);
});
