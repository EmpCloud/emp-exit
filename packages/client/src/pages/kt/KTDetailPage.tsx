import { KTListPage } from "./KTListPage";

// KTDetailPage renders the same KT view — the list page already handles
// single-exit KT plans. This keeps the route working.
export function KTDetailPage() {
  return <KTListPage />;
}
