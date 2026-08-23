import jwt from 'jsonwebtoken'
import { User } from './models.js'

const secret = () => process.env.JWT_SECRET || 'development-only-change-me'

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, secret(), { expiresIn: '7d' })
  res.cookie('bizzorix_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604800000 })
}

export async function requireAuth(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies.bizzorix_session, secret())
    req.user = await User.findById(payload.sub)
    if (!req.user || req.user.status !== 'active') throw new Error('Invalid session')
    next()
  } catch {
    res.status(401).json({ success: false, error: { message: 'Please log in to continue.' } })
  }
}

export const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ success: false, error: { message: 'You do not have permission to do that.' } })

export const safeUser = (user) => ({ id: user.id, fullName: user.fullName, email: user.email, optionalPhone: user.optionalPhone, preferredArea: user.preferredArea, role: user.role })
