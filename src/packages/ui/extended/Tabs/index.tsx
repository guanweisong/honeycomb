"use client";

import * as React from "react";
import {
  Tabs as BaseTabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/tabs"; // 请根据实际路径导入

export interface TabsProps {
  tabs: {
    value: string;
    label: React.ReactNode;
    content: React.ReactNode;
    disabled?: boolean;
  }[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  contentClassName?: string;
}

export function Tabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
  contentClassName,
}: TabsProps) {
  return (
    <BaseTabs
      defaultValue={defaultValue || tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsList>
        {tabs.map(({ value, label, disabled }) => (
          <TabsTrigger key={value} value={value} disabled={disabled}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(({ value, content }) => (
        <TabsContent key={value} value={value} className={contentClassName}>
          {content}
        </TabsContent>
      ))}
    </BaseTabs>
  );
}
