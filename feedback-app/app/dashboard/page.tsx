import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardPage() {

  const user = await getCurrentUser()

  if (!user) {
    redirect("/sign-in")
  }

  switch (user.role) {

    case "ADMIN":
      return redirect("/dashboard/admin")

    case "DRIVER":
      return redirect("/dashboard/driver")

    default:
      return redirect("/dashboard/passenger")
  }
}