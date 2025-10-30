import React from "react";

/**
 * 页面标题组件的属性接口。
 */
export interface PageTitleProps {
  /**
   * 标题内容。
   */
  children: React.ReactNode;
}

/**
 * 页面标题组件。
 * 用于显示页面标题，并提供统一的样式。
 * @param {PageTitleProps} props - 组件属性。
 * @returns {JSX.Element} 页面标题组件。
 */
const PageTitle = (props: PageTitleProps) => {
  return (
    <h2 className="text-center font-normal text-xl mt-2 lg:mt-4">
      {props.children}
    </h2>
  );
};

export default PageTitle;
