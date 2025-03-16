import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Link,
  Text,
  Heading,
} from "@react-email/components";
import * as React from "react";
import { Setting } from ".prisma/client";
import process from "process";

export interface EmailContainerProps {
  previewText: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  setting: Setting;
}

const EmailContainer = (props: EmailContainerProps) => {
  const { previewText, header, children, footer, setting } = props;
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="my-auto mx-auto font-sans">
          <Container
            style={{
              borderTop: "10px solid #eee",
              borderImage:
                "repeating-linear-gradient(-45deg,transparent 0,transparent 1em,#ffc9c7 0,#ffc9c7 2em ,#dcedff 0,transparent 0,transparent 3em,#dcedff 0,#dcedff 4em) 20",
            }}
            className="my-[20px] shadow-md bg-white mx-auto p-[20px] max-w-4xl"
          >
            {header && (
              <Heading className="text-black text-[20px] font-normal text-left">
                {header}
              </Heading>
            )}
            {children}
            <Hr />
            <Section className="text-gray-500 bg-no-repeat bg-right bg-contain bg-[url(https://guanweisong.com/static/images/logo.192.png)]">
              {footer}
              <Text>
                欢迎再次光临{" "}
                <Link href={`https://${process.env.FRONT_DOMAIN}`}>
                  {setting.siteName?.zh}
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailContainer;
