import { Suspense } from "react";
import { PageEditorPage } from "@/features/page/admin/edit/components/PageEditorPage";
import { EditorMediaProvider } from "@/features/media/admin/components/EditorMediaProvider/index";
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
