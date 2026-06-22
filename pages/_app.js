import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Gestión de gastos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Gestión de finanzas personales" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.11.0/dist/tabler-icons.min.css"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
