import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const c=await prisma.gmailConnection.findUnique({where:{userId:user.id},select:{email:true,connectedAt:true,scope:true}});
  return NextResponse.json({connected:!!c,connection:c});
}

export async function DELETE(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  await prisma.$transaction(async tx=>{
    await tx.gmailConnection.deleteMany({where:{userId:user.id}});
    // Remove derived email intelligence when Gmail is disconnected.
    await tx.emailSignal.deleteMany({where:{userId:user.id}});
  });

  const c=await cookies();
  c.delete("jobpilot-gmail-state");
  return NextResponse.json({ok:true});
}
