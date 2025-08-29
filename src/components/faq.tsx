import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export default function Faq() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="flex flex-col items-center justify-center gap-2 max-w-md">
        <h2 className="sm:text-3xl text-2xl font-semibold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="sm:text-base text-sm text-muted-foreground text-center">
          Quick answers about sending and receiving payments with Guto Paylink.
        </p>
      </div>

      <div className="w-full max-w-lg">
        <Accordion type="single" collapsible className="w-full flex flex-col gap-4">

					  <AccordionItem value="item-create-paylink">
  <AccordionTrigger className="hover:no-underline">
    How do I create a Paylink?
  </AccordionTrigger>
  <AccordionContent className="text-muted-foreground">
    It only takes a few minutes! Visit{" "}
    <a
      href="https://guto.app"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline"
    >
      guto.app
    </a>{" "}
    to download the app and sign up. Once your profile is created, you’ll get a
    unique Paylink handle (like <span className="font-medium">@yourname</span>)
    that you can share instantly to start receiving payments.
  </AccordionContent>
</AccordionItem>

          <AccordionItem value="item-what-is-paylink">
            <AccordionTrigger className="hover:no-underline">
              What is a Guto Paylink?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              A Guto Paylink is a simple page where anyone can securely send you
              money. Share your handle (for example <span className="font-medium">@yourname</span>)
              and a payer can complete payment in a few steps.
            </AccordionContent>
          </AccordionItem>


          <AccordionItem value="item-availability">
            <AccordionTrigger className="hover:no-underline">
              Where is Guto available?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Guto Paylink is currently available in Uganda. We’ll share updates as we expand to
              additional regions.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-fees">
  <AccordionTrigger className="hover:no-underline">
    Are there fees to send or receive payments?
  </AccordionTrigger>
  <AccordionContent className="text-muted-foreground">
    Guto does not charge any fees for sending payments. However,
    your mobile money network may apply their ordinary charges
    according to their own fee structure. Any applicable network fees will be
    shown to you before you confirm a transaction.
  </AccordionContent>
</AccordionItem>


          <AccordionItem value="item-speed">
            <AccordionTrigger className="hover:no-underline">
              How fast do payments arrive?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Most payments complete within seconds. In some cases, network delays or verification
              checks can add a bit more time. You’ll get a confirmation once it’s sent.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-security">
            <AccordionTrigger className="hover:no-underline">
              Is it secure?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Yes. Connections are protected with TLS, sensitive details are never exposed to the
              recipient, and we don’t store your mobile money PIN. You’ll also see a verified badge
              when a profile has been confirmed.
            </AccordionContent>
          </AccordionItem>



        </Accordion>
      </div>
    </div>
  );
}
