/**
 * Finanzas Venezuela - Servicio de Autenticación Biométrica (WebAuthn)
 * Soporte para sensor de huellas dactilares / Face ID en teléfonos móviles y navegadores modernos.
 */

const BIO_ENROLLED_PREFIX = 'finanzas_vzla_bio_enrolled_';
const BIO_CRED_ID_PREFIX = 'finanzas_vzla_bio_cred_';
const BIO_AUTO_LOCK_KEY = 'finanzas_vzla_bio_auto_lock';
const BIO_UNLOCKED_DATE_PREFIX = 'finanzas_vzla_device_unlocked_date_';
const LAST_ACTIVE_USER_KEY = 'finanzas_vzla_last_active_user';

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

function getHostScope(): string {
  if (typeof window === 'undefined') return 'localhost';
  return (window.location.hostname || 'localhost').replace(/[^a-zA-Z0-9]/g, '_');
}

export class BiometricService {
  /**
   * Obtiene la fecha actual en formato local YYYY-MM-DD
   */
  static getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Obtiene el último usuario que inició sesión o se registró en este dispositivo
   */
  static getLastActiveUser(): string | null {
    try {
      const last = localStorage.getItem(LAST_ACTIVE_USER_KEY);
      if (last && last.trim()) return last.trim();

      const session = localStorage.getItem('finanzas_vzla_auth_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed?.username) return parsed.username;
      }
    } catch {}
    return null;
  }

  /**
   * Guarda el último usuario activo en este dispositivo
   */
  static setLastActiveUser(username: string): void {
    if (!username) return;
    try {
      localStorage.setItem(LAST_ACTIVE_USER_KEY, username.trim());
    } catch {}
  }

  /**
   * Limpia el registro de todos los usuarios desbloqueados en este dispositivo
   */
  static clearAllDeviceUnlockedToday(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BIO_UNLOCKED_DATE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  /**
   * Comprueba si este dispositivo ya fue desbloqueado el día de hoy
   * (Una vez desbloqueado, no pedir más la contraseña por ese día en este dispositivo)
   */
  static isDeviceUnlockedToday(username?: string): boolean {
    const targetUser = username || this.getLastActiveUser() || 'jleonardo';
    const cleanUser = targetUser.trim().toLowerCase();
    const today = this.getTodayDateString();
    const savedDate = localStorage.getItem(`${BIO_UNLOCKED_DATE_PREFIX}${cleanUser}`);
    return savedDate === today;
  }

  /**
   * Marca este dispositivo como desbloqueado y verificado para todo el día de hoy
   * Cierra cualquier sesión o marca previa para asegurar que sólo el usuario activo queda activo.
   */
  static markDeviceUnlockedToday(username?: string): void {
    const targetUser = username || this.getLastActiveUser() || 'jleonardo';
    const cleanUser = targetUser.trim().toLowerCase();
    const today = this.getTodayDateString();

    // Limpiar marcas de otros usuarios: sólo se mantiene la sesión del último usuario iniciado
    this.clearAllDeviceUnlockedToday();
    localStorage.setItem(`${BIO_UNLOCKED_DATE_PREFIX}${cleanUser}`, today);
    this.setLastActiveUser(targetUser);
  }

  /**
   * Revoca la marca de desbloqueo diario (por ejemplo al cerrar sesión manualmente)
   */
  static revokeDeviceUnlockedToday(username?: string): void {
    if (username) {
      const cleanUser = username.trim().toLowerCase();
      localStorage.removeItem(`${BIO_UNLOCKED_DATE_PREFIX}${cleanUser}`);
    } else {
      this.clearAllDeviceUnlockedToday();
    }
  }

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
   * Verifica si el usuario ya registró su huella dactilar para el dominio/origen actual
   */
  static isEnrolled(username: string): boolean {
    if (!username) return false;
    const cleanUser = username.trim().toLowerCase();
    const scope = getHostScope();
    return (
      localStorage.getItem(`${BIO_ENROLLED_PREFIX}${scope}_${cleanUser}`) === 'true' ||
      localStorage.getItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`) === 'true'
    );
  }

  /**
   * Verifica específicamente si la huella está registrada en el dominio web actual
   */
  static isEnrolledOnCurrentOrigin(username: string): boolean {
    if (!username) return false;
    const cleanUser = username.trim().toLowerCase();
    const scope = getHostScope();
    return localStorage.getItem(`${BIO_ENROLLED_PREFIX}${scope}_${cleanUser}`) === 'true';
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
    const scope = getHostScope();

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
        return { success: false, message: 'No se completó el registro de huella en el sensor.' };
      }

      // Guardar registro de la credencial tanto en el scope del dominio como en el general
      const rawId = bufferToBase64(credential.rawId);
      localStorage.setItem(`${BIO_ENROLLED_PREFIX}${scope}_${cleanUser}`, 'true');
      localStorage.setItem(`${BIO_CRED_ID_PREFIX}${scope}_${cleanUser}`, rawId);
      localStorage.setItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`, 'true');
      localStorage.setItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`, rawId);
      this.setAutoLockEnabled(true);
      this.markDeviceUnlockedToday(cleanUser);

      return {
        success: true,
        message: '¡Huella dactilar vinculada exitosamente a este teléfono!'
      };
    } catch (err: any) {
      console.warn('Error enrolando huella:', err);
      if (err.name === 'NotAllowedError') {
        return { success: false, message: 'Operación cancelada en el sensor del teléfono.' };
      }
      return {
        success: false,
        message: err.message || 'No se pudo vincular el sensor de huella en este teléfono.'
      };
    }
  }

  /**
   * Solicita al usuario colocar su huella en el sensor para autenticarse
   */
  static async verifyBiometric(username: string): Promise<{ 
    success: boolean; 
    message?: string; 
    notEnrolled?: boolean;
    notAllowed?: boolean;
  }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Tu navegador no soporta autenticación biométrica.'
      };
    }

    const cleanUser = username.trim().toLowerCase();
    const scope = getHostScope();
    
    // Obtener credencial específica para este dominio
    const savedCredId = 
      localStorage.getItem(`${BIO_CRED_ID_PREFIX}${scope}_${cleanUser}`) ||
      localStorage.getItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`);

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
        this.markDeviceUnlockedToday(cleanUser);
        return { success: true };
      }

      return { success: false, message: 'Verificación biométrica no completada.' };
    } catch (err: any) {
      console.warn('Error verificando huella:', err);
      
      // Si el sensor indica que no hay clave disponible o el usuario canceló
      if (err.name === 'NotAllowedError') {
        return { 
          success: false, 
          notAllowed: true,
          message: 'Verificación cancelada o huella no registrada para esta dirección web.' 
        };
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
    const scope = getHostScope();
    localStorage.removeItem(`${BIO_ENROLLED_PREFIX}${cleanUser}`);
    localStorage.removeItem(`${BIO_CRED_ID_PREFIX}${cleanUser}`);
    localStorage.removeItem(`${BIO_ENROLLED_PREFIX}${scope}_${cleanUser}`);
    localStorage.removeItem(`${BIO_CRED_ID_PREFIX}${scope}_${cleanUser}`);
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
