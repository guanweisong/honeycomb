"use client";

import SortableTree from "@nosferatu500/react-sortable-tree";
import { Save } from "lucide-react";
import { creatCategoryTitleByDepth } from "@/app/admin/lib/help";
import { useCan } from "@/app/admin/hooks/use-current-user";
import { Permission } from "@/packages/identity/auth/permissions";
import { MenuType } from "@/packages/domain/navigation/menu";
import { Button } from "@/packages/ui/components/button";
import { Checkbox } from "@/packages/ui/extended/Checkbox";
import { Tabs } from "@/packages/ui/extended/Tabs";
import { useMenuActions } from "../../actions/menu-actions";
import { useMenuQuery } from "../../queries/menu-query";
import { useMenuTreeEditor } from "../../hooks/use-menu-tree-editor";

export function MenuPageShell() {
  const canUpdateMenu = useCan(Permission.menuUpdate);
  const { pageList, categoryList, checkedData, refetchMenu } = useMenuQuery();
  const editor = useMenuTreeEditor(checkedData);
  const { submit } = useMenuActions(editor.checkedList, refetchMenu);

  return (
    <div className="flex gap-6">
      <div className="w-72">
        <div className="text-lg">可选菜单项</div>
        <div className="text-gray-500">勾选菜单项添加到右侧</div>
        <Tabs
          className="mt-3"
          tabs={[
            {
              label: "分类",
              value: "1",
              content: (
                <div className="overflow-y-auto bg-gray-50 py-2">
                  {categoryList?.list?.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 leading-8 transition-all hover:bg-gray-100"
                    >
                      <Checkbox
                        onCheckedChange={(checked) =>
                          editor.onCheck(
                            item,
                            checked === true,
                            MenuType.CATEGORY,
                          )
                        }
                        checked={editor.getCheckedStatus(item)}
                        disabled={editor.getDisabledStatus(item)}
                        label={creatCategoryTitleByDepth(item.title?.zh, item)}
                      />
                    </div>
                  ))}
                </div>
              ),
            },
            {
              label: "页面",
              value: "2",
              content: (
                <div className="overflow-y-auto bg-gray-50 py-2">
                  {pageList?.list?.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 leading-8 transition-all hover:bg-gray-100"
                    >
                      <Checkbox
                        onCheckedChange={(checked) =>
                          editor.onCheck(item, checked === true, MenuType.PAGE)
                        }
                        checked={editor.getCheckedStatus(item)}
                        disabled={editor.getDisabledStatus(item)}
                        label={item.title?.zh}
                      />
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="flex-1">
        <div className="text-lg">菜单结构</div>
        <div className="text-gray-500">
          {editor.checkedList.length > 0
            ? "拖拽下方菜单进行排序"
            : "请先从左侧选择菜单"}
        </div>
        {canUpdateMenu && (
          <Button onClick={submit} className="mb-1 mt-2">
            <Save /> 保存
          </Button>
        )}
        <div className="bg-gray-50 my-2 py-2">
          <SortableTree
            treeData={editor.menuTree}
            onChange={editor.onDragEnd}
            rowHeight={50}
            isVirtualized={false}
          />
        </div>
      </div>
    </div>
  );
}
/**
 * 菜单管理页组件，负责菜单树编辑、选择和保存操作。
 */
