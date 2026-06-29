import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  switch (user.role) {

    case "admin":
      redirect("/dashboard/admin")

    case "driver":
      redirect("/dashboard/driver")

    default:
      redirect("/dashboard/passenger")
  }
}