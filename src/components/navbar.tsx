import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function NavBar() {
  const { isSignedIn } = useUser();

  return (
    <nav className="flex items-center justify-between p-4 bg-white dark:bg-black border-b">
      <Link href="/" className="text-xl font-bold">
        ChatWise.AI
      </Link>
      
      <div className="flex items-center gap-4">
        {isSignedIn ? (
          <>
            <Link 
              href="/dashboard"
              className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Dashboard
            </Link>
            <Link 
              href="/settings"
              className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Settings
            </Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <>
            <SignInButton mode="modal">
              <button className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                Get Started
              </button>
            </SignUpButton>
          </>
        )}
      </div>
    </nav>
  );
}