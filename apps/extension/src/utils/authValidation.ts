/**
 * Validacion de credenciales antes de salir a la red.
 *
 * Existe por dos razones, y la segunda es la que importa:
 *
 * 1. Ahorra viajes al servidor por errores obvios.
 * 2. **Los mensajes de Supabase vienen en ingles.** `weak_password` responde
 *    "Password should be at least 10 characters", y mostrarselo al usuario tal
 *    cual desentona con el resto de la aplicacion. Validando aqui, el usuario
 *    nunca llega a ver el texto del backend en el caso normal.
 *
 * Los limites replican los de `supabase/config.toml` (`minimum_password_length`
 * y `password_requirements`). Si se cambian alli, hay que cambiarlos aqui: el
 * servidor es el que manda, esto solo se adelanta. Que no coincidan no abre un
 * agujero -el servidor sigue rechazando- pero produce el peor sintoma posible,
 * un formulario que acepta lo que el backend luego niega en ingles.
 */

/** Debe coincidir con `minimum_password_length` de supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Rango de digitos que se acepta en el codigo del correo.
 *
 * No es una longitud fija a proposito, y la razon la dio una prueba contra el
 * servidor real: `supabase/config.toml` declara `otp_length = 6`, pero el
 * proyecto en produccion emite codigos de OCHO digitos. Con un 6 clavado en el
 * cliente, el campo recortaba el codigo y la verificacion fallaba siempre, sin
 * que ningun test lo notara -todos usaban un '123456' inventado-.
 *
 * Aceptando un rango, el formulario funciona con la configuracion actual y
 * seguira funcionando si algun dia se cambia. La comprobacion de verdad la hace
 * el servidor; esto solo evita enviar algo obviamente incompleto.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

/**
 * No se persigue validar el RFC 5322 completo, que es inabarcable con una
 * expresion regular y ademas rechaza direcciones legitimas. Solo se descartan
 * los errores de tecleo evidentes; la validacion de verdad es que el codigo
 * llegue al buzon.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve el mensaje de error, o `null` si el valor es aceptable. */
export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Escribe tu correo.';
  if (!EMAIL_SHAPE.test(email)) return 'Ese correo no parece valido.';
  return null;
}

/**
 * Replica `password_requirements = "lower_upper_letters_digits"`.
 *
 * No se exigen simbolos a proposito: sin un medidor de fuerza a la vista,
 * exigirlos empuja a la contrasena-post-it, que es peor que una larga sin
 * simbolos.
 */
export function validatePassword(value: string): string | null {
  if (!value) return 'Escribe una contrasena.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `La contrasena necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(value)) return 'La contrasena necesita alguna minuscula.';
  if (!/[A-Z]/.test(value)) return 'La contrasena necesita alguna mayuscula.';
  if (!/[0-9]/.test(value)) return 'La contrasena necesita algun numero.';
  return null;
}

/** Nombre que se guarda en el perfil. Ver `handle_new_user` en la migracion 003. */
export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Escribe tu nombre.';
  if (name.length < 2) return 'Ese nombre es demasiado corto.';
  return null;
}

/**
 * Deja solo los digitos y recorta a la longitud del codigo.
 *
 * Se aplica al escribir, no al enviar: el usuario suele pegar el codigo desde
 * el correo y arrastra espacios o saltos de linea. Silenciarlos evita un error
 * que no es culpa suya.
 */
export function normalizeOtpCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH);
}

export function validateOtpCode(value: string): string | null {
  const code = normalizeOtpCode(value);
  if (!code) return 'Escribe el codigo que te llego por correo.';
  if (code.length < OTP_MIN_LENGTH) return 'Ese codigo esta incompleto.';
  return null;
}
