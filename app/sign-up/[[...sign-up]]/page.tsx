import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Portfolio Intelligence
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start seeing only the news that matters to YOUR portfolio
          </p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}