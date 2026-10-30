import { Suspense } from "react";
import { PageEditorPage } from "@/app/admin/(dashboard)/page/edit/components/PageEditorPage";
import { EditorMediaProvider } from "@/app/admin/(dashboard)/components/EditorMediaProvider/index";
import LoadingState from "@/components/LoadingState";

export default function Page() {
  return (
    <EditorMediaProvider>
      <Suspense fallback={<LoadingState variant="region" />}>
        <PageEditorPage />
      </Suspense>
    </EditorMediaProvider>
  );
}
