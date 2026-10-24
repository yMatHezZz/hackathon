import { Fragment } from "react";
import { pylonArticleUrl } from "@/lib/knowledge-links";
export function MessageText({ text }: { text: string }) {
  return <>{text.split(/(https:\/\/[^\s<>]+)/g).map((part, index) => {
    const url = pylonArticleUrl(part);
    return url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="break-all font-medium underline underline-offset-2">{part}</a> : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
