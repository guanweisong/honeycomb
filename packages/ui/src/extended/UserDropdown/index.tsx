import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@honeycomb/ui/components/dropdown-menu";
import { ChevronsUpDown, LogOut } from "lucide-react";
import React from "react";
import { Avatar } from "@honeycomb/ui/components/avatar";
import { UserLevelName } from "@honeycomb/types/user/user.level";
import { UserEntity } from "@honeycomb/validation/src/user/schemas/user.entity.schema";

export interface UserDropdownProps {
  user?: UserEntity | false;
  onLogout: () => void;
}

export const UserDropdown = (props: UserDropdownProps) => {
  const { user, onLogout } = props;

  if (!user) {
    return;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center hover:bg-gray-200 cursor-pointer transition px-3 py-1 rounded-sm">
          <Avatar url="/logo.jpg" fallback={user.name} />
          <div className="flex-1 mx-3">
            <div>{user.name}</div>
            <div className="text-gray-500 text-xs">
              {UserLevelName[user.level as keyof typeof UserLevelName]}
            </div>
          </div>
          <ChevronsUpDown size={18} strokeWidth={1.5} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>账户</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
