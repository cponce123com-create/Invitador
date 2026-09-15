// Protege el área privada del anfitrión antes de que la petición llegue al
// servidor. La comprobación "de verdad" (con acceso a la base de datos) se
// repite en el layout del dashboard, que es la fuente de verdad.
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
