import env from '../config/env.js'

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = statusCode === 500 ? 'Something went wrong. Please try again.' : err.message

  if (statusCode === 500) {
    console.error('[error]', err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
    ...(env.nodeEnv === 'development' && statusCode === 500 ? { detail: err.message } : {}),
  })
}
