import "./globals.css"
import { ReactNode } from "react"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export const metadata = {
  title: "WeShuttle | Movilidad Corporativa",
  description: "Plataforma de transporte y feedback de WeShuttle",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    // ClerkProvider es un componente que nos permite usar los hooks de Clerk 
    // en toda la aplicacion
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="es">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
//para usar los hooks de Clerk, debemos envolver nuestra aplicacion con el componente ClerkProvider, que se encuentra en @clerk/nextjs. Esto nos permite usar los hooks de Clerk en toda la aplicacion, sin tener que envolver cada componente con el componente ClerkProvider.