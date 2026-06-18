// API interna para el usuario pueda actualizar su nombre.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type UpdateNameBody = {
  name?: string
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not signed in" },
        { status: 401 }
      )
    }

    const body: UpdateNameBody = await req.json()
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Name is required" },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Error updating user name:", error)

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to update name" },
      { status: 500 }
    )
  }
}