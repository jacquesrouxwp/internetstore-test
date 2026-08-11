"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import {
  trackConsultClick,
  type ConsultChannel,
  type ConsultSource,
} from "@/lib/analytics/consult";

type Props = Omit<ComponentProps<"a">, "onClick"> & {
  channel: ConsultChannel;
  source: ConsultSource;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/** Anchor that logs consult intent before leaving the page. */
export function ConsultTrackLink({
  channel,
  source,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackConsultClick(channel, source);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
