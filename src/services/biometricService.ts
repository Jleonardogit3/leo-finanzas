/**
 * Finanzas Venezuela - Servicio de Autenticación Biométrica (WebAuthn)
 * Soporte para sensor de huellas dactilares / Face ID en teléfonos móviles y navegadores modernos.
 */

const BIO_ENROLLED_PREFIX = 'finanzas_vzla_bio_enrolled_';
const BIO_CRED_ID_PREFIX = 'finanzas_vzla_bio_cred_';
const BIO_AUTO_LOCK_KEY = 'finanzas_vzla_bio_auto_lock';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class BiometricService {
  /**
   * Comprueba si el navegador actual soporta WebAuthn
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      !!navigator.credentials
    );
  }

  /**
   * Comprueba si el dispositivo tiene un sensor biométrico disponible (huella dactilar, Face ID)
   */
  static async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return true;
    } catch (e) {
      console.warn('Error comprobando sensor biométrico:', e);
      return false;
    }
  }

  /**
   * Verifica si el usuario ya registró su huella dactilar en este dispositivo
   */
  static isEnrolled(username: string): boolean {
    if (!username) return false;
    const cleanUser = username.trim().toLowerCase();
    return localStorage.getItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`) === 'true';
  }

  /**
   * Registra y vincula la huella dactilar del usuario en este dispositivo usando WebAuthn
   */
  static async enrollBiometric(username: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Tu navegador o conexión actual no soporta autenticación biométrica WebAuthn.'
      };
    }

    const cleanUser = username.trim().toLowerCase();

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(cleanUser);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Finanzas Venezuela'
          },
          user: {
            id: userId,
            name: cleanUser,
            displayName: username.trim()
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Sensor nativo del teléfono
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000
        }
      }) as PublicKeyCredential | null;

      if (!credential) {
        return { success: false, message: 'No se completó la verificación de huella.' };
      }

      // Guardar registro de la credencial en localStorage
      const rawId = bufferToBase64(credential.rawId);
      localStorage.setItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`, 'true');
      localStorage.setItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`, rawId);
      this.setAutoLockEnabled(true);

      return {
        success: true,
        message: '¡Huella dactilar vinculada exitosamente a este teléfono!'
      };
    } catch (err: any) {
      console.warn('Error enrolando huella:', err);
      if (err.name === 'NotAllowedError') {
        return { success: false, message: 'Operación biométrica cancelada por el usuario.' };
      }
      return {
        success: false,
        message: err.message || 'No se pudo activar el sensor de huella en este dispositivo.'
      };
    }
  }

  /**
   * Solicita al usuario colocar su huella en el sensor para autenticarse
   */
  static async verifyBiometric(username: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Tu navegador no soporta autenticación biométrica.'
      };
    }

    const cleanUser = username.trim().toLowerCase();
    const savedCredId = localStorage.getItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = savedCredId
        ? [{
            id: base64ToBuffer(savedCredId),
            type: 'public-key',
            transports: ['internal']
          }]
        : undefined;

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: 'required',
          timeout: 60000,
          allowCredentials
        }
      });

      if (assertion) {
        return { success: true };
      }

      return { success: false, message: 'Verificación biométrica no completada.' };
    } catch (err: any) {
      console.warn('Error verificando huella:', err);
      if (err.name === 'NotAllowedError') {
        return { success: false, message: 'Verificación cancelada o huella no reconocida.' };
      }
      return {
        success: false,
        message: err.message || 'Error al comunicarse con el sensor de huella.'
      };
    }
  }

  /**
   * Elimina el registro biométrico para un usuario
   */
  static removeBiometric(username: string): void {
    const cleanUser = username.trim().toLowerCase();
    localStorage.removeItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`);
    localStorage.removeItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`);
  }

  /**
   * Configuración de bloqueo automático al salir/cerrar la app
   */
  static isAutoLockEnabled(): boolean {
    const val = localStorage.getItem(BIO_AUTO_LOCK_KEY);
    return val === null ? true : val === 'true'; // Activo por defecto
  }

  static setAutoLockEnabled(enabled: boolean): void {
    localStorage.setItem(BIO_AUTO_LOCK_KEY, enabled ? 'true' : 'false');
  }
}
