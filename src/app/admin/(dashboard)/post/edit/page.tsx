import PostEditorPage from "@/features/post/admin/edit/page";
import { EditorMediaProvider } from "@/features/media/admin/components/EditorMediaProvider/index";

export default function Page() {
  return (
    <EditorMediaProvider>
      <PostEditorPage />
    </EditorMediaProvider>
  );
}
