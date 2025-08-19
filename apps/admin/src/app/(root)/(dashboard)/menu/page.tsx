"use client";

import { PageEntity } from "@/app/(root)/(dashboard)/page/types/page.entity";
import { creatCategoryTitleByDepth } from "@/utils/help";
import { Tabs } from "@honeycomb/ui/extended/Tabs";
import { Checkbox } from "@honeycomb/ui/extended/Checkbox";
import { Button } from "@honeycomb/ui/components/button";
import { useEffect, useState } from "react";
import SortableTree, {
  TreeItem,
  getFlatDataFromTree,
  getTreeFromFlatData,
} from "react-sortable-tree";
import "react-sortable-tree/style.css";
import { CategoryEntity } from "../post/category/types/category.entity";
import { MenuType, MenuTypeName } from "./types/MenuType";
import type { MenuEntity } from "./types/menu.entity";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";

const Menu = () => {
  const [pageList, setPageList] = useState<PageEntity[]>([]);
  const [categoryList, setCategoryList] = useState<CategoryEntity[]>([]);
  const [checkedList, setCheckedList] = useState<MenuEntity[]>([]);

  /**
   * 查询页面集合
   */
  const pageIndexQuery = trpc.page.index.useQuery({ limit: 9999 } as any, { enabled: false });
  const indexPage = async () => {
    const res = await pageIndexQuery.refetch();
    if (res.data) setPageList(res.data.list as any);
  };

  /**
   * 查询分类列表
   */
  const categoryIndexQuery = trpc.category.index.useQuery({ limit: 9999 } as any, { enabled: false });
  const indexCategory = async () => {
    const res = await categoryIndexQuery.refetch();
    if (res.data) setCategoryList(res.data.list as any);
  };

  /**
   * 查询菜单集合
   */
  const menuIndexQuery = trpc.menu.index.useQuery(undefined, { enabled: false });
  const indexMenu = async () => {
    const res = await menuIndexQuery.refetch();
    if (res.data) setCheckedList(res.data.list as any);
  };

  useEffect(() => {
    indexCategory();
    indexPage();
    indexMenu();
  }, []);

  /**
   * 可选菜单的取消选中事件
   * @param id
   */
  const removeItem = (id: string) => {
    const newArr = [...checkedList];
    checkedList.forEach((item, index) => {
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
  const onCheck = (item: MenuEntity, checked: boolean, type: MenuType) => {
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
  const getCheckedStatus = (item: CategoryEntity | PageEntity) => {
    let checked = false;
    checkedList.forEach((m) => {
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
  const getDisabledStatus = (item: CategoryEntity | PageEntity) => {
    let disabled = false;
    checkedList.forEach((m) => {
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
  const onDragEnd = (treeData: TreeItem[]) => {
    const listData = getFlatDataFromTree({
      treeData,
      // @ts-ignore
      getNodeKey: (node) => node.id,
    });
    const list = listData.map(({ node, parentNode }) => ({
      ...node,
      // @ts-ignore
      parent: parentNode ? parentNode.id : "0",
      expanded: !!node.children,
    }));
    // @ts-ignore
    setCheckedList(list);
  };

  /**
   * 将菜单扁平数据转换为树组件输入数据
   * @returns {Object[]}
   */
  const getMenuFormat = () => {
    const format: any[] = [];
    checkedList.forEach((item) => {
      format.push({
        ...item,
        title: item.title.zh ?? item.title,
        subtitle: MenuTypeName[MenuType[item.type]],
        expanded: true,
      });
    });
    const tree = getTreeFromFlatData({
      flatData: format,
      // @ts-ignore
      getKey: (node) => node.id,
      // @ts-ignore
      getParentKey: (node) => node.parent,
    });
    return tree;
  };

  /**
   * 保存数据
   */
  const saveAllMenu = trpc.menu.saveAll.useMutation();
  const submit = async () => {
    const data: MenuEntity[] = [];
    checkedList.forEach((item, index) => {
      const menu = {
        id: item.id,
        type: item.type,
        power: index,
      } as MenuEntity;
      if (item.parent !== "0") {
        menu.parent = item.parent;
      }
      data.push(menu);
    });
    try {
      await saveAllMenu.mutateAsync(data as any);
      toast.success("更新成功");
      indexMenu();
    } catch (e) {
      toast.error("更新失败");
    }
  };

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
                  {categoryList.map((item) => (
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
                  {pageList.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 leading-8 transition-all hover:bg-gray-100"
                    >
                      <Checkbox
                        onCheckedChange={(checked) =>
                          // @ts-ignore
                          onCheck(item, checked, MenuType.PAGE)
                        }
                        defaultChecked={getCheckedStatus(item)}
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
          {checkedList.length > 0
            ? "拖拽下方菜单进行排序"
            : "请先从左侧选择菜单"}
        </div>
        <Button onClick={submit} className="mb-1 mt-2">
          <Save /> 保存
        </Button>
        <div className="bg-gray-50 my-2 py-2">
          <SortableTree
            treeData={getMenuFormat()}
            onChange={(treeData) => onDragEnd(treeData)}
            rowHeight={50}
            isVirtualized={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Menu;
