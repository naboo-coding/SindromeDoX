// contexto com o usuário logado e as funções de login
import { createContext, useContext, useState } from 'react'
import * as api from '../services/api'

const AuthContext = createContext(null)

// fornece o usuário logado para todas as telas
export function AuthProvider({ children }) {
  // carrega a sessão salva
  const [user, setUser] = useState(api.getSessionUser)

  function login(email, password) {
    setUser(api.login(email, password))
  }

  function register(data) {
    setUser(api.register(data))
  }

  function logout() {
    api.logout()
    setUser(null)
  }

  const value = { user, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// hook para ler o usuário logado
export function useAuth() {
  return useContext(AuthContext)
}
