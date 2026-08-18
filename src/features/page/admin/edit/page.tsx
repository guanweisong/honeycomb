import { Suspense } from "react";
import { PageEditorPage } from "./components/PageEditorPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageEditorPage />
    </Suspense>
  );
}
