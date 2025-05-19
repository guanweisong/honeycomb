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

export interface BarProps {
  title: string;
  data?: { item: string; count: number }[];
  colors?: string[];
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a0e0f0"];

const CustomBar = ({ title, data, colors = COLORS }: BarProps) => {
  return (
    <div className="w-[360px]">
      <div className="text-center">{title}</div>
      <div className="h-[360px]">
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
