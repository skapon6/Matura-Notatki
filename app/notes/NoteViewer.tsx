"use client";

import React, { useState } from "react";

type Note = {
  id?: string | number;
  title?: string;
  quote?: string;
  tags?: string[] | string;
  content?: any;
};

export default function NoteViewer({ note }: { note: Note }) {
  const tags = Array.isArray(note.chips)
    ? note.chips
    : typeof note.chips === "string"
    ? // chips może być JSON string lub CSV
      (() => {
        try {
          const parsed = JSON.parse(note.chips as string);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
        return (note.chips as string).split(",").map((t) => t.trim()).filter(Boolean);
      })()
    : [];

  const contentArray = Array.isArray(note.content) ? note.content : note.content ? [note.content] : [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-8 bg-white shadow-md border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight">{note.title}</h1>
              {note.quote && (
                <blockquote className="mt-3 text-gray-600 italic border-l-4 border-blue-200 pl-4">
                  {note.quote}
                </blockquote>
              )}
                <div className="mt-3 flex flex-wrap gap-2 items-center text-sm">
                  {note.era && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{note.era}</span>
                  )}
                  {note.read_time && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-100">Czas: {note.read_time} min</span>
                  )}
                  {note.difficulty && (
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Poziom: {note.difficulty}</span>
                  )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag: any) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6">
          {contentArray.map((block: any, idx: number) => {
            const type = (block && block.type) || block?.kind || "paragraph";

            if (type === "tips" || type === "tip") {
              const text = block.content || block.text || block.body || JSON.stringify(block);
              return (
                <div key={idx} className="rounded-lg border-l-4 border-blue-300 bg-blue-50 p-4">
                  <div className="font-semibold text-blue-800 mb-1">Wskazówka</div>
                  <div className="text-sm text-blue-700">{text}</div>
                </div>
              );
            }

            if (type === "section_header" || type === "section") {
              const title = block.title || block.header || "Sekcja";
              const children = block.content || block.children || block.items || block.body || [];
              return <Accordion key={idx} title={title} childrenBlocks={children} />;
            }

            // default: paragraph / text
            const text = block.content || block.text || block.html || block.body || JSON.stringify(block);
            return (
              <div key={idx} className="prose max-w-none bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                {typeof text === "string" && text.startsWith("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: text }} />
                ) : (
                  <p className="text-gray-800">{text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Accordion({ title, childrenBlocks }: { title: string; childrenBlocks: any }) {
  const [open, setOpen] = useState(false);

  const childrenArray = Array.isArray(childrenBlocks) ? childrenBlocks : [childrenBlocks];

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
      >
        <span className="font-medium">{title}</span>
        <span className="text-sm text-gray-500">{open ? "Ukryj" : "Pokaż"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 space-y-3">
          {childrenArray.map((b: any, i: number) => {
            const text = b.content || b.text || b.body || (typeof b === "string" ? b : JSON.stringify(b));
            return (
              <div key={i} className="text-sm text-gray-700">
                {typeof text === "string" && text.startsWith("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: text }} />
                ) : (
                  <p>{text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
