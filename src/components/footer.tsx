import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex flex-col justify-center items-center gap-4 pb-4">
      <div className="flex flex-row justify-between">
        <ul className="flex flex-row gap-4">
          <li className="dark:text-muted-foreground dark:hover:text-foreground cursor-pointer">
            <Link href="https://guto.app">
              More Info
            </Link>
          </li>
          <li className="dark:text-muted-foreground dark:hover:text-foreground">
            •
          </li>
          <li className="dark:text-muted-foreground dark:hover:text-foreground">
            <Link href="https://onelink.to/m7knrf">
              Create a Paylink
            </Link>
          </li>
          <li className="dark:text-muted-foreground dark:hover:text-foreground">
            •
          </li>
          <li className="dark:text-muted-foreground dark:hover:text-foreground cursor-pointer">
            <Link href="mailto:support@guto.app">Contact support</Link>
          </li>
        </ul>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Created by{" "}
          <Link href="https://guto.app" className="font-semibold text-foreground">Guto</Link>
        </p>
      </div>
    </footer>
  );
}
