// contexto com o usuário logado e as funções de login
import { createContext, useContext, useEffect, useState } from 'react'
import { buscarSessao, entrar, sair } from '../services/api'

const AuthContext = createContext(null)

// fornece o usuário logado para todas as telas
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // ao abrir o site, pergunta ao back se já existe uma sessão
  useEffect(() => {
    buscarSessao()
      .then((dados) => setUsuario(dados))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false))
  }, [])

  async function login(email, senha) {
    const dados = await entrar(email, senha)
    setUsuario(dados)
  }

  async function logout() {
    await sair()
    setUsuario(null)
  }

  const value = { usuario, carregando, login, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// hook para ler o usuário logado
export function useAuth() {
  return useContext(AuthContext)
}
