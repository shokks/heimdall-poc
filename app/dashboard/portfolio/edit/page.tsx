import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PortfolioEditClient from './portfolio-edit-client'

export default async function PortfolioEditPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return <PortfolioEditClient />
}