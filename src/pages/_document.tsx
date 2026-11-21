import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render(): React.JSX.Element {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/logos/assistive_logo-200.png" />
          <meta name="theme-color" content="#6f42c1" />
          <meta name="application-name" content={process.env.NEXT_PUBLIC_APP_NAME || 'Assistive'} />
          <meta name="description" content="Assistive web application interface" />
          <meta name="referrer" content="strict-origin" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
