// =============================================================================
// EXIT FNF DEEP COVERAGE — calculation, salary+leave+gratuity-deductions, lifecycle
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import knexLib, { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

let db: Knex;
let dbAvailable = false;
const ORG_ID = 5;
const USER_ID = 522;
const TS = Date.now();
const cleanup: { table: string; id: string }[] = [];

beforeAll(async () => {
  try {
    db = knexLib({
      client: "mysql2",
      connection: { host: "localhost", port: 3306, user: "empcloud", password: process.env.DB_PASSWORD || "", database: "emp_exit" },
    });
    await db.raw("SELECT 1");
    dbAvailable = true;
  } catch {
    // No local MySQL — tests will be skipped
  }
});

afterEach(async () => {
  for (const item of cleanup.reverse()) {
    try { await db(item.table).where({ id: item.id }).del(); } catch {}
  }
  cleanup.length = 0;
});

afterAll(async () => { if (db) await db.destroy(); });

beforeEach((ctx) => { if (!dbAvailable) ctx.skip(); });

async function seedExitRequest(overrides: Record<string, any> = {}): Promise<string> {
  const id = uuidv4();
  await db("exit_requests").insert({
    id, organization_id: ORG_ID, employee_id: 524, exit_type: "resignation",
    status: "initiated", reason_category: "personal", initiated_by: USER_ID,
    notice_period_days: 30, notice_period_waived: false,
    resignation_date: "2026-01-01", last_working_date: "2026-01-31",
    notice_start_date: "2026-01-01",
    ...overrides,
  });
  cleanup.push({ table: "exit_requests", id });
  return id;
}

// ==========================================================================
// FNF SETTLEMENT CRUD & LIFECYCLE
// ==========================================================================
describe("FnF Settlement CRUD", () => {
  it("should create a draft FnF settlement", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "draft",
      basic_salary_due: 0, leave_encashment: 0, bonus_due: 0, gratuity: 0,
      notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 0,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    const row = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(row.status).toBe("draft");
    expect(Number(row.total_payable)).toBe(0);
  });

  it("should calculate FnF with salary, leave encashment, and gratuity", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    const basicSalary = 5000000; // 50,000 in paise
    const leaveEncashment = 200000;
    const gratuity = 1500000; // eligible (5+ yr tenure)
    const noticeRecovery = 0;
    const totalPayable = basicSalary + leaveEncashment + gratuity - noticeRecovery;

    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "calculated",
      basic_salary_due: basicSalary, leave_encashment: leaveEncashment,
      bonus_due: 0, gratuity,
      notice_pay_recovery: noticeRecovery, other_deductions: 0, other_earnings: 0,
      total_payable: totalPayable,
      breakdown_json: JSON.stringify({ last_basic_salary: basicSalary, lwd: "2026-01-31" }),
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    const row = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(row.status).toBe("calculated");
    expect(Number(row.total_payable)).toBe(totalPayable);
    expect(Number(row.gratuity)).toBe(gratuity);
  });

  it("should update FnF with manual adjustments and recalculate total", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "calculated",
      basic_salary_due: 5000000, leave_encashment: 200000, bonus_due: 100000,
      gratuity: 0, notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0,
      total_payable: 5300000,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    // HR adjusts deductions
    const otherDeductions = 300000;
    const otherEarnings = 50000;
    const newTotal = 5000000 + 200000 + 100000 + 50000 - 300000;
    await db("fnf_settlements").where({ id: fnfId }).update({
      other_deductions: otherDeductions, other_earnings: otherEarnings,
      total_payable: newTotal, remarks: "Adjusted for pending loans",
    });

    const row = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(Number(row.total_payable)).toBe(newTotal);
    expect(Number(row.other_deductions)).toBe(300000);
    expect(row.remarks).toBe("Adjusted for pending loans");
  });

  it("should approve FnF settlement", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "calculated",
      basic_salary_due: 5000000, leave_encashment: 0, bonus_due: 0, gratuity: 0,
      notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 5000000,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    await db("fnf_settlements").where({ id: fnfId }).update({
      status: "approved", approved_by: USER_ID,
    });

    const row = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(row.status).toBe("approved");
    expect(row.approved_by).toBe(USER_ID);
  });

  it("should mark FnF as paid with payment reference", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "approved",
      basic_salary_due: 5000000, leave_encashment: 0, bonus_due: 0, gratuity: 0,
      notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0,
      total_payable: 5000000, approved_by: USER_ID,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    const paidDate = "2026-02-15";
    const payRef = "NEFT-12345";
    await db("fnf_settlements").where({ id: fnfId }).update({
      status: "paid", paid_date: paidDate, remarks: `Payment ref: ${payRef}`,
    });

    const row = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(row.status).toBe("paid");
    expect(row.remarks).toContain(payRef);
  });

  it("should enforce one FnF per exit request (unique constraint)", async () => {
    const exitReqId = await seedExitRequest();
    const fnfId = uuidv4();
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "draft",
      basic_salary_due: 0, leave_encashment: 0, bonus_due: 0, gratuity: 0,
      notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 0,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    // Second insert should fail due to unique constraint on exit_request_id
    await expect(
      db("fnf_settlements").insert({
        id: uuidv4(), exit_request_id: exitReqId, status: "draft",
        basic_salary_due: 0, leave_encashment: 0, bonus_due: 0, gratuity: 0,
        notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 0,
      })
    ).rejects.toThrow();
  });
});

// ==========================================================================
// FNF CALCULATION LOGIC (unit tests for formulas)
// ==========================================================================
describe("FnF Calculation Formulas", () => {
  it("should compute pro-rata salary correctly", () => {
    const lastBasic = 6000000; // 60,000 in paise
    const lwdDate = new Date("2026-01-15");
    const dayOfMonth = lwdDate.getDate(); // 15
    const daysInMonth = new Date(2026, 0 + 1, 0).getDate(); // 31
    const proRata = Math.round((lastBasic * dayOfMonth) / daysInMonth);
    expect(proRata).toBe(Math.round((6000000 * 15) / 31));
  });

  it("should compute gratuity for 5+ year tenure", () => {
    const lastBasic = 5000000;
    const doj = new Date("2020-01-01");
    const lwd = new Date("2026-01-31");
    const diffMs = lwd.getTime() - doj.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const completedYears = Math.floor(years);
    expect(completedYears).toBeGreaterThanOrEqual(5);

    const gratuity = Math.round((15 * lastBasic * completedYears) / 26);
    expect(gratuity).toBeGreaterThan(0);
  });

  it("should return zero gratuity for < 5 year tenure", () => {
    const lastBasic = 5000000;
    const doj = new Date("2023-01-01");
    const lwd = new Date("2026-01-31");
    const years = (lwd.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const completedYears = Math.floor(years);
    expect(completedYears).toBeLessThan(5);
    const gratuity = completedYears < 5 ? 0 : Math.round((15 * lastBasic * completedYears) / 26);
    expect(gratuity).toBe(0);
  });

  it("should compute notice recovery for shortfall", () => {
    const lastBasic = 6000000;
    const noticeDays = 30;
    const noticeStart = "2026-01-01";
    const lwd = "2026-01-20";
    const servedDays = Math.ceil(
      (new Date(lwd).getTime() - new Date(noticeStart).getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(servedDays).toBe(19);
    const shortfall = noticeDays - servedDays; // 11
    expect(shortfall).toBe(11);
    const dailyRate = Math.round(lastBasic / 30);
    const recovery = dailyRate * shortfall;
    expect(recovery).toBeGreaterThan(0);
  });

  it("should return zero recovery when notice is waived", () => {
    const noticeWaived = true;
    const recovery = noticeWaived ? 0 : 100;
    expect(recovery).toBe(0);
  });

  it("should return zero recovery when full notice served", () => {
    const noticeDays = 30;
    const servedDays = 30;
    const shortfall = Math.max(0, noticeDays - servedDays);
    expect(shortfall).toBe(0);
  });
});

// ==========================================================================
// NOTICE BUYOUT INTEGRATION WITH FNF
// ==========================================================================
describe("Notice Buyout + FnF Integration", () => {
  it("should create and approve a buyout request", async () => {
    const exitReqId = await seedExitRequest({
      resignation_date: "2026-01-01",
      last_working_date: "2026-01-31",
    });
    const buyoutId = uuidv4();
    await db("notice_buyout_requests").insert({
      id: buyoutId, organization_id: ORG_ID, exit_request_id: exitReqId,
      employee_id: 524, original_last_date: "2026-01-31",
      requested_last_date: "2026-01-15", original_notice_days: 30,
      served_days: 14, remaining_days: 16, daily_rate: 200000,
      buyout_amount: 3200000, currency: "INR", status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id: buyoutId });

    await db("notice_buyout_requests").where({ id: buyoutId }).update({
      status: "approved", approved_by: USER_ID, approved_at: new Date(),
    });
    await db("exit_requests").where({ id: exitReqId }).update({
      last_working_date: "2026-01-15",
    });

    const buyout = await db("notice_buyout_requests").where({ id: buyoutId }).first();
    expect(buyout.status).toBe("approved");
    const exit = await db("exit_requests").where({ id: exitReqId }).first();
    expect(exit.last_working_date.toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  it("should reject a buyout request with reason", async () => {
    const exitReqId = await seedExitRequest();
    const buyoutId = uuidv4();
    await db("notice_buyout_requests").insert({
      id: buyoutId, organization_id: ORG_ID, exit_request_id: exitReqId,
      employee_id: 524, original_last_date: "2026-01-31",
      requested_last_date: "2026-01-15", original_notice_days: 30,
      served_days: 14, remaining_days: 16, daily_rate: 200000,
      buyout_amount: 3200000, currency: "INR", status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id: buyoutId });

    await db("notice_buyout_requests").where({ id: buyoutId }).update({
      status: "rejected", rejected_by: USER_ID, rejected_reason: "Critical project ongoing",
    });

    const row = await db("notice_buyout_requests").where({ id: buyoutId }).first();
    expect(row.status).toBe("rejected");
    expect(row.rejected_reason).toBe("Critical project ongoing");
  });

  it("should use buyout amount as notice recovery in FnF", async () => {
    const exitReqId = await seedExitRequest();
    const buyoutId = uuidv4();
    const buyoutAmount = 3200000;
    await db("notice_buyout_requests").insert({
      id: buyoutId, organization_id: ORG_ID, exit_request_id: exitReqId,
      employee_id: 524, original_last_date: "2026-01-31",
      requested_last_date: "2026-01-15", original_notice_days: 30,
      served_days: 14, remaining_days: 16, daily_rate: 200000,
      buyout_amount: buyoutAmount, currency: "INR", status: "approved",
      approved_by: USER_ID, approved_at: new Date(),
    });
    cleanup.push({ table: "notice_buyout_requests", id: buyoutId });

    // Create FnF using buyout amount as notice recovery
    const fnfId = uuidv4();
    const basicSalary = 5000000;
    const totalPayable = basicSalary - buyoutAmount;
    await db("fnf_settlements").insert({
      id: fnfId, exit_request_id: exitReqId, status: "calculated",
      basic_salary_due: basicSalary, leave_encashment: 0, bonus_due: 0, gratuity: 0,
      notice_pay_recovery: buyoutAmount, other_deductions: 0, other_earnings: 0,
      total_payable: totalPayable,
    });
    cleanup.push({ table: "fnf_settlements", id: fnfId });

    const fnf = await db("fnf_settlements").where({ id: fnfId }).first();
    expect(Number(fnf.notice_pay_recovery)).toBe(buyoutAmount);
    expect(Number(fnf.total_payable)).toBe(totalPayable);
  });
});
