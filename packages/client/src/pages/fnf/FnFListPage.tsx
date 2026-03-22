import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  DollarSign,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-gray-100 text-gray-600", label: "Draft" },
  calculated: { bg: "bg-blue-100 text-blue-700", label: "Calculated" },
  approved: { bg: "bg-green-100 text-green-700", label: "Approved" },
  paid: { bg: "bg-emerald-100 text-emerald-700", label: "Paid" },
};

export function FnFListPage() {
  const navigate = useNavigate();
  const [exitIdSearch, setExitIdSearch] = useState("");

  const handleGoToFnF = () => {
    if (exitIdSearch.trim()) {
      navigate(`/fnf/${exitIdSearch.trim()}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-rose-600" />
          Full & Final Settlements
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage FnF calculations, approvals, and payments.
        </p>
      </div>

      {/* Quick lookup */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 mb-3">Look up FnF by Exit ID</h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={exitIdSearch}
              onChange={(e) => setExitIdSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGoToFnF()}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="Enter exit request ID..."
            />
          </div>
          <button
            onClick={handleGoToFnF}
            disabled={!exitIdSearch.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            View FnF
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            FnF settlements are linked to exit requests
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
            Navigate to an exit request to calculate, adjust, approve, and process the full and
            final settlement. Each exit request has one FnF settlement record.
          </p>
          <button
            onClick={() => navigate("/exits")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
          >
            View Exits
          </button>
        </div>

        {/* FnF workflow */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 text-center mb-4">Settlement Workflow</h4>
          <div className="flex items-center justify-center gap-2">
            {["draft", "calculated", "approved", "paid"].map((status, idx) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      cfg.bg,
                    )}
                  >
                    {cfg.label}
                  </span>
                  {idx < 3 && <ArrowRight className="h-4 w-4 text-gray-300" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
