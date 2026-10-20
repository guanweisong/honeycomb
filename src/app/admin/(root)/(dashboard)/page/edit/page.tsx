import PageEditorPage from "@/features/page/admin/edit/page";
import { EditorMediaProvider } from "@/features/media/components/EditorMediaProvider/index";

export default function Page() {
  return (
    <EditorMediaProvider>
      <PageEditorPage />
    </EditorMediaProvider>
  );
}
