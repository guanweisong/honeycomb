import React from "react";

/**
 * 根据层级深度为分类名称生成前缀。
 * 主要用于在 UI 中以视觉方式表示分类的嵌套关系。
 *
 * @param {React.ReactNode} text - 分类名称的 React 节点。
 * @param {any} record - 包含分类信息的记录对象，预期包含 `deepPath` 属性，表示分类的深度。
 * @returns {JSX.Element} 带有层级前缀的分类名称的 JSX 元素。
 */
export function creatCategoryTitleByDepth(text: React.ReactNode, record: any) {
  let prefix = "";
  for (let i = 0; i < record.deepPath; i++) {
    prefix += "—— ";
  }
  return (
    <span className="flex">
      {prefix} {text}
    </span>
  );
}
