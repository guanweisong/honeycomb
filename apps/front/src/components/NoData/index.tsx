import React from "react";

/**
 * 无数据组件的属性接口。
 */
export interface NoData {
  /**
   * 显示的提示文本。
   */
  title: string;
}

/**
 * 无数据提示组件。
 * 当没有数据可显示时，显示一个居中的提示文本。
 * @param {NoData} props - 组件属性。
 * @returns {JSX.Element} 无数据提示组件。
 */
const NoData = (props: NoData) => {
  const { title } = props;

  return <div className="py-20 text-center">{title}</div>;
};

export default NoData;
