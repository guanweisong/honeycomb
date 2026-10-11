import { Suspense } from "react";
import { PageEditorPage } from "./components/PageEditorPage";
import LoadingState from "@/packages/ui/extended/LoadingState";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <PageEditorPage />
    </Suspense>
  );
}
