import apiClient, { toApiError } from './apiClient.js'

export const login = async ({ email, password, rememberMe }) => {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password, rememberMe })
    return data.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const getCurrentUser = async () => {
  try {
    const { data } = await apiClient.get('/auth/me')
    return data.data.user
  } catch (error) {
    throw toApiError(error)
  }
}

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Logging out locally must succeed even if the request fails.
  }
}

export const requestPasswordReset = async ({ email }) => {
  try {
    const { data } = await apiClient.post('/auth/forgot-password', { email })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** Checks a reset link before showing the form, so a dead link fails early. */
export const verifyResetToken = async (token) => {
  try {
    const { data } = await apiClient.get('/auth/reset-password', { params: { token } })
    return data.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const resetPassword = async ({ token, password, confirmPassword }) => {
  try {
    const { data } = await apiClient.post('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
