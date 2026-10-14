import { Fragment, type ReactNode } from "react";
import { runs, type Run, type TextMark } from "../lib/articles/marks";

function wrap(run: Run, key: number): ReactNode {
  const find = (type: TextMark["type"]) => run.marks.find((mark) => mark.type === type);
  let node: ReactNode = run.text;
  if (find("code")) node = <code>{node}</code>;
  if (find("strike")) node = <s>{node}</s>;
  if (find("highlight")) node = <mark>{node}</mark>;
  if (find("italic")) node = <em>{node}</em>;
  if (find("bold")) node = <strong>{node}</strong>;
  const link = find("link");
  if (link?.href) {
    const external = /^https:\/\//.test(link.href);
    node = <a href={link.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{node}</a>;
  }
  return <Fragment key={key}>{node}</Fragment>;
}

/** Plain text with its inline marks (bold, italic, strike, highlight, code, link) as nested elements. Text offsets are unchanged. */
export function MarkedText({ text, marks }: { text: string; marks?: readonly TextMark[] }) {
  if (!marks?.length) return <>{text}</>;
  return <>{runs(text, marks).map((run, index) => wrap(run, index))}</>;
}
