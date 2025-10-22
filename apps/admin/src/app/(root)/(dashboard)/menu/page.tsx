"use client";

import { creatCategoryTitleByDepth } from "@/utils/help";
import { Tabs } from "@honeycomb/ui/extended/Tabs";
import { Checkbox } from "@honeycomb/ui/extended/Checkbox";
import { Button } from "@honeycomb/ui/components/button";
import SortableTree, {
  getFlatDataFromTree,
  getTreeFromFlatData,
  // @ts-ignore
} from "@nosferatu500/react-sortable-tree";
import "@nosferatu500/react-sortable-tree/style.css";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { useEffect, useState } from "react";
import { MenuType, MenuTypeName } from "@honeycomb/types/menu/menu.type";
import { CategoryEntity } from "@honeycomb/validation/category/schemas/category.entity.schema";
import { PageEntity } from "@honeycomb/validation/page/schemas/page.entity.schema";
import { MenuItem } from "@honeycomb/types/menu/menu.item";

/**
 * 菜单管理页面。
 * 允许管理员配置网站的导航菜单，支持从页面和分类中选择菜单项，并进行拖拽排序。
 */
const Menu = () => {
  /**
   * 保存所有菜单的 tRPC mutation。
   */
  const saveAllMenu = trpc.menu.saveAll.useMutation();

  /**
   * 获取页面列表的 tRPC 查询。
   * 用于在可选菜单中展示页面。
   */
  const { data: pageList } = trpc.page.index.useQuery({ limit: 9999 });
  /**
   * 获取分类列表的 tRPC 查询。
   * 用于在可选菜单中展示分类。
   */
  const { data: categoryList } = trpc.category.index.useQuery({ limit: 9999 });
  /**
   * 获取已选菜单数据的 tRPC 查询。
   * `checkedData` 包含已选菜单列表，`refetch` 用于手动重新获取数据。
   */
  const { data: checkedData, refetch } = trpc.menu.index.useQuery(undefined);

  /**
   * 存储当前已选中的菜单项列表。
   */
  const [checkedList, setCheckedList] = useState<MenuItem[]>([]);

  /**
   * 副作用钩子，用于在 `checkedData` 变化时更新 `checkedList` 状态。
   * 确保在菜单数据加载或更新后，本地状态与远程数据同步。
   */
  useEffect(() => {
    setCheckedList(checkedData?.list ?? []);
  }, [checkedData]);

  /**
   * 可选菜单的取消选中事件
   * @param id
   */
  /**
   * 从 `checkedList` 中移除指定 ID 的菜单项。
   * @param {string} id - 要移除的菜单项的 ID。
   */
  const removeItem = (id: string) => {
    const newArr = [...checkedList];
    checkedList?.forEach((item, index) => {
      if (item.id === id) {
        newArr.splice(index, 1);
      }
    });
    setCheckedList(newArr);
  };

  /**
   * 可选菜单的选中事件
   * @param item
   * @param checked
   * @param type
   */
  /**
   * 处理可选菜单项的选中/取消选中事件。
   * 根据 `checked` 状态将菜单项添加到 `checkedList` 或从其中移除。
   * @param {MenuEntity} item - 被选中/取消选中的菜单项。
   * @param {boolean} checked - 是否选中。
   * @param {MenuType} type - 菜单项的类型（例如 `CATEGORY` 或 `PAGE`）。
   */
  const onCheck = (item: MenuItem, checked: boolean, type: MenuType) => {
    if (checked) {
      setCheckedList([...checkedList, { ...item, parent: "0", type }]);
    } else {
      removeItem(item.id);
    }
  };

  /**
   * 获取可选菜单选中状态
   * @param item
   * @returns {boolean}
   */
  /**
   * 获取可选菜单项的选中状态。
   * 遍历 `checkedList` 判断当前菜单项是否已被选中。
   * @param {CategoryEntity | PageEntity} item - 要检查的菜单项。
   * @returns {boolean} 如果菜单项已被选中则返回 `true`，否则返回 `false`。
   */
  const getCheckedStatus = (item: CategoryEntity | PageEntity): boolean => {
    let checked = false;
    checkedList?.forEach((m) => {
      if (m.id === item.id) {
        checked = true;
      }
    });
    return checked;
  };

  /**
   * 获取可选菜单禁用状态
   * @param item
   * @returns {boolean}
   */
  /**
   * 获取可选菜单项的禁用状态。
   * 如果当前菜单项是其他已选中菜单项的父级，则禁用该菜单项，防止循环引用。
   * @param {CategoryEntity | PageEntity} item - 要检查的菜单项。
   * @returns {boolean} 如果菜单项应被禁用则返回 `true`，否则返回 `false`。
   */
  const getDisabledStatus = (item: CategoryEntity | PageEntity): boolean => {
    let disabled = false;
    checkedList?.forEach((m) => {
      if (m.parent === item.id) {
        disabled = true;
      }
    });
    return disabled;
  };

  /**
   * 排序的回调
   * @param treeData
   */
  /**
   * 拖拽排序结束时的回调函数。
   * 将拖拽后的树形数据扁平化，并更新 `checkedList`，以反映新的排序和父子关系。
   * @param {MenuItem[]} treeData - 拖拽后的树形数据。
   */
  const onDragEnd = (treeData: MenuItem[]) => {
    const listData = getFlatDataFromTree({
      treeData,
      getNodeKey: ({ node }: { node: MenuItem }) => (node as MenuItem).id,
      ignoreCollapsed: false,
    }) as { node: MenuItem; parentNode: MenuItem | null }[];

    const list: MenuItem[] = listData.map(({ node, parentNode }) => ({
      ...node,
      parent: parentNode?.id ?? "0",
      expanded: !!node.children,
    }));

    setCheckedList(list);
  };

  /**
   * 将菜单扁平数据转换为树组件输入数据
   * @returns {Object[]}
   */
  /**
   * 将 `checkedList` 中的扁平菜单数据转换为 `react-sortable-tree` 组件所需的树形结构数据。
   * @returns {Object[]} 格式化后的树形菜单数据。
   */
  const getMenuFormat = () => {
    const format: any[] = [];
    checkedList?.forEach((item) => {
      format.push({
        ...item,
        title: item.title?.zh ?? item.title,
        subtitle: MenuTypeName[item.type as MenuType],
        expanded: true,
      });
    });
    const tree = getTreeFromFlatData({
      flatData: format,
      // @ts-ignore
      getKey: (node) => node.id,
      // @ts-ignore
      getParentKey: (node) => node.parent,
      // @ts-ignore
      rootKey: null,
    });
    return tree;
  };

  /**
   * 保存数据
   */
  /**
   * 提交菜单数据到后端保存。
   * 将 `checkedList` 中的菜单项转换为后端所需的格式，并调用 `saveAllMenu` mutation 进行保存。
   */
  const submit = async () => {
    const data: MenuItem[] = [];
    checkedList?.forEach((item, index) => {
      const menu = {
        id: item.id,
        type: item.type,
        power: index,
      } as MenuItem;
      if (item.parent !== "0") {
        menu.parent = item.parent;
      }
      data.push(menu);
    });
    try {
      await saveAllMenu.mutateAsync(data as any);
      toast.success("更新成功");
      refetch();
    } catch (e) {
      toast.error("更新失败");
    }
  };

  console.log("categoryList", categoryList);
  console.log("checkedList", checkedList);
  console.log("pageList", pageList);

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
                          // @ts-ignore
                          onCheck(item, checked, MenuType.CATEGORY)
                        }
                        checked={getCheckedStatus(item)}
                        disabled={getDisabledStatus(item)}
                        label={creatCategoryTitleByDepth(item.title.zh, item)}
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
                          // @ts-ignore
                          onCheck(item, checked, MenuType.PAGE)
                        }
                        // @ts-ignore
                        defaultChecked={getCheckedStatus(item)}
                        // @ts-ignore
                        disabled={getDisabledStatus(item)}
                        label={item.title.zh}
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
          {checkedList?.length > 0
            ? "拖拽下方菜单进行排序"
            : "请先从左侧选择菜单"}
        </div>
        <Button onClick={submit} className="mb-1 mt-2">
          <Save /> 保存
        </Button>
        <div className="bg-gray-50 my-2 py-2">
          <SortableTree
            treeData={getMenuFormat()}
            onChange={onDragEnd}
            rowHeight={50}
            isVirtualized={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Menu;
