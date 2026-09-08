import PostEditorPage from "@/features/post/admin/edit/page";
import { EditorMediaProvider } from "@/features/post/admin/edit/components/EditorMediaProvider";

export default function Page() {
  return (
    <EditorMediaProvider>
      <PostEditorPage />
    </EditorMediaProvider>
  );
}
