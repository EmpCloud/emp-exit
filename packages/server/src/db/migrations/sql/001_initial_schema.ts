// ============================================================================
// EMP-EXIT INITIAL SCHEMA — 19 tables
// All exit management tables in the emp_exit database.
// ============================================================================

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. exit_settings — per-org exit configuration
  if (!(await knex.schema.hasTable("exit_settings"))) {
    await knex.schema.createTable("exit_settings", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.integer("default_notice_period_days").notNullable().defaultTo(30);
      t.boolean("auto_initiate_clearance").notNullable().defaultTo(true);
      t.boolean("require_exit_interview").notNullable().defaultTo(true);
      t.boolean("fnf_approval_required").notNullable().defaultTo(true);
      t.boolean("alumni_opt_in_default").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.unique(["organization_id"]);
    });
  }

  // 2. exit_requests — core exit records
  if (!(await knex.schema.hasTable("exit_requests"))) {
    await knex.schema.createTable("exit_requests", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.bigInteger("employee_id").unsigned().notNullable();
      t.string("exit_type", 30).notNullable();
      t.string("status", 30).notNullable().defaultTo("initiated");
      t.string("reason_category", 30).notNullable();
      t.text("reason_detail").nullable();
      t.bigInteger("initiated_by").unsigned().notNullable();
      t.bigInteger("approved_by").unsigned().nullable();
      t.date("resignation_date").nullable();
      t.date("notice_start_date").nullable();
      t.date("last_working_date").nullable();
      t.date("actual_exit_date").nullable();
      t.integer("notice_period_days").notNullable().defaultTo(30);
      t.boolean("notice_period_waived").notNullable().defaultTo(false);
      t.text("revoke_reason").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "status"]);
      t.index(["organization_id", "employee_id"]);
      t.index(["organization_id", "exit_type"]);
    });
  }

  // 3. exit_checklist_templates
  if (!(await knex.schema.hasTable("exit_checklist_templates"))) {
    await knex.schema.createTable("exit_checklist_templates", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.string("name", 200).notNullable();
      t.text("description").nullable();
      t.string("exit_type", 30).nullable();
      t.boolean("is_default").notNullable().defaultTo(false);
      t.boolean("is_active").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id"]);
    });
  }

  // 4. exit_checklist_template_items
  if (!(await knex.schema.hasTable("exit_checklist_template_items"))) {
    await knex.schema.createTable("exit_checklist_template_items", (t) => {
      t.uuid("id").primary();
      t.uuid("template_id").notNullable().references("id").inTable("exit_checklist_templates").onDelete("CASCADE");
      t.string("title", 300).notNullable();
      t.text("description").nullable();
      t.string("assigned_role", 50).nullable();
      t.bigInteger("assigned_department_id").unsigned().nullable();
      t.integer("sort_order").notNullable().defaultTo(0);
      t.boolean("is_mandatory").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["template_id"]);
    });
  }

  // 5. exit_checklist_instances — per-exit checklist items
  if (!(await knex.schema.hasTable("exit_checklist_instances"))) {
    await knex.schema.createTable("exit_checklist_instances", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.uuid("template_item_id").nullable();
      t.string("title", 300).notNullable();
      t.text("description").nullable();
      t.string("status", 20).notNullable().defaultTo("pending");
      t.bigInteger("assigned_to").unsigned().nullable();
      t.bigInteger("completed_by").unsigned().nullable();
      t.timestamp("completed_at").nullable();
      t.text("remarks").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
      t.index(["exit_request_id", "status"]);
    });
  }

  // 6. clearance_departments — org-level clearance departments
  if (!(await knex.schema.hasTable("clearance_departments"))) {
    await knex.schema.createTable("clearance_departments", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.string("name", 200).notNullable();
      t.string("approver_role", 50).nullable();
      t.integer("sort_order").notNullable().defaultTo(0);
      t.boolean("is_active").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id"]);
    });
  }

  // 7. clearance_records — per-exit per-dept clearance
  if (!(await knex.schema.hasTable("clearance_records"))) {
    await knex.schema.createTable("clearance_records", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.uuid("department_id").notNullable().references("id").inTable("clearance_departments").onDelete("CASCADE");
      t.string("status", 20).notNullable().defaultTo("pending");
      t.bigInteger("approved_by").unsigned().nullable();
      t.timestamp("approved_at").nullable();
      t.text("remarks").nullable();
      t.bigInteger("pending_amount").notNullable().defaultTo(0);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
      t.index(["exit_request_id", "status"]);
    });
  }

  // 8. exit_interview_templates
  if (!(await knex.schema.hasTable("exit_interview_templates"))) {
    await knex.schema.createTable("exit_interview_templates", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.string("name", 200).notNullable();
      t.text("description").nullable();
      t.boolean("is_default").notNullable().defaultTo(false);
      t.boolean("is_active").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id"]);
    });
  }

  // 9. exit_interview_questions
  if (!(await knex.schema.hasTable("exit_interview_questions"))) {
    await knex.schema.createTable("exit_interview_questions", (t) => {
      t.uuid("id").primary();
      t.uuid("template_id").notNullable().references("id").inTable("exit_interview_templates").onDelete("CASCADE");
      t.text("question_text").notNullable();
      t.string("question_type", 30).notNullable().defaultTo("text");
      t.text("options").nullable();
      t.integer("sort_order").notNullable().defaultTo(0);
      t.boolean("is_required").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["template_id"]);
    });
  }

  // 10. exit_interviews — per-exit interview records
  if (!(await knex.schema.hasTable("exit_interviews"))) {
    await knex.schema.createTable("exit_interviews", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.uuid("template_id").nullable().references("id").inTable("exit_interview_templates").onDelete("SET NULL");
      t.bigInteger("interviewer_id").unsigned().nullable();
      t.date("scheduled_date").nullable();
      t.date("completed_date").nullable();
      t.string("status", 20).notNullable().defaultTo("scheduled");
      t.integer("overall_rating").nullable();
      t.text("summary").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
    });
  }

  // 11. exit_interview_responses
  if (!(await knex.schema.hasTable("exit_interview_responses"))) {
    await knex.schema.createTable("exit_interview_responses", (t) => {
      t.uuid("id").primary();
      t.uuid("interview_id").notNullable().references("id").inTable("exit_interviews").onDelete("CASCADE");
      t.uuid("question_id").notNullable().references("id").inTable("exit_interview_questions").onDelete("CASCADE");
      t.text("answer_text").nullable();
      t.integer("answer_rating").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["interview_id"]);
    });
  }

  // 12. fnf_settlements — full & final settlement
  if (!(await knex.schema.hasTable("fnf_settlements"))) {
    await knex.schema.createTable("fnf_settlements", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.string("status", 20).notNullable().defaultTo("draft");
      t.bigInteger("basic_salary_due").notNullable().defaultTo(0);
      t.bigInteger("leave_encashment").notNullable().defaultTo(0);
      t.bigInteger("bonus_due").notNullable().defaultTo(0);
      t.bigInteger("gratuity").notNullable().defaultTo(0);
      t.bigInteger("notice_pay_recovery").notNullable().defaultTo(0);
      t.bigInteger("other_deductions").notNullable().defaultTo(0);
      t.bigInteger("other_earnings").notNullable().defaultTo(0);
      t.bigInteger("total_payable").notNullable().defaultTo(0);
      t.bigInteger("calculated_by").unsigned().nullable();
      t.bigInteger("approved_by").unsigned().nullable();
      t.date("paid_date").nullable();
      t.text("remarks").nullable();
      t.text("breakdown_json").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.unique(["exit_request_id"]);
    });
  }

  // 13. asset_returns — company assets to be returned
  if (!(await knex.schema.hasTable("asset_returns"))) {
    await knex.schema.createTable("asset_returns", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.string("category", 30).notNullable();
      t.string("asset_name", 200).notNullable();
      t.string("asset_tag", 100).nullable();
      t.string("status", 20).notNullable().defaultTo("pending");
      t.date("assigned_date").nullable();
      t.date("returned_date").nullable();
      t.bigInteger("verified_by").unsigned().nullable();
      t.text("condition_notes").nullable();
      t.bigInteger("replacement_cost").notNullable().defaultTo(0);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
      t.index(["exit_request_id", "status"]);
    });
  }

  // 14. knowledge_transfers — KT plans per exit
  if (!(await knex.schema.hasTable("knowledge_transfers"))) {
    await knex.schema.createTable("knowledge_transfers", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.bigInteger("assignee_id").unsigned().nullable();
      t.string("status", 20).notNullable().defaultTo("not_started");
      t.date("due_date").nullable();
      t.date("completed_date").nullable();
      t.text("notes").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
    });
  }

  // 15. kt_items — individual KT items
  if (!(await knex.schema.hasTable("kt_items"))) {
    await knex.schema.createTable("kt_items", (t) => {
      t.uuid("id").primary();
      t.uuid("kt_id").notNullable().references("id").inTable("knowledge_transfers").onDelete("CASCADE");
      t.string("title", 300).notNullable();
      t.text("description").nullable();
      t.string("status", 20).notNullable().defaultTo("not_started");
      t.string("document_url", 500).nullable();
      t.timestamp("completed_at").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["kt_id"]);
    });
  }

  // 16. letter_templates — org-level templates for exit letters
  if (!(await knex.schema.hasTable("letter_templates"))) {
    await knex.schema.createTable("letter_templates", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.string("letter_type", 30).notNullable();
      t.string("name", 200).notNullable();
      t.text("body_template").notNullable();
      t.boolean("is_default").notNullable().defaultTo(false);
      t.boolean("is_active").notNullable().defaultTo(true);
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "letter_type"]);
    });
  }

  // 17. generated_letters — letters generated for exits
  if (!(await knex.schema.hasTable("generated_letters"))) {
    await knex.schema.createTable("generated_letters", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.uuid("template_id").nullable().references("id").inTable("letter_templates").onDelete("SET NULL");
      t.string("letter_type", 30).notNullable();
      t.text("generated_body").notNullable();
      t.bigInteger("generated_by").unsigned().notNullable();
      t.date("issued_date").nullable();
      t.string("file_path", 500).nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["exit_request_id"]);
    });
  }

  // 18. alumni_profiles — opt-in alumni network
  if (!(await knex.schema.hasTable("alumni_profiles"))) {
    await knex.schema.createTable("alumni_profiles", (t) => {
      t.uuid("id").primary();
      t.uuid("exit_request_id").notNullable().references("id").inTable("exit_requests").onDelete("CASCADE");
      t.bigInteger("employee_id").unsigned().notNullable();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.string("personal_email", 200).nullable();
      t.string("phone", 20).nullable();
      t.string("linkedin_url", 300).nullable();
      t.boolean("opted_in").notNullable().defaultTo(true);
      t.string("last_designation", 100).nullable();
      t.string("last_department", 100).nullable();
      t.date("exit_date").nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("updated_at").defaultTo(knex.fn.now());

      t.index(["organization_id"]);
      t.unique(["exit_request_id"]);
    });
  }

  // 19. audit_logs — audit trail for all exit actions
  if (!(await knex.schema.hasTable("audit_logs"))) {
    await knex.schema.createTable("audit_logs", (t) => {
      t.uuid("id").primary();
      t.bigInteger("organization_id").unsigned().notNullable();
      t.uuid("exit_request_id").nullable();
      t.bigInteger("actor_id").unsigned().notNullable();
      t.string("action", 100).notNullable();
      t.string("entity_type", 50).notNullable();
      t.uuid("entity_id").nullable();
      t.text("old_value").nullable();
      t.text("new_value").nullable();
      t.string("ip_address", 45).nullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());

      t.index(["organization_id", "created_at"]);
      t.index(["exit_request_id"]);
      t.index(["actor_id"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    "audit_logs",
    "alumni_profiles",
    "generated_letters",
    "letter_templates",
    "kt_items",
    "knowledge_transfers",
    "asset_returns",
    "fnf_settlements",
    "exit_interview_responses",
    "exit_interviews",
    "exit_interview_questions",
    "exit_interview_templates",
    "clearance_records",
    "clearance_departments",
    "exit_checklist_instances",
    "exit_checklist_template_items",
    "exit_checklist_templates",
    "exit_requests",
    "exit_settings",
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
