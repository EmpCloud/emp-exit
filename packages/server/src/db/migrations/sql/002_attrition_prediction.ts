// ============================================================================
// ATTRITION PREDICTION SCHEMA — flight risk scoring + prediction tracking
// ============================================================================

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. flight_risk_scores — cached per-employee risk scores
  if (!(await knex.schema.hasTable("flight_risk_scores"))) {
    await knex.schema.createTable("flight_risk_scores", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.bigInteger("employee_id").unsigned().notNullable();
      t.integer("score").unsigned().notNullable().defaultTo(0);
      t.string("risk_level", 20).notNullable().defaultTo("low");
      t.json("factors").nullable();
      t.timestamp("calculated_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "risk_level"]);
      t.index(["organization_id", "employee_id"]);
    });
  }

  // 2. attrition_predictions — monthly department-level predictions
  if (!(await knex.schema.hasTable("attrition_predictions"))) {
    await knex.schema.createTable("attrition_predictions", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.bigInteger("department_id").unsigned().nullable();
      t.date("month").notNullable();
      t.integer("predicted_exits").unsigned().notNullable().defaultTo(0);
      t.integer("actual_exits").unsigned().nullable();
      t.decimal("confidence", 5, 2).notNullable().defaultTo(0);
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "month"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("attrition_predictions");
  await knex.schema.dropTableIfExists("flight_risk_scores");
}
