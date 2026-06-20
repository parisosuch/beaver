import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/beaver/project-member";

export const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  owner: {
    label: "Owner",
    description: "Full control: manage members, project settings, channels, and events.",
  },
  maintainer: {
    label: "Maintainer",
    description: "Manage channels and channel groups; view all events.",
  },
  guest: {
    label: "Guest",
    description: "View-only access to channels and events.",
  },
};

export function RoleSelectItem({ role }: { role: Role }) {
  const info = ROLE_INFO[role];
  return (
    <SelectPrimitive.Item
      value={role}
      textValue={info.label}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default flex-col items-start gap-0.5 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      <span className="absolute right-2 top-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{info.label}</SelectPrimitive.ItemText>
      <span className="text-xs text-muted-foreground pr-2">{info.description}</span>
    </SelectPrimitive.Item>
  );
}
