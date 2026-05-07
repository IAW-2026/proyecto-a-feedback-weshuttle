import "./globals.css"
import { ReactNode } from "react"
import { IBM_Plex_Sans } from "next/font/google"

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
    <html lang="en">
      <body className={ibm.className}>
        {children}
      </body>
    </html>
  )
}