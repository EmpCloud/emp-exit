// ============================================================================
// REHIRE REQUESTS TABLE
// Stores rehire proposals for alumni employees.
// ============================================================================

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("rehire_requests"))) {
    await knex.schema.createTable("rehire_requests", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.uuid("alumni_id").notNullable().references("id").inTable("alumni_profiles");
      t.bigInteger("employee_id").unsigned().notNullable();
      t.bigInteger("requested_by").unsigned().notNullable();
      t.string("position", 255).notNullable();
      t.string("department", 100).nullable();
      t.bigInteger("proposed_salary").notNullable().comment("Smallest currency unit");
      t.enum("status", ["proposed", "screening", "approved", "rejected", "hired"])
        .notNullable()
        .defaultTo("proposed");
      t.text("notes").nullable();
      t.date("original_exit_date").nullable();
      t.date("rehire_date").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "status"]);
      t.index(["organization_id", "alumni_id"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("rehire_requests");
}
