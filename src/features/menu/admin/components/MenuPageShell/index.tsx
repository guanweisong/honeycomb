"use client";

import {
  getVisibleNodeCount,
  SortableTree,
} from "@nosferatu500/react-sortable-tree";
import { useState } from "react";
import { toast } from "sonner";
import type { CheckedMenuData } from "../../menu-transforms";
import { Save } from "lucide-react";
import { creatCategoryTitleByDepth } from "@/features/category/admin/category-title";
import { useCan, useCurrentUser } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import { MenuType } from "@/features/menu/menu-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/Checkbox";
import { Tabs } from "@/components/Tabs";
import LoadingState from "@/components/LoadingState";
import { useMenuActions } from "../../menu-actions";
import { useMenuQuery } from "../../menu-query";
import { useMenuTreeEditor } from "../../use-menu-tree-editor";

const MENU_TREE_ROW_HEIGHT = 50;

export function MenuPageShell() {
  const { user } = useCurrentUser();
  return <MenuEditor key={user?.id ?? "signed-out"} />;
}

function MenuEditor() {
  const canUpdateMenu = useCan(Permission.menuUpdate);
  const {
    pageList,
    categoryList,
    checkedData,
    pageLoading,
    categoryLoading,
    categoryError,
    categoryFetching,
    retryCategory,
    pageError,
    pageFetching,
    retryPages,
    menuLoading,
    menuError,
    menuFetching,
    refetchMenu,
  } = useMenuQuery();
  const editor = useMenuTreeEditor(checkedData);
  const hasBaseline = editor.baseVersion !== undefined;
  const { submit, loading, blocked, clearBlocked } = useMenuActions(
    editor.checkedList,
    editor.baseVersion,
    refetchMenu,
    editor.acknowledge,
    editor.setProtected,
  );
  const [latest, setLatest] = useState<CheckedMenuData>();
  const reviewLatest = async () => {
    try {
      const response = await refetchMenu();
      if (!response.isSuccess || !response.data) throw new Error("refresh");
      setLatest(response.data);
    } catch {
      toast.error("最新菜单读取失败，本地输入已保留");
    }
  };
  const menuTreeHeight =
    Math.max(getVisibleNodeCount({ treeData: editor.menuTree }), 1) *
    MENU_TREE_ROW_HEIGHT;

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
                  {categoryError && (
                    <div role="alert">
                      分类加载失败。
                      <Button
                        disabled={categoryFetching}
                        onClick={() => void retryCategory()}
                      >
                        重试加载分类
                      </Button>
                    </div>
                  )}
                  {categoryLoading && !categoryList?.list?.length ? (
                    <LoadingState variant="region" />
                  ) : (
                    categoryList?.list?.map((item) => (
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
                          label={creatCategoryTitleByDepth(
                            item.title?.zh,
                            item,
                          )}
                        />
                      </div>
                    ))
                  )}
                </div>
              ),
            },
            {
              label: "页面",
              value: "2",
              content: (
                <div className="overflow-y-auto bg-gray-50 py-2">
                  {pageError && (
                    <div role="alert">
                      {pageList?.list?.length
                        ? "部分页面未加载。"
                        : "页面加载失败。"}
                      <Button
                        disabled={pageFetching}
                        onClick={() => void retryPages()}
                      >
                        重试加载页面
                      </Button>
                    </div>
                  )}
                  {pageLoading && !pageList?.list?.length ? (
                    <LoadingState variant="region" />
                  ) : (
                    pageList?.list?.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 leading-8 transition-all hover:bg-gray-100"
                      >
                        <Checkbox
                          onCheckedChange={(checked) =>
                            editor.onCheck(
                              item,
                              checked === true,
                              MenuType.PAGE,
                            )
                          }
                          checked={editor.getCheckedStatus(item)}
                          disabled={editor.getDisabledStatus(item)}
                          label={item.title?.zh}
                        />
                      </div>
                    ))
                  )}
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
          <Button
            onClick={submit}
            disabled={
              loading ||
              blocked ||
              editor.baseVersion === undefined ||
              !editor.dirty
            }
            className="mb-1 mt-2"
          >
            <Save /> 保存
          </Button>
        )}
        {!hasBaseline && menuError && (
          <div role="alert">
            菜单读取失败，请重试后再编辑。
            <Button disabled={menuFetching} onClick={() => void refetchMenu()}>
              重试加载菜单
            </Button>
          </div>
        )}
        {blocked && (
          <div role="alert">
            保存发生冲突或结果未知，请先核对服务器。
            <Button onClick={reviewLatest}>读取最新菜单供核对</Button>
          </div>
        )}
        {latest && (
          <div>
            <p>
              服务器版本 {latest.version}
              。确认后保留本地菜单，以此版本继续保存；或放弃本地更改。
            </p>
            <pre className="max-h-48 overflow-auto">
              {JSON.stringify(latest.list, null, 2)}
            </pre>
            <Button
              onClick={() => {
                editor.acceptLatest(latest, true);
                clearBlocked();
                setLatest(undefined);
              }}
            >
              已核对，保留本地并使用此版本
            </Button>
            <Button
              onClick={() => {
                editor.acceptLatest(latest, false);
                clearBlocked();
                setLatest(undefined);
              }}
            >
              放弃本地，加载服务器菜单
            </Button>
          </div>
        )}
        <div className="bg-gray-50 my-2 py-2">
          {menuLoading ? (
            <LoadingState variant="region" />
          ) : (
            <SortableTree
              aria-label="菜单结构"
              className="menu-tree"
              treeData={editor.menuTree}
              canDrag={hasBaseline}
              onChange={editor.onDragEnd}
              generateNodeProps={({ node }) => ({
                buttons:
                  canUpdateMenu && typeof node.id === "string"
                    ? [
                        <Button
                          key="remove"
                          size="sm"
                          variant="outline"
                          disabled={!hasBaseline}
                          aria-label={`移除此菜单及子项：${node.title}`}
                          onClick={() => {
                            if (typeof node.id === "string")
                              editor.removeBranch(node.id);
                          }}
                        >
                          移除
                        </Button>,
                      ]
                    : [],
              })}
              rowHeight={MENU_TREE_ROW_HEIGHT}
              style={{ height: menuTreeHeight }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * 菜单管理页组件，负责菜单树编辑、选择和保存操作。
 */
