import test from "node:test";
import assert from "node:assert/strict";

const DAY = 86400000;
function state(date, now) { const due=date.getTime(); return due < now-DAY/2 ? "overdue" : due <= now+DAY ? "today" : "upcoming"; }
function priority(s) { return s === "overdue" ? 5 : s === "today" ? 4 : 3; }
function sort(actions) { return [...actions].sort((a,b)=>b.priority-a.priority || ((a.dueAt?new Date(a.dueAt).getTime():Infinity)-(b.dueAt?new Date(b.dueAt).getTime():Infinity))); }

test("follow-up states are deterministic",()=>{const now=Date.parse("2026-09-10T12:00:00Z");assert.equal(state(new Date(now-DAY),now),"overdue");assert.equal(state(new Date(now),now),"today");assert.equal(state(new Date(now+2*DAY),now),"upcoming");});
test("follow-up urgency maps to descending priority",()=>{assert.equal(priority("overdue"),5);assert.equal(priority("today"),4);assert.equal(priority("upcoming"),3);});
test("agent queue keeps highest priority first and due items ahead on ties",()=>{const actions=[{id:"later",priority:4,dueAt:"2026-09-12T12:00:00Z"},{id:"urgent",priority:5,dueAt:"2026-09-09T12:00:00Z"},{id:"today",priority:4,dueAt:"2026-09-10T12:00:00Z"}];assert.deepEqual(sort(actions).map(x=>x.id),["urgent","today","later"]);});
test("missing due dates do not outrank dated actions at the same priority",()=>{const actions=[{id:"undated",priority:3},{id:"dated",priority:3,dueAt:"2026-09-20T12:00:00Z"}];assert.deepEqual(sort(actions).map(x=>x.id),["dated","undated"]);});
