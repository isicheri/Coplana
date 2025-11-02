import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username } = body ?? {};

    if (!email || !username) {
      return NextResponse.json({ error: "email and username are required" }, { status: 400 });
    }

    const user = await prisma.user.create({ data: { email, username } });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}