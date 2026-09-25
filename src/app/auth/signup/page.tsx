import { Metadata } from "next"
import { SignUpForm } from "@/components/auth/SignUpForm"

export const metadata: Metadata = {
  title: "Sign Up - ExamSaarthi",
  description: "Create your ExamSaarthi account.",
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Join ExamSaarthi to access accessible exams.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border">
          <SignUpForm />
        </div>
      </div>
    </div>
  )
}
