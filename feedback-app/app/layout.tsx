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
        <body className={`${inter.className} min-h-screen flex flex-col`}>
          <div className="flex-grow flex flex-col">
            {children}
          </div>
          <footer className="py-6 border-t border-neutral-600 bg-[#424242] text-center text-xs text-neutral-300 font-semibold shrink-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span>© {new Date().getFullYear()} WeShuttle. Todos los derechos reservados.</span>
              <span>Desarrollado por <span className="font-bold text-white">Juan Sebastian Bassi</span> (Autor de Feedback App)</span>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  )
}
//para usar los hooks de Clerk, debemos envolver nuestra aplicacion con el componente ClerkProvider, que se encuentra en @clerk/nextjs. Esto nos permite usar los hooks de Clerk en toda la aplicacion, sin tener que envolver cada componente con el componente ClerkProvider.