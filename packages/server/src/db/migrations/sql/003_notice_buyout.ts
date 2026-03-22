// ============================================================================
// NOTICE BUYOUT REQUESTS TABLE
// Stores employee requests to buy out remaining notice period days.
// ============================================================================

import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("notice_buyout_requests"))) {
    await knex.schema.createTable("notice_buyout_requests", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests");
      t.bigInteger("employee_id").unsigned().notNullable();
      t.date("original_last_date").notNullable();
      t.date("requested_last_date").notNullable();
      t.integer("original_notice_days").notNullable();
      t.integer("served_days").notNullable();
      t.integer("remaining_days").notNullable();
      t.bigInteger("daily_rate").notNullable().comment("Smallest currency unit");
      t.bigInteger("buyout_amount").notNullable().comment("Smallest currency unit");
      t.string("currency", 3).notNullable().defaultTo("INR");
      t.enum("status", ["pending", "approved", "rejected"]).notNullable().defaultTo("pending");
      t.bigInteger("approved_by").unsigned().nullable();
      t.timestamp("approved_at").nullable();
      t.bigInteger("rejected_by").unsigned().nullable();
      t.text("rejected_reason").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "exit_request_id"]);
      t.index(["organization_id", "status"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("notice_buyout_requests");
}
