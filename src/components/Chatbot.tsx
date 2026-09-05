"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BsChatDotsFill, BsSend, BsX } from "react-icons/bs";
import { useSiteData } from "@/lib/site-data";
import {
  QUICK_REPLIES,
  buildFaqs,
  findAnswer,
  type ChatLink,
} from "@/lib/chatbot";

type Message = {
  role: "user" | "bot";
  text: string;
  links?: ChatLink[];
};

const GREETING =
  "Sai Ram! I am the Samithi assistant. Ask me about class timings, events, seva activities, or how to join.";

export default function Chatbot() {
  const data = useSiteData();
  const faqs = useMemo(() => buildFaqs(data), [data]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: GREETING },
  ]);
  const [chips, setChips] = useState<string[]>(QUICK_REPLIES.slice(0, 4));
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const answer = findAnswer(text, faqs);
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: answer.text, links: answer.links },
    ]);
    setChips(answer.followUps);
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className="fixed right-4 bottom-36 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-primary text-xl text-white shadow-xl transition-colors hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-500 sm:right-6 sm:bottom-24"
      >
        {open ? <BsX /> : <BsChatDotsFill />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Samithi assistant chat"
          className="fixed right-4 bottom-[13.5rem] left-4 z-50 flex max-h-[60vh] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6 sm:bottom-[10.5rem] sm:left-auto sm:w-[380px] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white dark:bg-blue-700">
            <div>
              <p className="text-sm font-semibold">Samithi Assistant</p>
              <p className="text-xs opacity-90">Love All, Serve All</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="cursor-pointer rounded-full p-1 transition-colors hover:bg-white/15"
            >
              <BsX className="text-lg" />
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-primary text-white dark:bg-blue-600"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((l) => (
                        <a
                          key={l.href + l.label}
                          href={l.href}
                          className="cursor-pointer rounded-full bg-white/25 px-2 py-1 text-xs font-medium underline underline-offset-2 hover:bg-white/40 dark:bg-black/25 dark:hover:bg-black/40"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {chips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => send(c)}
                  className="shrink-0 cursor-pointer rounded-full border border-[#149ddd]/40 px-3 py-1 text-xs font-medium text-[#0a58ca] transition-colors hover:bg-[#149ddd]/10 dark:border-blue-500/50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about timings, events…"
              aria-label="Type your question"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#149ddd] dark:border-slate-700 dark:text-slate-100"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <BsSend className="text-sm" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
