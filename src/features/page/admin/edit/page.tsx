import { Suspense } from "react";
import { PageEditorPage } from "./components/PageEditorPage";
import LoadingState from "@/components/LoadingState";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <PageEditorPage />
    </Suspense>
  );
}
