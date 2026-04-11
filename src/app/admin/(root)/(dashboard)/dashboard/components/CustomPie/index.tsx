"use client";

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

/**
 * 饼图组件的属性接口。
 */
export interface PieProps {
  /**
   * 饼图的标题。
   */
  title: string;
  /**
   * 饼图的数据，包含项目名称和对应的计数。
   */
  data?: { item: string; count: number }[];
  /**
   * 饼图使用的颜色数组。
   */
  colors?: string[];
}

/**
 * 默认的颜色数组，用于饼图的颜色循环（扩充至 8 色）。
 */
const COLORS = [
  "oklch(60% 0.118 184.704)",
  "oklch(66.6% 0.179 58.318)",
  "oklch(60.9% 0.126 221.723)",
  "oklch(54.1% 0.281 293.009)",
  "oklch(59.2% 0.249 0.584)",
  "oklch(44.6% 0.03 256.802)",
  "oklch(46.6% 0.025 107.3)",
  "oklch(57.7% 0.245 27.325)",
];

/**
 * 自定义饼图组件。
 * 用于展示统计数据，支持自定义标题、数据和颜色。
 * @param {PieProps} { title, data, colors } - 组件属性。
 * @returns {JSX.Element} 饼图组件。
 */
const CustomPie = ({ title, data, colors = COLORS }: PieProps) => {
  // 按照 count 从大到小排序
  const sortedData = [...(data || [])].sort((a, b) => b.count - a.count);

  return (
    <div className="w-[380px] p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="text-center font-bold text-gray-700 mb-4">{title}</div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ left: 10, right: 10 }}>
            <Pie
              data={sortedData}
              cx="40%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="count"
              nameKey="item"
              stroke="none"
            >
              {data?.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingLeft: "10px" }}
              formatter={(value, entry: any) => {
                const { payload } = entry;
                const total =
                  data?.reduce((sum, item) => sum + item.count, 0) || 1;
                const percent = ((payload.count / total) * 100).toFixed(0);
                return (
                  <span className="text-xs text-gray-600">
                    <span className="inline-block w-16 truncate align-bottom">
                      {value}
                    </span>
                    <span className="ml-2 font-medium">{percent}%</span>
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CustomPie;
