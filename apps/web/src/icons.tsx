import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowUpRight(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

export function Check(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m5 12 4 4L19 6" /></svg>;
}

export function ChevronDown(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m6 9 6 6 6-6" /></svg>;
}

export function Clipboard(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="7" y="4" width="10" height="16" rx="2" /><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6" /></svg>;
}

export function Copy(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
}

export function CornerArrow(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M6 8v4a4 4 0 0 0 4 4h8M14 12l4 4-4 4" /></svg>;
}

export function Search(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
}

export function Shield(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M12 3 5 6v5c0 4.5 2.8 8.1 7 10 4.2-1.9 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function Spark(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m12 3 1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7L12 3ZM18.5 15l.6 2.1 1.9.9-1.9.9-.6 2.1-.6-2.1L16 18l1.9-.9.6-2.1Z" /></svg>;
}

export function XMark(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
