"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

/**
 * 柱状图组件的属性接口。
 */
export interface BarProps {
  /**
   * 柱状图的标题。
   */
  title: string;
  /**
   * 柱状图的数据，包含项目名称和对应的计数。
   */
  data?: { item: string; count: number }[];
  /**
   * 柱状图使用的颜色数组。
   */
  colors?: string[];
}

/**
 * 默认的颜色数组，用于柱状图的颜色循环。
 */
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a0e0f0"];

/**
 * 自定义柱状图组件。
 * 用于展示统计数据，支持自定义标题、数据和颜色。
 * @param {BarProps} { title, data, colors } - 组件属性。
 * @returns {JSX.Element} 柱状图组件。
 */
const CustomBar = ({ title, data, colors = COLORS }: BarProps) => {
  return (
    <div className="w-[360px]">
      <div className="text-center">{title}</div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" />
            <YAxis domain={[1, "auto"]} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" barSize={40} radius={[4, 4, 0, 0]}>
              {data?.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CustomBar;
