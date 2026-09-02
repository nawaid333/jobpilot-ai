import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const signals=await prisma.emailSignal.findMany({where:{userId:user.id},include:{job:true,application:{include:{job:true}}},orderBy:{createdAt:"desc"},take:50});return NextResponse.json({signals});}
