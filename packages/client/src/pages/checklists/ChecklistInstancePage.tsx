import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  ClipboardCheck,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/api/client";
import { cn } from "@/lib/utils";
import { Page, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Select } from "@/components/ui/Field";

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  waived: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  na: "bg-muted/50 text-muted-foreground",
};

const STATUS_OPTIONS = ["pending", "in_progress", "completed", "waived", "na"];

interface Template {
  id: string;
  name: string;
  item_count: number;
}

export function ChecklistInstancePage() {
  const { t } = useTranslation();
  const { id: exitId } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    load();
  }, [exitId]);

  async function load() {
    setLoading(true);
    try {
      const [checklistRes, templatesRes] = await Promise.all([
        apiGet<any>(`/checklists/exit/${exitId}`),
        apiGet<Template[]>("/checklists/templates"),
      ]);
      setChecklist(checklistRes.data);
      setTemplates(templatesRes.data ?? []);
      if (templatesRes.data && templatesRes.data.length > 0) {
        setSelectedTemplate(templatesRes.data[0].id);
      }
    } catch {
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      await apiPost("/checklists/generate", {
        exit_request_id: exitId,
        template_id: selectedTemplate,
      });
      await load();
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateItem(itemId: string, status: string) {
    try {
      await apiPatch(`/checklists/items/${itemId}`, { status });
      // Optimistically update
      if (checklist) {
        setChecklist({
          ...checklist,
          items: checklist.items.map((i: any) =>
            i.id === itemId ? { ...i, status } : i,
          ),
        });
      }
      await load();
    } catch {
      // handled
    }
  }

  if (loading) {
    return <Card><LoadingState label={t("common.loading")} /></Card>;
  }

  const hasItems = checklist && checklist.items && checklist.items.length > 0;

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
        <Link
          to="/exits"
          className="mb-2 inline-flex min-h-10 items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> {t("checklists.backToExits")}
        </Link>
        <PageTitle>{t("checklists.instanceTitle")}</PageTitle>
        <PageDescription>{t("checklists.instanceSubtitle")}</PageDescription>
        </PageHeaderContent>
      </PageHeader>

      {/* Generate from template */}
      {templates.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("checklists.generateFromTemplate")}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="sm:max-w-xl"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {t("checklists.templateOption", { name: tmpl.name, count: tmpl.item_count })}
                </option>
              ))}
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedTemplate}
            >
              {generating && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {t("checklists.generate")}
            </Button>
          </div>
          {hasItems && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t("checklists.replaceWarning")}
            </p>
          )}
        </Card>
      )}

      {/* Checklist items */}
      <Card className="overflow-hidden">
        {!hasItems ? (
          <EmptyState icon={ClipboardCheck} title={t("checklists.noItemsYet")} />
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("checklists.progress", { completed: checklist.completed, total: checklist.total, progress: checklist.progress })}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${checklist.progress}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-border">
              {checklist.items.map((item: any) => (
                <div key={item.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-3 flex-1">
                    {item.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.status === "completed"
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        )}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                      {item.remarks && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{item.remarks}</p>
                      )}
                    </div>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateItem(item.id, e.target.value)}
                    className={cn(
                      "min-h-10 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold sm:w-auto",
                      CHECKLIST_STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                    )}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{t(`checklists.itemStatus.${s}`)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
