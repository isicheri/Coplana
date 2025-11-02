import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username } = body ?? {};

    if (!email || !username) {
      return NextResponse.json({ error: "Both email and username are required" }, { status: 400 });
    }

    // Find user by both email and username to ensure they match
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
