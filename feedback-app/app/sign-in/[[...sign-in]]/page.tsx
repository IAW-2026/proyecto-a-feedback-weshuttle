import { SignIn } from "@clerk/nextjs"

export default function Page() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13294b_0%,#0a192f_45%,#050b16_100%)] flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center text-white max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 mb-3">
          WeShuttle
        </p>
        <h1 className="text-3xl font-black tracking-tight mb-2">
          Ingresar a tu cuenta
        </h1>
        <p className="text-sm text-white/70 leading-relaxed">
          Accedé a tu dashboard para continuar con tus viajes y feedback.
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full flex justify-center",
            card: "w-full max-w-[480px] shadow-none mx-auto",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "rounded-[8px] border border-slate-200 hover:border-slate-300",
            formButtonPrimary:
              "rounded-[8px] bg-[#0a192f] hover:bg-[#13294b] text-white font-bold",
            formFieldInput:
              "rounded-[8px] border-slate-200 focus:border-[#0a192f] focus:ring-[#0a192f]",
            footerActionLink: "text-[#0a192f] font-bold",
          },
        }}
      />
    </main>
  )
}