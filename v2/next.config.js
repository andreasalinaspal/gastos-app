/** @type {import('next').NextConfig} */

// F21: qué versión es esta. Se congela en el momento del build y viaja dentro
// del bundle, para que Config pueda decirle a la usuaria si su celular ya tiene
// lo último sin que nadie se lo tenga que confirmar.
//
// En Vercel, `VERCEL_GIT_COMMIT_SHA` lo pone la plataforma. En local no existe:
// ahí queda "local", que es justo lo que se quiere ver en el dev server.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local";

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_QORI_COMMIT: commit,
    NEXT_PUBLIC_QORI_FECHA: new Date().toISOString(),
  },
};

module.exports = nextConfig;
