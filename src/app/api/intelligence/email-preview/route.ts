import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { classifyApplicationEmail } from "@/lib/application-intelligence";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const subject = typeof body?.subject === "string" ? body.subject.slice(0, 500) : "";
    const content = typeof body?.body === "string" ? body.body.slice(0, 12000) : "";
    if (!subject && !content) return NextResponse.json({ error: "Email subject or body is required." }, { status: 400 });
    return NextResponse.json({ signal: classifyApplicationEmail(subject, content) });
  } catch {
    return NextResponse.json({ error: "Could not analyze email." }, { status: 400 });
  }
}
