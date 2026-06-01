import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  switch (user.role) {

    case "ADMIN":
      redirect("/dashboard/admin")

    case "DRIVER":
      redirect("/dashboard/driver")

    default:
      redirect("/dashboard/passenger")
  }
}