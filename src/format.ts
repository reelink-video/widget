// Text shown on tiles and in the player: Czech plurals, durations, titles.

import type { Clip, Collection } from "./types";

export const videaWord = (n: number) => (n === 1 ? "video" : n > 1 && n < 5 ? "videa" : "videí");

export const fmtTime = (sec: number) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");

export const isSingle = (c: Collection) => c.clips.length === 1;

// tile title: collection name for a collection, video title for a standalone video (else the collection's)
export const clipTitle = (c: Collection, v: Clip = c.clips[0]) => (isSingle(c) ? v.label || c.title : c.title);

export const objPos = (v: Clip) => `${v.pos ?? "50%"} 50%`;
