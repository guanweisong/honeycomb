import { Suspense } from "react";
import { PageEditorPage } from "./PageEditorPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageEditorPage />
    </Suspense>
  );
}
