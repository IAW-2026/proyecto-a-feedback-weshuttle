import 'dotenv/config'
import { prisma } from "../lib/prisma"

async function main() {
  const users = await prisma.user.findMany()
  console.log("USERS IN DATABASE:")
  users.forEach((u: any) => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Role: ${u.role}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
