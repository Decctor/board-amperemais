import { apiHandler } from '@/lib/api'
import { lucia } from '@/lib/auth/lucia'
import { NextApiHandler } from 'next'

const handleLogout: NextApiHandler<any> = async (req, res) => {
  const sessionId = req.cookies[lucia.sessionCookieName]
  if (!sessionId) return res.redirect('/auth/login')
  await lucia.invalidateSession(sessionId)
  const sessionCookie = lucia.createBlankSessionCookie()
  return res.setHeader('Set-Cookie', sessionCookie.serialize()).redirect('/auth/login')
}

export default apiHandler({ GET: handleLogout })
