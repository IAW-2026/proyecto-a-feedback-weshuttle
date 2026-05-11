import "./globals.css"
import { ReactNode } from "react"
import { IBM_Plex_Sans } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

const ibm = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    // ClerkProvider es un componente que nos permite usar los hooks de Clerk 
    // en toda la aplicacion
    <ClerkProvider>
      <html lang="en">
        <body className={ibm.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
//para usar los hooks de Clerk, debemos envolver nuestra aplicacion con el componente ClerkProvider, que se encuentra en @clerk/nextjs. Esto nos permite usar los hooks de Clerk en toda la aplicacion, sin tener que envolver cada componente con el componente ClerkProvider.