"use client";

import * as React from "react";
import * as BaseAvatar from "../../components/avatar";
import { cn } from "../../lib/utils";

type AvatarRootProps = React.ComponentProps<typeof BaseAvatar.Avatar>;
type AvatarImageProps = React.ComponentProps<typeof BaseAvatar.AvatarImage>;
type AvatarFallbackProps = React.ComponentProps<
  typeof BaseAvatar.AvatarFallback
>;

export interface AvatarProps extends Omit<AvatarRootProps, "children"> {
  src?: string;
  url?: string;
  alt?: string;
  name?: string;
  fallback?: React.ReactNode;
  imageProps?: Omit<AvatarImageProps, "src" | "alt" | "className">;
  fallbackProps?: Omit<AvatarFallbackProps, "children" | "className">;
  imageClassName?: string;
  fallbackClassName?: string;
  badge?: React.ReactNode;
  badgeClassName?: string;
  status?: "online" | "offline" | "busy" | "away";
}

const statusClassMap: Record<NonNullable<AvatarProps["status"]>, string> = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  busy: "bg-rose-500",
  away: "bg-amber-500",
};

function getInitials(name?: string) {
  if (!name) {
    return "";
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function Avatar({
  src,
  url,
  alt,
  name,
  fallback,
  imageProps,
  fallbackProps,
  imageClassName,
  fallbackClassName,
  badge,
  badgeClassName,
  status,
  ...rootProps
}: AvatarProps) {
  const imageSrc = src ?? url;
  const fallbackContent = fallback ?? (getInitials(name) || "?");

  return (
    <BaseAvatar.Avatar {...rootProps}>
      {imageSrc ? (
        <BaseAvatar.AvatarImage
          {...imageProps}
          src={imageSrc}
          alt={alt ?? name ?? "avatar"}
          className={cn(imageClassName)}
        />
      ) : null}
      <BaseAvatar.AvatarFallback
        {...fallbackProps}
        className={cn(fallbackClassName)}
      >
        {fallbackContent}
      </BaseAvatar.AvatarFallback>
      {badge ? (
        <BaseAvatar.AvatarBadge className={badgeClassName}>
          {badge}
        </BaseAvatar.AvatarBadge>
      ) : status ? (
        <BaseAvatar.AvatarBadge
          className={cn(
            "border border-background",
            statusClassMap[status],
            badgeClassName,
          )}
          aria-label={`status-${status}`}
        />
      ) : null}
    </BaseAvatar.Avatar>
  );
}

export const AvatarGroup = BaseAvatar.AvatarGroup;
export const AvatarGroupCount = BaseAvatar.AvatarGroupCount;
export const AvatarBadge = BaseAvatar.AvatarBadge;
