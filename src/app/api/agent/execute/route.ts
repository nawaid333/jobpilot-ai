import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const safeActions = new Set(["prepare","mark-preparing","mark-applied","follow-up","interview","assessment","offer"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FINAL_STATUSES = new Set(["Interview", "Offer", "Rejected"]);

async function record(userId:string, applicationId:string, actionType:string, status:string, result:unknown) {
  await prisma.agentAction.create({data:{id:crypto.randomUUID(),userId,applicationId,actionType,status,result:result as any,completedAt:status==="completed"?new Date():null}});
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent-execute:${user.id}`, 30, 60_000);
  const rateResponse = rateLimitResponse(limited); if (rateResponse) return rateResponse;
  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    if (!applicationId || applicationId.length > 100 || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const id = encodeURIComponent(application.id);
    let response:any;
    if (action === "prepare") {
      if (!application.tailoredApplication) response={ok:false,next:"tailor",redirect:`/tailor?applicationId=${id}`,message:"Create the tailored package before preparing submission."};
      else if (FINAL_STATUSES.has(application.status)) response={error:`Cannot prepare an application already marked ${application.status}.`,status:409};
      else { if (RANK[application.status] < RANK.Preparing) await prisma.application.update({where:{id:application.id},data:{status:"Preparing"}}); response={ok:true,next:"review",redirect:`/automation?applicationId=${id}`,message:"Your tailored package is ready for review."}; }
    } else if (action === "mark-preparing") {
      if (FINAL_STATUSES.has(application.status)||application.status==="Applied") response={error:`Cannot move a ${application.status} application back to Preparing.`,status:409};
      else if (application.status === "Preparing") response={ok:true,status:application.status,alreadyRecorded:true,message:"Application is already in Preparing."};
      else { const updated=await prisma.application.update({where:{id:application.id},data:{status:"Preparing"}}); response={ok:true,status:updated.status,message:"Application moved to Preparing."}; }
    } else if (action === "mark-applied") {
      if (FINAL_STATUSES.has(application.status)) response={error:`Cannot mark a ${application.status} application as Applied.`,status:409};
      else if (application.status === "Applied") response={ok:true,status:application.status,alreadyRecorded:true,message:"Application is already marked as Applied."};
      else { const updated=await prisma.application.update({where:{id:application.id},data:{status:"Applied",appliedAt:application.appliedAt||new Date()}}); response={ok:true,status:updated.status,message:"Marked as Applied. JobPilot did not submit the application."}; }
    } else if (action === "follow-up") response={ok:true,next:"follow-up",redirect:`/application/${id}`,message:"Open the application to review context and prepare the follow-up."};
    else if (action === "interview") response={ok:true,next:"interview",redirect:`/interview?applicationId=${id}`,message:"Interview preparation opened with this application."};
    else if (action === "assessment") response={ok:true,next:"assessment",redirect:`/intelligence?applicationId=${id}`,message:"Assessment context opened for this application."};
    else if (action === "offer") response={ok:true,next:"offer",redirect:`/application/${id}`,message:"Offer review opened for this application."};
    else response={error:"Unsupported agent action.",status:400};

    if (response.ok && !(response.alreadyRecorded)) await record(user.id,application.id,action,"completed",{next:response.next||null,message:response.message||null});
    return NextResponse.json(response,{status:response.status||200});
  } catch { return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 }); }
}
