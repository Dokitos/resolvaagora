'use client'

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth'

/**
 * Firebase Auth no site, usado apenas para o login com Apple e Google.
 *
 * A app móvel faz o mesmo: o fornecedor autentica, e o ID token resultante é
 * trocado no `/auth/social` do backend por uma sessão da plataforma. Manter os
 * dois lados no mesmo mecanismo evita ter dois caminhos de verificação
 * diferentes no servidor.
 *
 * Estes valores são públicos por natureza (vão para o browser) — o que protege
 * a conta são as regras do Firebase e a validação do token no backend.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/** `false` quando as variáveis não estão definidas — os botões ficam ocultos. */
export const socialLoginEnabled = Boolean(config.apiKey && config.authDomain && config.appId)

function app(): FirebaseApp {
  if (!socialLoginEnabled) {
    throw new Error('Login social não configurado (falta NEXT_PUBLIC_FIREBASE_*).')
  }
  // O Next remonta componentes em desenvolvimento; sem esta verificação o
  // Firebase queixa-se de a app já estar inicializada.
  return getApps().length > 0 ? getApp() : initializeApp(config as Required<typeof config>)
}

async function idTokenFrom(credential: UserCredential): Promise<{ idToken: string; name: string | null }> {
  const idToken = await credential.user.getIdToken()
  return { idToken, name: credential.user.displayName }
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return idTokenFrom(await signInWithPopup(getAuth(app()), provider))
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  return idTokenFrom(await signInWithPopup(getAuth(app()), provider))
}

/** O utilizador fechou a janela do fornecedor — não é um erro a mostrar. */
export function isPopupCancelled(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  )
}
