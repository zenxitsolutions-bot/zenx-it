import { badRequest } from '../utils/ApiError.js'

const collectErrors = (zodError) => {
  const errors = {}
  for (const issue of zodError.issues) {
    const field = issue.path.join('.') || 'form'
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

const validate = (schema, pick, assign) => (req, _res, next) => {
  const result = schema.safeParse(pick(req) ?? {})

  if (!result.success) {
    return next(badRequest('Please correct the highlighted fields', collectErrors(result.error)))
  }

  assign(req, result.data)
  next()
}

/** Validates req.body against a Zod schema and replaces it with the parsed value. */
export const validateBody = (schema) =>
  validate(
    schema,
    (req) => req.body,
    (req, data) => {
      req.body = data
    },
  )

/**
 * Express 5 exposes req.query through a getter, so the coerced result lands on
 * req.validatedQuery instead of overwriting it.
 */
export const validateQuery = (schema) =>
  validate(
    schema,
    (req) => req.query,
    (req, data) => {
      req.validatedQuery = data
    },
  )

/** Validates route params — guards against malformed or probed ids. */
export const validateParams = (schema) =>
  validate(
    schema,
    (req) => req.params,
    (req, data) => {
      req.params = { ...req.params, ...data }
    },
  )
