import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = async (col: string) =>
    knex.schema.hasColumn("exit_settings", col);

  await knex.schema.alterTable("exit_settings", (t) => {
    // Email notification toggles for exit lifecycle events
  });

  const columns = [
    "email_on_exit_initiated",
    "email_on_clearance_pending",
    "email_on_clearance_completed",
    "email_on_fnf_calculated",
    "email_on_fnf_approved",
    "email_on_exit_completed",
  ];

  for (const col of columns) {
    if (!(await hasColumn(col))) {
      await knex.schema.alterTable("exit_settings", (t) => {
        t.boolean(col).notNullable().defaultTo(true);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const columns = [
    "email_on_exit_initiated",
    "email_on_clearance_pending",
    "email_on_clearance_completed",
    "email_on_fnf_calculated",
    "email_on_fnf_approved",
    "email_on_exit_completed",
  ];

  for (const col of columns) {
    if (await knex.schema.hasColumn("exit_settings", col)) {
      await knex.schema.alterTable("exit_settings", (t) => {
        t.dropColumn(col);
      });
    }
  }
}
